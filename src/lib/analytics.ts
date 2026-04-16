// ═══════════════════════════════════════════════
// Analytics — Unified AARRR Event Tracking
//
// Single entry point for all growth analytics.
// Fans out to: GA4 (if loaded), internal event_queue, console (dev).
//
// Usage:
//   import { track } from "@/lib/analytics";
//   track("aarrr.activation.first_plan_generated", { planId, industry });
// ═══════════════════════════════════════════════

import { publishEvent, type EventType } from "@/services/eventQueue";

// ─── Types ──────────────────────────────────────

export type AARRRStage = "acquisition" | "activation" | "retention" | "revenue" | "referral";

/** All AARRR event names */
export type AARRREventName =
  // Acquisition
  | "aarrr.acquisition.landing_view"
  | "aarrr.acquisition.signup_started"
  | "aarrr.acquisition.signup_completed"
  | "aarrr.acquisition.onboarding_started"
  | "aarrr.acquisition.utm_captured"
  // Activation
  | "aarrr.activation.onboarding_completed"
  | "aarrr.activation.first_plan_generated"
  | "aarrr.activation.first_template_copied"
  | "aarrr.activation.first_share_created"
  | "aarrr.activation.archetype_revealed"
  | "aarrr.activation.aha_moment"
  | "aarrr.activation.onboarding_abandoned"
  // Retention
  | "aarrr.retention.weekly_active"
  | "aarrr.retention.monthly_active"
  | "aarrr.retention.streak_broken"
  | "aarrr.retention.reactivated"
  | "aarrr.retention.pulse_opened"
  | "aarrr.retention.blind_spot_nudge_clicked"
  // Revenue
  | "aarrr.revenue.paywall_viewed"
  | "aarrr.revenue.checkout_started"
  | "aarrr.revenue.conversion_completed"
  | "aarrr.revenue.upgrade"
  | "aarrr.revenue.downgrade"
  | "aarrr.revenue.churned"
  // Referral
  | "aarrr.referral.share_created"
  | "aarrr.referral.share_viewed"
  | "aarrr.referral.signup_from_share"
  | "aarrr.referral.reward_earned"
  | "aarrr.referral.referral_clicked";

export type AnalyticsEventName = AARRREventName | EventType;

export interface TrackOptions {
  userId?: string;
  /** Set to true to skip queueing to event_queue (use for high-frequency UI events) */
  uiOnly?: boolean;
}

// ─── GA4 helpers ────────────────────────────────

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function sendToGA4(eventName: string, props: Record<string, unknown>) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      // Convert AARRR dot-notation to GA4 snake_case (max 40 chars)
      const ga4Name = eventName.replace(/\./g, "_").slice(0, 40);
      window.gtag("event", ga4Name, props);
    }
  } catch {
    // GA4 unavailable — continue silently
  }
}

// ─── Stage extraction ────────────────────────────

export function getStageFromEvent(name: AARRREventName): AARRRStage {
  if (name.startsWith("aarrr.acquisition")) return "acquisition";
  if (name.startsWith("aarrr.activation")) return "activation";
  if (name.startsWith("aarrr.retention")) return "retention";
  if (name.startsWith("aarrr.revenue")) return "revenue";
  return "referral";
}

// ─── Main track function ─────────────────────────

/**
 * Track an AARRR or system event.
 * - Sends to GA4 (if loaded).
 * - Publishes to internal event_queue (for dashboard + training_pairs).
 * - Logs to console in development.
 *
 * Returns a promise that resolves when the queue publish completes.
 * Fire-and-forget is safe: errors are swallowed.
 */
export async function track(
  eventName: AARRREventName,
  props: Record<string, unknown> = {},
  options: TrackOptions = {}
): Promise<void> {
  const enriched = {
    ...props,
    _ts: Date.now(),
    _url: typeof window !== "undefined" ? window.location.pathname : undefined,
    _referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
  };

  // 1. GA4
  sendToGA4(eventName, enriched);

  // 2. Dev console
  if (import.meta.env.DEV) {
    const stage = getStageFromEvent(eventName as AARRREventName);
    const STAGE_COLORS: Record<AARRRStage, string> = {
      acquisition: "#3b82f6",
      activation: "#10b981",
      retention: "#f59e0b",
      revenue: "#ef4444",
      referral: "#8b5cf6",
    };
    console.log(
      `%c[AARRR:${stage.toUpperCase()}] %c${eventName}`,
      `color: ${STAGE_COLORS[stage]}; font-weight: bold`,
      "color: inherit",
      enriched
    );
  }

  // 3. Internal event_queue
  if (!options.uiOnly && options.userId) {
    try {
      await publishEvent(
        "notification.send", // piggyback on existing event type
        { aarrrEvent: eventName, ...enriched },
        options.userId,
        { priority: 8 } // low priority — don't starve plan generation
      );
    } catch {
      // Non-critical — continue silently
    }
  }
}

// ─── Convenience shortcuts ───────────────────────

export const Analytics = {
  // Acquisition
  landingView: (props?: Record<string, unknown>, userId?: string) =>
    track("aarrr.acquisition.landing_view", props, { userId }),
  signupCompleted: (userId: string, props?: Record<string, unknown>) =>
    track("aarrr.acquisition.signup_completed", props, { userId }),
  utmCaptured: (utm: Record<string, string>, userId?: string) =>
    track("aarrr.acquisition.utm_captured", utm, { userId }),

  // Activation
  onboardingStarted: (userId?: string) =>
    track("aarrr.activation.onboarding_completed", {}, { userId }),
  firstPlanGenerated: (planId: string, userId: string, industry?: string) =>
    track("aarrr.activation.first_plan_generated", { planId, industry }, { userId }),
  firstTemplateCopied: (userId: string, channel?: string) =>
    track("aarrr.activation.first_template_copied", { channel }, { userId }),
  archetypeRevealed: (userId: string, archetype: string) =>
    track("aarrr.activation.archetype_revealed", { archetype }, { userId }),
  ahaMoment: (userId: string, trigger: string) =>
    track("aarrr.activation.aha_moment", { trigger }, { userId }),
  onboardingAbandoned: (step: number, userId?: string) =>
    track("aarrr.activation.onboarding_abandoned", { step }, { userId }),

  // Retention
  weeklyActive: (userId: string) =>
    track("aarrr.retention.weekly_active", {}, { userId }),
  streakBroken: (streak: number, userId: string) =>
    track("aarrr.retention.streak_broken", { streak }, { userId }),
  reactivated: (daysSilent: number, userId: string) =>
    track("aarrr.retention.reactivated", { daysSilent }, { userId }),
  pulseOpened: (userId: string) =>
    track("aarrr.retention.pulse_opened", {}, { userId }),

  // Revenue
  paywallViewed: (feature: string, tier: string, userId: string) =>
    track("aarrr.revenue.paywall_viewed", { feature, tier }, { userId }),
  checkoutStarted: (targetTier: string, userId: string) =>
    track("aarrr.revenue.checkout_started", { targetTier }, { userId }),
  conversionCompleted: (tier: string, billing: string, userId: string) =>
    track("aarrr.revenue.conversion_completed", { tier, billing }, { userId }),
  upgrade: (fromTier: string, toTier: string, userId: string) =>
    track("aarrr.revenue.upgrade", { fromTier, toTier }, { userId }),
  churned: (tier: string, userId: string, reason?: string) =>
    track("aarrr.revenue.churned", { tier, reason }, { userId }),

  // Referral
  shareCreated: (shareId: string, userId: string) =>
    track("aarrr.referral.share_created", { shareId }, { userId }),
  shareViewed: (shareId: string, referrerCode?: string) =>
    track("aarrr.referral.share_viewed", { shareId, referrerCode }, { uiOnly: true }),
  signupFromShare: (referrerCode: string, userId: string) =>
    track("aarrr.referral.signup_from_share", { referrerCode }, { userId }),
  rewardEarned: (type: string, userId: string) =>
    track("aarrr.referral.reward_earned", { type }, { userId }),

  // F3 Event audit additions — new Sprint A-F surfaces
  archetypeShared: (archetypeId: string, userId: string) =>
    track("aarrr.referral.archetype_shared", { archetypeId }, { userId }),
  challengeCompleted: (weekNumber: number, userId: string) =>
    track("aarrr.retention.challenge_completed", { weekNumber }, { userId }),
  leaderboardViewed: (userId: string) =>
    track("aarrr.referral.leaderboard_viewed", {}, { userId }),
  npsSubmitted: (score: number, userId?: string) =>
    track("aarrr.retention.nps_submitted", { score }, { userId }),
  competitorScanRequested: (businessName: string) =>
    track("aarrr.acquisition.competitor_scan_requested", { businessName }),
  seoLandingViewed: (industry: string) =>
    track("aarrr.acquisition.seo_landing_viewed", { industry }),
  streakRewardEarned: (type: string, milestone: number, userId?: string) =>
    track("aarrr.retention.streak_reward_earned", { type, milestone }, { userId }),
};

// ─── UTM Capture on page load ────────────────────

/**
 * Call once on app mount to capture UTM params.
 * Persists to sessionStorage so they survive redirects.
 */
export function captureUTM(userId?: string): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"];
  const captured: Record<string, string> = {};

  for (const key of utmKeys) {
    const val = params.get(key);
    if (val) captured[key] = val;
  }

  if (Object.keys(captured).length > 0) {
    sessionStorage.setItem("funnelforge_utm", JSON.stringify(captured));
    track("aarrr.acquisition.utm_captured", captured, { userId, uiOnly: true });
  }
}

/** Retrieve previously captured UTM params. */
export function getUTM(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem("funnelforge_utm");
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}
