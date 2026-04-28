// ═══════════════════════════════════════════════
// Usage gating + overage credits — server-side mirror of
// src/lib/pricingTiers.ts limits, plus the atomic check-and-spend
// flow used by every metered edge function.
//
// Flow per metered request:
//   1. Read tier from profiles (default 'free').
//   2. Read current month usage counter for the action.
//   3. If usage < tier limit  → increment counter, allow.
//      If tier is unlimited   → increment counter, allow.
//      If usage ≥ tier limit  → try to spend credits.
//      If credits available   → deduct, allow (overage).
//      Otherwise              → return 402 with details.
//
// The client surfaces the 402 result by opening the buy-credits
// modal; that's the *only* place credits are mentioned in the UI,
// keeping the onboarding pure subscription.
//
// Limit table is duplicated here from src/lib/pricingTiers.ts so we
// never trust the client. Keep the two in sync — the test in
// src/lib/__tests__/pricingTiers.test.ts is the source of truth.
// ═══════════════════════════════════════════════

import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type Tier = "free" | "pro" | "business";

// Metered actions. Keep this as a string-literal union so a typo in
// an edge function fails the build.
export type MeteredAction =
  | "ai_coach_message"
  | "knowledge_query_deep"
  | "plan_generation";

interface ActionConfig {
  // -1 = unlimited; 0 = blocked entirely on this tier.
  limitsByTier: Record<Tier, number>;
  // How many credits one action consumes when in overage. Aligns
  // with the relative cost of each call (Coach=1, deep query=5,
  // plan=20) so a $10 / 100-credit pack maps cleanly to ₪0.10/coach,
  // ₪0.50/deep query, ₪2/plan generation.
  creditCost: number;
  // Stable name used in error responses + ledger rows. The client
  // localizes from this.
  displayKey: string;
}

const ACTIONS: Record<MeteredAction, ActionConfig> = {
  ai_coach_message: {
    limitsByTier: { free: 0, pro: 75, business: -1 },
    creditCost: 1,
    displayKey: "ai_coach_message",
  },
  knowledge_query_deep: {
    limitsByTier: { free: 0, pro: 50, business: -1 },
    creditCost: 5,
    displayKey: "knowledge_query_deep",
  },
  plan_generation: {
    limitsByTier: { free: 1, pro: 5, business: -1 },
    creditCost: 20,
    displayKey: "plan_generation",
  },
};

export interface UsageDecision {
  allowed: boolean;
  // 'quota' = consumed an included monthly request.
  // 'credit' = consumed a credit (user is over-quota but had balance).
  // 'denied' = nothing consumed; caller must reject the request.
  source: "quota" | "credit" | "denied";
  tier: Tier;
  // Always returned so the client can show "X / Y used" alongside
  // the response without a second round-trip.
  used: number;
  limit: number; // -1 = unlimited
  creditsRemaining: number;
  // Populated when source === 'denied'. Tells the modal what to buy.
  denial?: {
    reason: "quota_exhausted_no_credits" | "tier_disallows_action";
    creditCost: number;
    actionDisplayKey: string;
  };
}

async function getTier(supabase: SupabaseClient, userId: string): Promise<Tier> {
  const { data } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", userId)
    .maybeSingle();
  const t = (data as { tier?: string } | null)?.tier;
  return t === "pro" || t === "business" ? t : "free";
}

async function getCurrentUsage(
  supabase: SupabaseClient,
  userId: string,
  action: MeteredAction,
): Promise<number> {
  // period_month = first of the current UTC month.
  const now = new Date();
  const period = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const { data } = await supabase
    .from("usage_counters")
    .select("count")
    .eq("user_id", userId)
    .eq("period_month", period)
    .eq("action", action)
    .maybeSingle();
  return (data as { count?: number } | null)?.count ?? 0;
}

async function getCreditBalance(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { balance?: number } | null)?.balance ?? 0;
}

// Atomic check-and-consume. Call this before performing any work
// that costs us money on a metered action. The returned decision
// says whether to proceed and which bucket was charged.
//
// Concurrency note: the `increment_usage` and `spend_credits` SQL
// functions are atomic, but the read-then-write pattern between them
// is not. The worst-case race lets two concurrent requests both pass
// the quota check at usage=limit-1, charging usage=limit+1. We
// accept that — the over-charge is bounded by the parallelism of a
// single user's requests and gets reconciled at the next read.
export async function checkAndConsumeUsage(
  supabase: SupabaseClient,
  userId: string,
  action: MeteredAction,
): Promise<UsageDecision> {
  const config = ACTIONS[action];
  const tier = await getTier(supabase, userId);
  const limit = config.limitsByTier[tier];
  const used = await getCurrentUsage(supabase, userId, action);

  // Tier disallows this action entirely (limit === 0). Don't burn a
  // credit on it either — that's a deliberate paywall, not overage.
  if (limit === 0) {
    return {
      allowed: false,
      source: "denied",
      tier,
      used,
      limit,
      creditsRemaining: await getCreditBalance(supabase, userId),
      denial: {
        reason: "tier_disallows_action",
        creditCost: config.creditCost,
        actionDisplayKey: config.displayKey,
      },
    };
  }

  // Inside the included quota — increment and let the caller proceed.
  if (limit === -1 || used < limit) {
    const { data: newCount, error } = await supabase.rpc("increment_usage", {
      p_user_id: userId,
      p_action: action,
      p_amount: 1,
    });
    if (error) {
      // Don't fail the user request because we couldn't write a counter.
      // Treat this as a quota allow; we lose a single increment but the
      // request was paid for under the subscription anyway.
      return {
        allowed: true,
        source: "quota",
        tier,
        used: used + 1,
        limit,
        creditsRemaining: await getCreditBalance(supabase, userId),
      };
    }
    return {
      allowed: true,
      source: "quota",
      tier,
      used: (newCount as number | null) ?? used + 1,
      limit,
      creditsRemaining: await getCreditBalance(supabase, userId),
    };
  }

  // Over the included quota — try credits.
  const { data: newBalance } = await supabase.rpc("spend_credits", {
    p_user_id: userId,
    p_amount: config.creditCost,
    p_action: action,
  });

  if (newBalance === null || newBalance === undefined) {
    return {
      allowed: false,
      source: "denied",
      tier,
      used,
      limit,
      creditsRemaining: await getCreditBalance(supabase, userId),
      denial: {
        reason: "quota_exhausted_no_credits",
        creditCost: config.creditCost,
        actionDisplayKey: config.displayKey,
      },
    };
  }

  // Spent credits successfully. Counter increments too so the UI
  // can keep displaying total usage even when overage kicks in.
  await supabase.rpc("increment_usage", {
    p_user_id: userId,
    p_action: action,
    p_amount: 1,
  });

  return {
    allowed: true,
    source: "credit",
    tier,
    used: used + 1,
    limit,
    creditsRemaining: newBalance as number,
  };
}

// Standardized 402 Payment Required response. Edge functions should
// return this directly when checkAndConsumeUsage denies — the client
// listens for status=402 to open the buy-credits modal.
export function paymentRequiredResponse(
  decision: UsageDecision,
  cors: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: "payment_required",
      tier: decision.tier,
      used: decision.used,
      limit: decision.limit,
      creditsRemaining: decision.creditsRemaining,
      denial: decision.denial,
    }),
    {
      status: 402,
      headers: { ...cors, "Content-Type": "application/json" },
    },
  );
}

// Read-only stats for the client (`get-usage` edge function). Avoids
// duplicating the limits map on the client.
export async function readUsageSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  tier: Tier;
  creditsRemaining: number;
  perAction: Array<{
    action: MeteredAction;
    used: number;
    limit: number;
    creditCost: number;
  }>;
}> {
  const tier = await getTier(supabase, userId);
  const creditsRemaining = await getCreditBalance(supabase, userId);
  const perAction = await Promise.all(
    (Object.keys(ACTIONS) as MeteredAction[]).map(async (action) => ({
      action,
      used: await getCurrentUsage(supabase, userId, action),
      limit: ACTIONS[action].limitsByTier[tier],
      creditCost: ACTIONS[action].creditCost,
    })),
  );
  return { tier, creditsRemaining, perAction };
}
