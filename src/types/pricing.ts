// ═══════════════════════════════════════════════
// Pricing Intelligence — Type Definitions
// Cross-domain: Behavioral Economics × SaaS Pricing × Offer Architecture
// ═══════════════════════════════════════════════

import type { BilingualText } from "./i18n";

// === INPUT ===

export interface PricingInput {
  industry: string;
  audience: "b2c" | "b2b" | "both";
  currentPrice: number;
  salesModel: "oneTime" | "subscription" | "leads";
  differentiationStrength: number; // 0-100
  experienceLevel: string;
  goal: string;
  productDescription: string;
}

// === RESULT ===

export interface PricingIntelligenceResult {
  pricingModel: PricingModelRecommendation;
  tierStructure: TierRecommendation;
  offerStack: OfferStackRecommendation;
  guarantee: GuaranteeRecommendation;
  priceFramingScripts: PriceFramingScript[];
  competitivePosition: CompetitivePositionResult;
  subscriptionEconomics: SubscriptionEconomicsResult | null;
  nextSteps: { priority: "high" | "medium"; action: BilingualText; timeframe: string }[];
}

export type PricingModelType = "value_based" | "competitive" | "freemium" | "penetration" | "premium";

export interface PricingModelRecommendation {
  model: PricingModelType;
  label: BilingualText;
  rationale: BilingualText;
  valueMetric: BilingualText;
  recommendedRange: { low: number; mid: number; high: number };
  charmPricePoints: number[];
  anchorPrice: number;
}

export interface TierRecommendation {
  pattern: "good_better_best" | "freemium_pro" | "single_tier";
  tiers: RecommendedTier[];
  decoyTierIndex: number | null;
  highlightedTierIndex: number;
}

export interface RecommendedTier {
  name: BilingualText;
  price: number;
  annualPrice: number;
  annualDiscount: number;
  features: BilingualText[];
  targetSegment: BilingualText;
  isDecoy: boolean;
  isPrimary: boolean;
}

export interface OfferStackRecommendation {
  coreOffer: BilingualText;
  bonuses: OfferBonus[];
  totalPerceivedValue: number;
  actualPrice: number;
  valueToPrice: number;
  valueEquation: {
    dreamOutcome: number;
    perceivedLikelihood: number;
    timeDelay: number;
    effortSacrifice: number;
    totalScore: number;
  };
}

export interface OfferBonus {
  name: BilingualText;
  anchoredValue: number;
  type: "speed" | "ease" | "proof" | "exclusive" | "community";
  description: BilingualText;
}

export type GuaranteeType = "unconditional" | "conditional" | "performance" | "try_before_buy";

export interface GuaranteeRecommendation {
  type: GuaranteeType;
  label: BilingualText;
  duration: string;
  script: BilingualText;
  trustScore: number; // 1-10
}

export interface PriceFramingScript {
  context: "landing_page" | "sales_call" | "proposal" | "whatsapp" | "email";
  label: BilingualText;
  script: BilingualText;
  principle: string;
}

export interface CompetitivePositionResult {
  position: "below_market" | "market_rate" | "premium" | "luxury";
  label: BilingualText;
  gap: BilingualText;
  justification: BilingualText;
}

export interface SubscriptionEconomicsResult {
  projectedLTV: number;
  recommendedCAC: number;
  ltvCacRatio: number;
  health: "healthy" | "at_risk" | "unsustainable";
  annualDiscount: number;
  recommendation: BilingualText;
}
