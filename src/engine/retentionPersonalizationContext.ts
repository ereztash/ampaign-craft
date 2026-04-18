// ═══════════════════════════════════════════════
// Retention Personalization Context — Data Cascade Bridge
//
// Architecture: "late friction ← early friction"
// Instead of asking retention-time questions, we read upstream signals
// from the Pricing Wizard and Differentiation Agent to calibrate every
// retention touchpoint with high-fidelity data.
//
// Data cascade layers:
//   Layer 1: FormData          → basic business routing (was all we had before)
//   Layer 2: PricingWizardInput → Hormozi axes map to retention risk vectors
//   Layer 3: DifferentiationResult → win-back framing, promise delivery proof
//   Layer 4: DISCProfile       → communication tone/style in every message
//
// Hormozi → Retention mapping:
//   D (Dream Outcome)      → AHA moment definition (what they came for)
//   T (Time to Value)      → onboarding urgency & day-1 expectation setting
//   E (Effort/Sacrifice)   → churn risk in months 2–3 (high effort = dropout)
//   P (Perceived Likelihood/Social Proof) → win-back credibility ceiling
//
// Source: Hormozi ($100M Offers), Lincoln Murphy (Customer Success), NPS decay curves
// ═══════════════════════════════════════════════

import { FormData } from "@/types/funnel";
import { DifferentiationResult } from "@/types/differentiation";
import { DISCProfile } from "./discProfileEngine";
import { safeStorage } from "@/lib/safeStorage";
import {
  PricingWizardInput,
  DreamOutcomeLevel,
  TimeToValue,
  EffortLevel,
  SocialProofLevel,
  computePricingWizardRecommendation,
} from "./pricingWizardEngine";

// ── localStorage key for the full wizard input ─────────────────────────────
export const PRICING_WIZARD_STORAGE_KEY = "funnelforge-pricing-wizard-input";
export const DIFF_RESULT_STORAGE_KEY    = "funnelforge-differentiation-result";

// ── Output type ────────────────────────────────────────────────────────────

export interface RetentionPersonalizationContext {
  /** Human-readable product name (best guess from available data). */
  productName: string;

  /**
   * The concrete first action the user must complete to reach their dream outcome.
   * Derived from dreamOutcome level — used to fill `{ahaAction}` in onboarding templates.
   */
  ahaAction: { he: string; en: string };

  /**
   * Expected days until the user first experiences value.
   * Drives onboarding sequence density (more steps when T is slow).
   */
  onboardingDays: number;

  /**
   * True when Hormozi score < 4 — the offer needs fixing before retention can work.
   * A score this low means the product promise doesn't match perceived value.
   * Used to add an "offer repair" flag to the churn playbook.
   */
  offerFixNeeded: boolean;

  /**
   * Hormozi score (0–10, normalised). Exposed so engine can gate premium
   * retention tactics (high-score → invest in referral; low-score → fix first).
   */
  hormoziScore: number;

  /**
   * Scaled referral reward derived from charm price.
   * amount = round(charmPrice × 0.15), capped at ltv × 0.10
   * pct    = percentage of price represented
   */
  referralReward: { amount: number; pct: number };

  /**
   * Churn risk factor [0–1] derived from effort level.
   * zero=0.05, low=0.15, medium=0.35, high=0.60
   * Multiplied into the base churn estimate in the impact calculator.
   */
  churnRiskFactor: number;

  /**
   * Win-back frame derived from top differentiator (if DifferentiationResult available).
   * Falls back to product description if no differentiation data.
   */
  winBackFrame: { he: string; en: string };

  /**
   * Core differentiator promise — what the user signed up for.
   * Used to fill `{benefit}` in referral templates.
   */
  coreBenefit: { he: string; en: string };

  /**
   * Communication tone derived from DISC profile.
   * "direct" (D), "enthusiastic" (I), "empathic" (S), "analytical" (C)
   */
  communicationStyle: "direct" | "enthusiastic" | "empathic" | "analytical";

  /**
   * True when the social proof level is strong/exceptional.
   * Enables the social-proof-heavy onboarding steps.
   */
  hasSocialProof: boolean;

  /**
   * The tier the user is likely targeting (monthly pricing context).
   */
  charmPrice: number;
}

// ── AHA action derivation ──────────────────────────────────────────────────

const AHA_ACTIONS: Record<DreamOutcomeLevel, { he: string; en: string }> = {
  transformative: {
    he: "השלם את הצעד הראשון לשינוי — קבל את התוצאה הראשונה שלך",
    en: "Complete the first transformation step — get your first result",
  },
  significant: {
    he: "השג את התוצאה הראשונה המשמעותית שלך",
    en: "Achieve your first significant outcome",
  },
  moderate: {
    he: "השלם את הפעולה המרכזית הראשונה",
    en: "Complete the first core action",
  },
  incremental: {
    he: "עשה את ה-quick win הראשון שלך",
    en: "Get your first quick win",
  },
};

// ── Time-to-value → onboarding days ───────────────────────────────────────

const ONBOARDING_DAYS: Record<TimeToValue, number> = {
  immediate: 1,
  fast:      3,
  moderate:  7,
  slow:      14,
};

// ── Effort level → churn risk factor ──────────────────────────────────────

const CHURN_RISK_FACTOR: Record<EffortLevel, number> = {
  zero:   0.05,
  low:    0.15,
  medium: 0.35,
  high:   0.60,
};

// ── Social proof → hasSocialProof flag ────────────────────────────────────

const STRONG_SOCIAL_PROOF: Record<SocialProofLevel, boolean> = {
  exceptional: true,
  strong:      true,
  some:        false,
  none:        false,
};

// ── DISC → communication style ────────────────────────────────────────────

const DISC_COMM_STYLE: Record<"D" | "I" | "S" | "C", RetentionPersonalizationContext["communicationStyle"]> = {
  D: "direct",
  I: "enthusiastic",
  S: "empathic",
  C: "analytical",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function safeParse<T>(key: string): T | null {
  return safeStorage.getJSON<T | null>(key, null);
}

function deriveProductName(formData: FormData): string {
  if (formData.productDescription && formData.productDescription.length > 2) {
    // Use first sentence / first 40 chars
    const first = formData.productDescription.split(/[.!\n]/)[0].trim();
    return first.length > 40 ? first.slice(0, 40) + "…" : first;
  }
  return "המוצר שלך";
}

function deriveCoreBenefit(
  formData: FormData,
  diffResult: DifferentiationResult | null,
  pricingInput: PricingWizardInput | null,
): { he: string; en: string } {
  // Priority: differentiation mechanism statement > pricing dream outcome > generic
  if (diffResult?.mechanismStatement?.oneLiner?.he) {
    return diffResult.mechanismStatement.oneLiner;
  }
  if (pricingInput?.dreamOutcome) {
    return AHA_ACTIONS[pricingInput.dreamOutcome];
  }
  const desc = formData.productDescription || "";
  return {
    he: desc.slice(0, 60) || "הפתרון שלך",
    en: desc.slice(0, 60) || "your solution",
  };
}

function deriveWinBackFrame(
  diffResult: DifferentiationResult | null,
  coreBenefit: { he: string; en: string },
): { he: string; en: string } {
  if (diffResult?.tradeoffDeclarations?.length) {
    const top = diffResult.tradeoffDeclarations[0];
    return {
      he: `חזרת אלינו כי אנחנו ${top.reframe} — ולא כמו ${top.weakness}`,
      en: `You came back because we ${top.reframe} — not like ${top.weakness}`,
    };
  }
  if (diffResult?.mechanismStatement?.antiStatement) {
    const anti = diffResult.mechanismStatement.antiStatement;
    return {
      he: `אנחנו ${anti} — זה מה שמשנה`,
      en: `We ${anti} — that's what's different`,
    };
  }
  return {
    he: `אנחנו עדיין כאן עם: ${coreBenefit.he}`,
    en: `We're still here with: ${coreBenefit.en}`,
  };
}

// ── Main function ──────────────────────────────────────────────────────────

/**
 * Build a `RetentionPersonalizationContext` by cascading data from the three
 * upstream modules: Marketing Plan (FormData), Pricing Wizard, and
 * Differentiation Agent.
 *
 * All upstream data is optional — the function degrades gracefully so that
 * the retention engine always receives a complete context object.
 */
export function buildRetentionContext(
  formData: FormData,
  discProfile: DISCProfile | null,
  pricingInput?: PricingWizardInput | null,
  diffResult?: DifferentiationResult | null,
): RetentionPersonalizationContext {
  // ── Layer 2: Pricing Wizard data ─────────────────────────────────────────
  const pricing = pricingInput ?? safeParse<PricingWizardInput>(PRICING_WIZARD_STORAGE_KEY);
  const diff    = diffResult    ?? safeParse<DifferentiationResult>(DIFF_RESULT_STORAGE_KEY);

  // ── Hormozi-derived values ────────────────────────────────────────────────
  let hormoziScore    = 5;   // neutral default
  let charmPrice      = formData.averagePrice || 100;
  let ltv             = charmPrice * (formData.salesModel === "subscription" ? 12 : 1.5);
  let offerFixNeeded  = false;

  if (pricing) {
    const rec       = computePricingWizardRecommendation(pricing);
    hormoziScore    = rec.hormoziScore;
    charmPrice      = rec.charmPrice;
    ltv             = rec.ltv;
    offerFixNeeded  = rec.hormoziScore < 4;
  }

  // ── Referral reward: 15% of charm price, capped at 10% of LTV ───────────
  const rawReward     = Math.round(charmPrice * 0.15);
  const ltvCap        = Math.round(ltv * 0.10);
  const rewardAmount  = Math.max(20, Math.min(rawReward, ltvCap)); // floor ₪20
  const rewardPct     = Math.round((rewardAmount / charmPrice) * 100);

  // ── Churn risk from effort level ─────────────────────────────────────────
  const effortLevel   = pricing?.effortLevel ?? "medium";
  const churnRiskFactor = CHURN_RISK_FACTOR[effortLevel];

  // ── Onboarding days from time-to-value ───────────────────────────────────
  const ttv         = pricing?.timeToValue ?? "moderate";
  const onboardingDays = ONBOARDING_DAYS[ttv];

  // ── AHA action ───────────────────────────────────────────────────────────
  const ahaAction = pricing
    ? AHA_ACTIONS[pricing.dreamOutcome]
    : { he: "השלם את הפעולה המרכזית הראשונה", en: "Complete the first core action" };

  // ── Social proof ─────────────────────────────────────────────────────────
  const hasSocialProof = pricing
    ? STRONG_SOCIAL_PROOF[pricing.socialProof]
    : false;

  // ── Derived benefit + win-back ────────────────────────────────────────────
  const coreBenefit  = deriveCoreBenefit(formData, diff, pricing);
  const winBackFrame = deriveWinBackFrame(diff, coreBenefit);

  // ── DISC communication style ──────────────────────────────────────────────
  const communicationStyle: RetentionPersonalizationContext["communicationStyle"] =
    discProfile ? DISC_COMM_STYLE[discProfile.primary] : "empathic";

  return {
    productName: deriveProductName(formData),
    ahaAction,
    onboardingDays,
    offerFixNeeded,
    hormoziScore,
    referralReward: { amount: rewardAmount, pct: rewardPct },
    churnRiskFactor,
    winBackFrame,
    coreBenefit,
    communicationStyle,
    hasSocialProof,
    charmPrice,
  };
}
