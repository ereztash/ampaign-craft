// ═══════════════════════════════════════════════
// Pricing Tiers — Source of Truth
//
// Design principles:
//  • Annual billing (~20% discount) improves cashflow + reduces churn
//  • Numeric limits (not boolean) allow soft upsell and overage pricing
//  • -1 encodes "unlimited" throughout limits
//  • Seats unlock team/agency upsell on Business tier
//  • canAccess() is the single gate; getLimitValue() exposes raw quota
// ═══════════════════════════════════════════════

export type PricingTier = "free" | "pro" | "business";
export type BillingCycle = "monthly" | "annual";

export interface TierLimits {
  /** Maximum marketing funnels. -1 = unlimited. */
  maxFunnels: number;

  /** AI coach messages included per billing month. -1 = unlimited. 0 = none. */
  aiCoachMessages: number;

  /**
   * Price in NIS charged per AI coach message above the monthly allowance.
   * 0 = no overage allowed (hard cap) or irrelevant (unlimited tier).
   */
  aiCoachOveragePriceNIS: number;

  pdfExport: boolean;

  /** WhatsApp templates available per month. -1 = unlimited. 0 = none. */
  whatsappTemplates: number;

  campaignCockpit: boolean;
  templatePublishing: boolean;
  differentiationAgent: boolean;

  /** Included team seats. -1 = unlimited. */
  seats: number;

  /** Branded / white-label report export. */
  brandedReports: boolean;

  /** Priority customer support queue. */
  prioritySupport: boolean;
}

export interface TierConfig {
  id: PricingTier;
  name: { he: string; en: string };

  /**
   * Display-ready price string for the monthly billing cycle.
   * Used by PaywallModal and other display-only contexts.
   */
  price: { he: string; en: string };

  /** Monthly price in NIS on a month-to-month subscription. 0 = free. */
  priceMonthly: number;

  /** Effective monthly price in NIS when billed annually (pre-paid). */
  priceAnnualMonthly: number;

  /** Total amount charged once per year on an annual subscription. */
  priceAnnualTotal: number;

  /**
   * Percentage saved vs. equivalent monthly billing.
   * annualSavingsPct = round((1 − priceAnnualMonthly / priceMonthly) × 100)
   * Pro & Business = 35% off annual. 0 for the free tier.
   */
  annualSavingsPct: number;

  /** Free-trial length in days. 0 = no trial. */
  trialDays: number;

  features: { he: string; en: string }[];
  limits: TierLimits;
}

// ─── Tier definitions ──────────────────────────────────────────────────────

export const TIERS: TierConfig[] = [
  {
    id: "free",
    name: { he: "חינם", en: "Free" },
    price: { he: "₪0", en: "₪0" },
    priceMonthly: 0,
    priceAnnualMonthly: 0,
    priceAnnualTotal: 0,
    annualSavingsPct: 0,
    trialDays: 0,
    features: [
      { he: "3 משפכים שיווקיים", en: "3 marketing funnels" },
      { he: "אסטרטגיה + תכנון + תוכן", en: "Strategy + Planning + Content" },
      { he: "ציון בריאות שיווקית", en: "Marketing Health Score" },
      { he: "הישגים ו-Streak", en: "Achievements & Streak" },
    ],
    limits: {
      maxFunnels: 3,
      aiCoachMessages: 0,
      aiCoachOveragePriceNIS: 0,
      pdfExport: false,
      whatsappTemplates: 0,
      campaignCockpit: false,
      templatePublishing: false,
      differentiationAgent: true,
      seats: 1,
      brandedReports: false,
      prioritySupport: false,
    },
  },
  {
    id: "pro",
    name: { he: "Pro", en: "Pro" },
    price: { he: "₪129/חודש", en: "₪129/month" },
    priceMonthly: 129,
    priceAnnualMonthly: 84,        // ₪1,008/yr — save ₪540 vs monthly (35% off)
    priceAnnualTotal: 1008,
    annualSavingsPct: 35,
    trialDays: 14,
    features: [
      { he: "משפכים ללא הגבלה", en: "Unlimited funnels" },
      { he: "מאמן שיווק AI (75 הודעות/חודש)", en: "AI Marketing Coach (75 msgs/month)" },
      { he: "WhatsApp — 10 תבניות/חודש", en: "WhatsApp — 10 templates/month" },
      { he: "ייצוא PDF", en: "PDF export" },
      { he: "Marketing Wrapped", en: "Marketing Wrapped" },
      { he: "כל הטאבים ללא הגבלה", en: "All tabs unlimited" },
      { he: "סוכן בידול B2B", en: "B2B Differentiation Agent" },
    ],
    limits: {
      maxFunnels: -1,
      aiCoachMessages: 75,
      aiCoachOveragePriceNIS: 2.5,   // ₪2.50 per message beyond 75
      pdfExport: true,
      whatsappTemplates: 10,         // 10 templates/month
      campaignCockpit: false,
      templatePublishing: false,
      differentiationAgent: true,
      seats: 1,
      brandedReports: false,
      prioritySupport: false,
    },
  },
  {
    id: "business",
    name: { he: "Business", en: "Business" },
    price: { he: "₪299/חודש", en: "₪299/month" },
    priceMonthly: 299,
    priceAnnualMonthly: 194,       // ₪2,328/yr — save ₪1,260 vs monthly (35% off)
    priceAnnualTotal: 2328,
    annualSavingsPct: 35,
    trialDays: 14,
    features: [
      { he: "כל מה שב-Pro +", en: "Everything in Pro +" },
      { he: "AI Coach ללא הגבלה", en: "Unlimited AI Coach" },
      { he: "WhatsApp תבניות ללא הגבלה", en: "Unlimited WhatsApp templates" },
      { he: "Campaign Cockpit — מעקב ביצועים", en: "Campaign Cockpit — performance tracking" },
      { he: "פרסום תבניות ב-Marketplace", en: "Template Marketplace publishing" },
      { he: "3 מושבי צוות", en: "3 team seats" },
      { he: "דוחות ממותגים", en: "Branded reports" },
      { he: "תמיכה בעדיפות גבוהה", en: "Priority support" },
    ],
    limits: {
      maxFunnels: -1,
      aiCoachMessages: -1,           // unlimited
      aiCoachOveragePriceNIS: 0,
      pdfExport: true,
      whatsappTemplates: -1,         // unlimited
      campaignCockpit: true,
      templatePublishing: true,
      differentiationAgent: true,
      seats: 3,
      brandedReports: true,
      prioritySupport: true,
    },
  },
];

// ─── Feature type (derived from limits keys) ─────────────────────────────

export type Feature = keyof TierLimits;

// ─── Core access gate ─────────────────────────────────────────────────────

/**
 * Returns true if the given tier has access to the given feature.
 *
 * Rules:
 *  - boolean limit → returned directly
 *  - number limit  → true when value > 0 OR value === -1 (unlimited)
 *  - 0             → no access (feature disabled or no quota)
 */
export function canAccess(tier: PricingTier, feature: Feature): boolean {
  const config = TIERS.find((t) => t.id === tier);
  if (!config) return false;
  const value = config.limits[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0 || value === -1;
  return false;
}

// ─── Lookup helpers ────────────────────────────────────────────────────────

export function getTierConfig(tier: PricingTier): TierConfig {
  return TIERS.find((t) => t.id === tier) ?? TIERS[0];
}

/**
 * Effective monthly price for a given billing cycle.
 * Free tier always returns 0.
 */
export function getEffectivePrice(tier: PricingTier, cycle: BillingCycle): number {
  const config = getTierConfig(tier);
  return cycle === "annual" ? config.priceAnnualMonthly : config.priceMonthly;
}

/**
 * Raw limit value for a feature: boolean | number (-1 = unlimited).
 * Use canAccess() to check eligibility; use this for quota-aware UI.
 */
export function getLimitValue(tier: PricingTier, feature: Feature): boolean | number {
  return getTierConfig(tier).limits[feature];
}

/**
 * Returns true when currentUsage has consumed ≥ 80 % of a finite numeric limit.
 * Always false for boolean features, free tiers, and unlimited (-1) features.
 */
export function isApproachingLimit(
  tier: PricingTier,
  feature: Feature,
  currentUsage: number,
): boolean {
  const limit = getLimitValue(tier, feature);
  if (typeof limit !== "number" || limit <= 0 || limit === -1) return false;
  return currentUsage / limit >= 0.8;
}

/**
 * Annual savings in NIS vs equivalent monthly billing.
 * Returns 0 for the free tier.
 */
export function getAnnualSavings(tier: PricingTier): number {
  const config = getTierConfig(tier);
  if (config.priceMonthly === 0) return 0;
  return (config.priceMonthly - config.priceAnnualMonthly) * 12;
}
