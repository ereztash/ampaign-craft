// ═══════════════════════════════════════════════
// Event Queue Service — Client-side API for publishing events
// Events are processed by the queue-processor Edge Function.
// ═══════════════════════════════════════════════

import { supabaseLoose as db } from "@/integrations/supabase/loose";

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type EventType =
  // ── Core system events ──────────────────────────
  | "plan.generated"
  | "plan.qa_requested"
  | "research.requested"
  | "embedding.requested"
  | "benchmark.update"
  | "notification.send"
  // ── AARRR: Acquisition ──────────────────────────
  | "aarrr.acquisition.landing_view"
  | "aarrr.acquisition.signup_started"
  | "aarrr.acquisition.signup_completed"
  | "aarrr.acquisition.onboarding_started"
  | "aarrr.acquisition.utm_captured"
  // ── AARRR: Activation ───────────────────────────
  | "aarrr.activation.onboarding_completed"
  | "aarrr.activation.first_plan_generated"
  | "aarrr.activation.first_template_copied"
  | "aarrr.activation.first_share_created"
  | "aarrr.activation.archetype_revealed"
  | "aarrr.activation.aha_moment"
  | "aarrr.activation.onboarding_abandoned"
  // ── AARRR: Retention ────────────────────────────
  | "aarrr.retention.weekly_active"
  | "aarrr.retention.monthly_active"
  | "aarrr.retention.streak_broken"
  | "aarrr.retention.reactivated"
  | "aarrr.retention.pulse_opened"
  | "aarrr.retention.blind_spot_nudge_clicked"
  // ── AARRR: Revenue ──────────────────────────────
  | "aarrr.revenue.paywall_viewed"
  | "aarrr.revenue.checkout_started"
  | "aarrr.revenue.conversion_completed"
  | "aarrr.revenue.upgrade"
  | "aarrr.revenue.downgrade"
  | "aarrr.revenue.churned"
  // ── AARRR: Referral ─────────────────────────────
  | "aarrr.referral.share_created"
  | "aarrr.referral.share_viewed"
  | "aarrr.referral.signup_from_share"
  | "aarrr.referral.reward_earned"
  | "aarrr.referral.referral_clicked";

export interface PublishOptions {
  priority?: number;        // 1=highest, 10=lowest (default 5)
  maxAttempts?: number;     // default 3
  delaySeconds?: number;    // schedule for later (default 0)
}

export interface QueueEvent {
  id: string;
  eventType: EventType;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  result?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════
// PUBLISH
// ═══════════════════════════════════════════════

/**
 * Publish an event to the queue.
 * Returns the event ID for tracking.
 */
export async function publishEvent(
  eventType: EventType,
  payload: Record<string, unknown>,
  userId: string,
  options: PublishOptions = {}
): Promise<{ eventId: string | null; error?: string }> {
  const { data, error } = await db.rpc("publish_event", {
    p_event_type: eventType,
    p_payload: payload,
    p_user_id: userId,
    p_priority: options.priority ?? 5,
    p_max_attempts: options.maxAttempts ?? 3,
    p_delay_seconds: options.delaySeconds ?? 0,
  });

  if (error) {
    return { eventId: null, error: error.message };
  }

  return { eventId: data as string };
}

// ═══════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════

/**
 * Get recent events for the current user.
 */
export async function getRecentEvents(
  userId: string,
  limit = 20
): Promise<{ events: QueueEvent[]; error?: string }> {
  const { data, error } = await db
    .from("event_queue")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { events: [], error: error.message };
  }

  const events: QueueEvent[] = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    eventType: row.event_type as EventType,
    payload: row.payload as Record<string, unknown>,
    status: row.status as string,
    attempts: row.attempts as number,
    createdAt: row.created_at as string,
    completedAt: row.completed_at as string | undefined,
    error: row.error as string | undefined,
    result: row.result as Record<string, unknown> | undefined,
  }));

  return { events };
}

/**
 * Get event status by ID.
 */
export async function getEventStatus(
  eventId: string
): Promise<{ event: QueueEvent | null; error?: string }> {
  const { data, error } = await db
    .from("event_queue")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error) {
    return { event: null, error: error.message };
  }

  if (!data) return { event: null };

  const row = data as Record<string, unknown>;
  return {
    event: {
      id: row.id as string,
      eventType: row.event_type as EventType,
      payload: row.payload as Record<string, unknown>,
      status: row.status as string,
      attempts: row.attempts as number,
      createdAt: row.created_at as string,
      completedAt: row.completed_at as string | undefined,
      error: row.error as string | undefined,
      result: row.result as Record<string, unknown> | undefined,
    },
  };
}

// ═══════════════════════════════════════════════
// CONVENIENCE PUBLISHERS
// ═══════════════════════════════════════════════

/**
 * Notify the system that a new plan was generated.
 * Triggers embedding, benchmark update, and notifications.
 */
export async function onPlanGenerated(
  planId: string,
  userId: string
): Promise<{ eventId: string | null; error?: string }> {
  return publishEvent("plan.generated", { planId, userId }, userId, { priority: 3 });
}

/**
 * Request QA analysis for a plan.
 */
export async function requestQA(
  planId: string,
  userId: string
): Promise<{ eventId: string | null; error?: string }> {
  return publishEvent("plan.qa_requested", { planId, userId }, userId, { priority: 2 });
}

/**
 * Request research on a specific question.
 */
export async function requestResearch(
  question: string,
  domain: string,
  userId: string
): Promise<{ eventId: string | null; error?: string }> {
  return publishEvent("research.requested", { question, domain, userId }, userId, { priority: 4 });
}

// ═══════════════════════════════════════════════
// AARRR CONVENIENCE PUBLISHERS
// ═══════════════════════════════════════════════

/** Track signup completion for Acquisition funnel. */
export async function trackSignupCompleted(
  userId: string,
  source?: string
): Promise<{ eventId: string | null; error?: string }> {
  return publishEvent("aarrr.acquisition.signup_completed", { source }, userId, { priority: 3 });
}

/** Track first plan generated — the core Activation Aha Moment. */
export async function trackFirstPlanGenerated(
  userId: string,
  planId: string,
  industry?: string
): Promise<{ eventId: string | null; error?: string }> {
  return publishEvent(
    "aarrr.activation.first_plan_generated",
    { planId, industry },
    userId,
    { priority: 2 }
  );
}

/** Track onboarding abandonment for re-engagement flows. */
export async function trackOnboardingAbandoned(
  userId: string,
  lastStep: number
): Promise<{ eventId: string | null; error?: string }> {
  return publishEvent(
    "aarrr.activation.onboarding_abandoned",
    { lastStep, abandonedAt: new Date().toISOString() },
    userId,
    { priority: 4 }
  );
}

/** Track archetype reveal — key deepening moment. */
export async function trackArchetypeRevealed(
  userId: string,
  archetype: string,
  confidence: number
): Promise<{ eventId: string | null; error?: string }> {
  return publishEvent(
    "aarrr.activation.archetype_revealed",
    { archetype, confidence },
    userId,
    { priority: 3 }
  );
}

/** Track paywall view for Revenue funnel. */
export async function trackPaywallViewed(
  userId: string,
  feature: string,
  currentTier: string
): Promise<{ eventId: string | null; error?: string }> {
  return publishEvent(
    "aarrr.revenue.paywall_viewed",
    { feature, currentTier },
    userId,
    { priority: 3 }
  );
}

/** Track share creation for Referral funnel. */
export async function trackShareCreated(
  userId: string,
  shareId: string
): Promise<{ eventId: string | null; error?: string }> {
  return publishEvent(
    "aarrr.referral.share_created",
    { shareId },
    userId,
    { priority: 4 }
  );
}

/** Track when a referred user signs up. */
export async function trackSignupFromShare(
  userId: string,
  referrerCode: string
): Promise<{ eventId: string | null; error?: string }> {
  return publishEvent(
    "aarrr.referral.signup_from_share",
    { referrerCode },
    userId,
    { priority: 2 }
  );
}

/** Track retention reward (share reward claimed). */
export async function trackReferralRewardEarned(
  userId: string,
  rewardType: string
): Promise<{ eventId: string | null; error?: string }> {
  return publishEvent(
    "aarrr.referral.reward_earned",
    { rewardType, claimedAt: new Date().toISOString() },
    userId,
    { priority: 3 }
  );
}
