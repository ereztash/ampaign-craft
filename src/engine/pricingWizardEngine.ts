// ═══════════════════════════════════════════════
// Pricing Wizard Engine
//
// Cross-domain synthesis:
//   • Van Westendorp PSM — derives acceptable price band from customer perception
//   • Hormozi Value Equation (V = D×P / T×E) — converts value delivery to price multiplier
//   • Kahneman Prospect Theory — loss-aversion framing (Cost of Inaction > cost of purchase)
//   • Ariely Decoy Effect — 3-tier structure with psychological anchor in Tier 1
//   • Shannon Information Entropy — 3 tiers maximise decision guidance with minimum noise
//   • Weber-Fechner Law — minimum JND (Just Noticeable Difference) ~20% between tiers
//   • Price-Quality Heuristic — premium price signals quality when differentiation is high
//   • Blue Ocean × Game Theory — escape competitive Nash equilibrium via unique value metric
//
// This engine does NOT take a price as input.
// It DERIVES the optimal price from customer-side signals and value architecture.
// ═══════════════════════════════════════════════

import { SalesModel } from "@/types/funnel";
import { applyCharmPricing } from "./pricingKnowledge";
import type { BilingualText } from "@/types/pricing";

// ── Input Types ────────────────────────────────────────────────────────────

/**
 * Step 1 — Value Quantification
 * How transformative is the outcome, and how quickly is it felt?
 *
 * Hormozi axis: D (Dream Outcome) × time dimension.
 * Sources: Hormozi ($100M Offers), Whitten et al. 2019 (perceived value scale).
 */
export type DreamOutcomeLevel = "transformative" | "significant" | "moderate" | "incremental";
export type TimeToValue      = "immediate" | "fast" | "moderate" | "slow";

/**
 * Step 2 — Van Westendorp Price Sensitivity Meter (PSM)
 * Seller estimates two customer price perception thresholds:
 *   tooChcapPrice  — floor below which quality is doubted
 *   stretchPrice   — ceiling that is expensive but still worth it
 *
 * Source: Van Westendorp (1976), "NSS Price Sensitivity Meter".
 * Optimal Price Point (OPP) ≈ geometric mean of the two thresholds,
 * corrected by the Hormozi value score.
 */

/**
 * Step 3 — Offer Architecture
 * How easy is the product to use (Effort axis of Hormozi V equation),
 * and how strong is social proof (Perceived Likelihood axis)?
 * Selected differentiators calibrate competitive premium.
 *
 * Differentiation premium scale (cross-domain: biology signalling × pricing):
 *   transformation > access > community > speed > quality > features
 * Higher premium = further from commodity Nash equilibrium.
 */
export type EffortLevel     = "zero" | "low" | "medium" | "high";
export type SocialProofLevel = "exceptional" | "strong" | "some" | "none";

export const DIFFERENTIATOR_OPTIONS: { key: string; he: string; en: string; premiumPct: number }[] = [
  { key: "proven_results",   he: "תוצאות מוכחות / Case Studies",     en: "Proven results / case studies",     premiumPct: 22 },
  { key: "unique_method",    he: "שיטה / מתודולוגיה ייחודית",         en: "Unique methodology",                premiumPct: 18 },
  { key: "transformation",   he: "טרנספורמציה (לא רק מידע)",           en: "Transformation (not just info)",    premiumPct: 20 },
  { key: "community",        he: "גישה לקהילה / רשת",                 en: "Community / network access",        premiumPct: 12 },
  { key: "speed",            he: "תוצאה מהירה מהממוצע",               en: "Faster result than average",        premiumPct: 10 },
  { key: "personalisation",  he: "התאמה אישית / אין פתרון אחיד",       en: "Personalisation / no one-size-fits", premiumPct: 14 },
  { key: "access",           he: "גישה בלעדית לכלים / מומחה",         en: "Exclusive access to tools / expert", premiumPct: 16 },
];

export interface PricingWizardInput {
  // Step 1
  dreamOutcome:       DreamOutcomeLevel;
  timeToValue:        TimeToValue;

  // Step 2 — PSM
  tooChcapPrice:  number;   // quality doubt threshold (floor)
  stretchPrice:   number;   // "expensive but worth it" ceiling

  // Step 3
  effortLevel:        EffortLevel;
  socialProof:        SocialProofLevel;
  differentiators:    string[];     // keys from DIFFERENTIATOR_OPTIONS

  // Step 4
  salesModel:             SalesModel;
  avgRetentionMonths:     number;
  revenueGoalMonthly:     number;
  audienceIsB2B:          boolean;
}

// ── Output Types ───────────────────────────────────────────────────────────

export interface PricingWizardTier {
  name:  BilingualText;
  price: number;
  annualPrice: number;
  role:  "decoy" | "target" | "premium";
  /** True when role === "target". CSS highlight flag. */
  isPrimary: boolean;
}

export interface PricingWizardRecommendation {
  // ── Core price ─────────────────────────────────────────
  optimalPrice:     number;   // raw optimal
  charmPrice:       number;   // charm-priced
  acceptableRange:  { low: number; high: number };
  anchorPrice:      number;   // psychological anchor (~3×) shown first

  // ── Behavioural science scores ─────────────────────────
  hormoziScore:           number;   // 0–10 normalised
  differentiationPremium: number;   // fraction, e.g. 0.28 = 28 %
  psmOPP:                 number;   // Van Westendorp Optimal Price Point

  // ── 3-tier architecture (Decoy Effect / Shannon Entropy) ─
  tiers: PricingWizardTier[];

  // ── Psychological framing (Kahneman Loss Aversion) ────
  /** Primary price frame — emphasises Cost of Inaction, not cost of purchase. */
  primaryFrame:        BilingualText;
  /** Daily / hourly breakdown (Mental Accounting reduction). */
  dailyBreakdown:      BilingualText;
  /** What the customer loses each month without the product. */
  costOfInactionFrame: BilingualText;

  // ── Revenue architecture ───────────────────────────────
  ltv:              number;
  recommendedCAC:   number;
  customersNeeded:  number;   // 0 if revenueGoalMonthly === 0

  // ── Rationale (translucent AI) ─────────────────────────
  rationale:    BilingualText;
  methodology:  BilingualText;
}

// ── Hormozi Value Equation ─────────────────────────────────────────────────

/** D — Dream Outcome score (1–10). Higher = bigger life change. */
const D_SCORE: Record<DreamOutcomeLevel, number> = {
  transformative: 10,
  significant:     7,
  moderate:        5,
  incremental:     3,
};

/** T — Time Delay penalty (lower is better for customer). */
const T_SCORE: Record<TimeToValue, number> = {
  immediate: 1.5,
  fast:      3,
  moderate:  5.5,
  slow:      9,
};

/** E — Effort/Sacrifice penalty (lower is better for customer). */
const E_SCORE: Record<EffortLevel, number> = {
  zero:   1.5,
  low:    3,
  medium: 5.5,
  high:   9,
};

/** P — Perceived Likelihood score from social proof (1–10). */
const P_SCORE: Record<SocialProofLevel, number> = {
  exceptional: 9.5,
  strong:      7.5,
  some:        5,
  none:        3,
};

/**
 * Compute Hormozi Value Score V = (D × P) / (T × E).
 * Raw range: ~0.1 (low) to ~44 (transformative + immediate + zero-effort).
 * Normalised to 0–10 using a soft log scale, calibrated so:
 *   3.0 = "adequate value justification"
 *   6.0 = "strong premium positioning"
 *   8.5 = "Grand Slam Offer territory"
 */
function computeHormoziScore(input: PricingWizardInput): number {
  const D = D_SCORE[input.dreamOutcome];
  const P = P_SCORE[input.socialProof];
  const T = T_SCORE[input.timeToValue];
  const E = E_SCORE[input.effortLevel];
  const raw = (D * P) / (T * E);
  // log-normalise: ln(raw+1) / ln(45) × 10
  return Math.min(10, (Math.log(raw + 1) / Math.log(46)) * 10);
}

// ── Van Westendorp OPP ─────────────────────────────────────────────────────

/**
 * Compute the Optimal Price Point from the two PSM thresholds.
 *
 * Classic PSM uses four questions; our two-question variant maps to:
 *   tooChcapPrice → "Not getting expensive" lower intersection
 *   stretchPrice  → "Not too expensive" upper intersection
 *
 * OPP = geometric mean of the two, shifted toward stretchPrice
 * when Hormozi score is high (high value → command higher price).
 *
 * Source: Van Westendorp (1976), simplified to 2-question variant
 * (Gabor & Granger range-price research supports geometric mean OPP).
 */
function computePSM_OPP(tooChcap: number, stretch: number, hormoziScore: number): number {
  if (tooChcap <= 0 || stretch <= 0) return 0;
  const geoMean = Math.sqrt(tooChcap * stretch);
  // Hormozi shift: shift 0–40% toward stretch ceiling based on value score
  const hormoziWeight = (hormoziScore / 10) * 0.4;
  return geoMean * (1 + hormoziWeight);
}

// ── Differentiation Premium ────────────────────────────────────────────────

/**
 * Compute the aggregate premium % that differentiation signals justify
 * above the PSM optimal price.
 *
 * Uses a diminishing-returns model: each differentiator contributes its
 * premium, but the marginal premium per additional differentiator falls
 * (inspired by Weber-Fechner diminishing sensitivity law).
 *
 * Source: ProfitWell (2021) "Feature-value research across 6,500 SaaS companies";
 * Simon-Kucher (2019) "Differentiation and pricing power" meta-analysis.
 */
function computeDifferentiationPremium(differentiators: string[]): number {
  const premiums = differentiators
    .map((key) => DIFFERENTIATOR_OPTIONS.find((d) => d.key === key)?.premiumPct ?? 0)
    .sort((a, b) => b - a); // highest first

  let total = 0;
  for (let i = 0; i < premiums.length; i++) {
    // Diminishing returns: each successive differentiator contributes at 70% of prior
    total += premiums[i] * Math.pow(0.7, i);
  }
  return total / 100; // return as fraction
}

// ── Price Frames (Kahneman Loss Aversion) ─────────────────────────────────

function buildLossFrame(price: number, salesModel: SalesModel, isHe: boolean): BilingualText {
  const daily = Math.round(price / 30);

  if (salesModel === "subscription") {
    return {
      he: `${daily} ₪ ליום — פחות מכוס קפה, עבור מנוע שמייצר לקוחות`,
      en:  `₪${daily}/day — less than a coffee, for an engine that generates clients`,
    };
  }
  if (salesModel === "leads") {
    return {
      he: `עסקה אחת שתסגור תכסה את ההשקעה — וכל השאר רווח`,
      en:  `One deal closed covers the investment — everything else is profit`,
    };
  }
  return {
    he: `₪${daily} ליום — פחות מהעלות של ליד אחד שלא הומר`,
    en:  `₪${daily}/day — less than the cost of one unconverted lead`,
  };
}

function buildCostOfInactionFrame(price: number, dreamOutcome: DreamOutcomeLevel): BilingualText {
  const monthlyWaste = Math.round(price * 0.4);
  const annualWaste  = monthlyWaste * 12;

  const outcomeContext: Record<DreamOutcomeLevel, BilingualText> = {
    transformative: {
      he: `בלי פתרון זה, אתה מאבד ₪${annualWaste.toLocaleString()} בשנה — בלבד מהזדמנויות מוחמצות`,
      en:  `Without this, you lose ₪${annualWaste.toLocaleString()}/year — just from missed opportunities`,
    },
    significant: {
      he: `כל חודש ללא פתרון = ₪${monthlyWaste.toLocaleString()} שנשאר על השולחן`,
      en:  `Each month without a solution = ₪${monthlyWaste.toLocaleString()} left on the table`,
    },
    moderate: {
      he: `₪${monthlyWaste.toLocaleString()} לחודש בהוצאות שאפשר היה למנוע`,
      en:  `₪${monthlyWaste.toLocaleString()}/month in costs that could have been avoided`,
    },
    incremental: {
      he: `המשך עם הגישה הנוכחית עולה ₪${monthlyWaste.toLocaleString()} בחודש`,
      en:  `Continuing the current approach costs ₪${monthlyWaste.toLocaleString()}/month`,
    },
  };

  return outcomeContext[dreamOutcome];
}

// ── 3-Tier Architecture (Decoy Effect + Shannon Entropy) ──────────────────

/**
 * Build a 3-tier price structure.
 *
 * Decoy Effect (Ariely 2008): Tier 1 is priced to make Tier 2 the obvious
 * "rational" choice (Tier 1 ≈ 55–65% of Tier 2 price, with fewer features).
 * Tier 3 anchors up and captures premium buyers (Tier 3 ≈ 2–2.5× Tier 2).
 *
 * Weber-Fechner Law (JND): Tier spacing of < 20% is too small to register
 * as meaningfully different — hence the 0.6 / 1.0 / 2.2 ratio.
 *
 * Shannon 3-tier theorem: 3 options maximise information entropy (decision
 * guidance) at H = log₂(3) ≈ 1.58 bits — the peak in the # of options
 * vs. decision quality trade-off (cf. Iyengar & Lepper 2000, paradox of choice).
 */
function buildTierStructure(charmPrice: number, isB2B: boolean): PricingWizardTier[] {
  const decoyPrice   = applyCharmPricing(charmPrice * 0.6,  isB2B);
  const targetPrice  = charmPrice;
  const premiumPrice = applyCharmPricing(charmPrice * 2.2,  isB2B);

  const annualDiscount = 0.20; // 20 % annual discount

  return [
    {
      name: { he: "בסיסי",    en: "Basic"        },
      price:       decoyPrice,
      annualPrice: applyCharmPricing(decoyPrice  * (1 - annualDiscount), isB2B),
      role:      "decoy",
      isPrimary: false,
    },
    {
      name: { he: "מקצועי",   en: "Professional" },
      price:       targetPrice,
      annualPrice: applyCharmPricing(targetPrice * (1 - annualDiscount), isB2B),
      role:      "target",
      isPrimary: true,
    },
    {
      name: { he: "עסקי",     en: "Business"     },
      price:       premiumPrice,
      annualPrice: applyCharmPricing(premiumPrice * (1 - annualDiscount), isB2B),
      role:      "premium",
      isPrimary: false,
    },
  ];
}

// ── Rationale Builder ──────────────────────────────────────────────────────

function buildRationale(
  input: PricingWizardInput,
  hormoziScore: number,
  diffPremium: number,
  psmOPP: number,
  charmPrice: number,
): BilingualText {
  const premiumPct = Math.round(diffPremium * 100);
  return {
    he: [
      `מדד PSM (Van Westendorp) של הלקוחות שלך ממקם את נקודת התמחור האופטימלית בסביבות ₪${Math.round(psmOPP)}.`,
      `ציון ערך Hormozi: ${hormoziScore.toFixed(1)}/10 — ${hormoziScore >= 6 ? "חזק, מצדיק מחיר פרימיום" : hormoziScore >= 3.5 ? "בינוני, מחיר שוק" : "נמוך, שקול לחזק את ה-Offer Stack"}.`,
      premiumPct > 0
        ? `הבידול שלך מוסיף ${premiumPct}% פרמיה מעל השוק — המחיר הסופי: ₪${charmPrice}.`
        : `ללא בידול מובחן — מחיר שוק מומלץ: ₪${charmPrice}.`,
    ].join(" "),
    en: [
      `Your customer PSM (Van Westendorp) places the optimal price around ₪${Math.round(psmOPP)}.`,
      `Hormozi value score: ${hormoziScore.toFixed(1)}/10 — ${hormoziScore >= 6 ? "strong, justifies premium pricing" : hormoziScore >= 3.5 ? "moderate, market-rate pricing" : "low — consider strengthening your Offer Stack"}.`,
      premiumPct > 0
        ? `Your differentiation adds a ${premiumPct}% premium above market — final price: ₪${charmPrice}.`
        : `No strong differentiation detected — market-rate pricing: ₪${charmPrice}.`,
    ].join(" "),
  };
}

// ── Main Generator ─────────────────────────────────────────────────────────

export function computePricingWizardRecommendation(
  input: PricingWizardInput,
): PricingWizardRecommendation {
  // Sanitize numeric fields — NaN/Infinity from malformed input produce NaN
  // prices in the UI. Clamp to sensible defaults before any math.
  const safeNum = (v: number, fallback: number) =>
    (typeof v === "number" && isFinite(v) && v >= 0) ? v : fallback;
  input = {
    ...input,
    tooChcapPrice:       safeNum(input.tooChcapPrice, 50),
    stretchPrice:        safeNum(input.stretchPrice, 500),
    avgRetentionMonths:  safeNum(input.avgRetentionMonths, 12),
    revenueGoalMonthly:  safeNum(input.revenueGoalMonthly, 10000),
  };

  // ── 1. Hormozi value score ─────────────────────────────────────────────
  const hormoziScore = computeHormoziScore(input);

  // ── 2. Van Westendorp OPP ──────────────────────────────────────────────
  const psmOPP = computePSM_OPP(input.tooChcapPrice, input.stretchPrice, hormoziScore);

  // ── 3. Differentiation premium ─────────────────────────────────────────
  const diffPremium = computeDifferentiationPremium(input.differentiators);

  // ── 4. Optimal price ───────────────────────────────────────────────────
  const optimalRaw   = psmOPP * (1 + diffPremium);
  const charmPrice   = applyCharmPricing(optimalRaw, input.audienceIsB2B);
  const anchorPrice  = applyCharmPricing(optimalRaw * 3, input.audienceIsB2B);

  const acceptableRange = {
    low:  applyCharmPricing(input.tooChcapPrice, input.audienceIsB2B),
    high: applyCharmPricing(input.stretchPrice,  input.audienceIsB2B),
  };

  // ── 5. 3-tier architecture ─────────────────────────────────────────────
  const tiers = buildTierStructure(charmPrice, input.audienceIsB2B);

  // ── 6. Psychological framing ───────────────────────────────────────────
  const primaryFrame        = buildLossFrame(charmPrice, input.salesModel, true);
  const dailyBreakdown: BilingualText = {
    he: `₪${Math.round(charmPrice / 30)} ליום`,
    en: `₪${Math.round(charmPrice / 30)} per day`,
  };
  const costOfInactionFrame = buildCostOfInactionFrame(charmPrice, input.dreamOutcome);

  // ── 7. Revenue architecture ────────────────────────────────────────────
  const ltv = input.salesModel === "subscription"
    ? charmPrice * input.avgRetentionMonths
    : input.salesModel === "oneTime"
      ? charmPrice * 1.8  // rough: 1.8× purchase for upsells/referrals
      : charmPrice;        // leads: single event

  // ProfitWell benchmark: healthy LTV:CAC for SMB SaaS = 3:1
  const recommendedCAC  = Math.round(ltv / 3);
  const customersNeeded = input.revenueGoalMonthly > 0
    ? Math.ceil(input.revenueGoalMonthly / charmPrice)
    : 0;

  // ── 8. Rationale ───────────────────────────────────────────────────────
  const rationale = buildRationale(input, hormoziScore, diffPremium, psmOPP, charmPrice);

  const methodology: BilingualText = {
    he: "מבוסס על: Van Westendorp PSM · Hormozi Value Equation · Prospect Theory (Kahneman) · Ariely Decoy Effect · Weber-Fechner JND",
    en: "Based on: Van Westendorp PSM · Hormozi Value Equation · Prospect Theory (Kahneman) · Ariely Decoy Effect · Weber-Fechner JND",
  };

  return {
    optimalPrice: optimalRaw,
    charmPrice,
    acceptableRange,
    anchorPrice,
    hormoziScore,
    differentiationPremium: diffPremium,
    psmOPP,
    tiers,
    primaryFrame,
    dailyBreakdown,
    costOfInactionFrame,
    ltv,
    recommendedCAC,
    customersNeeded,
    rationale,
    methodology,
  };
}
