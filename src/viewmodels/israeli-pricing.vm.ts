// Israeli pricing psychology boundary: re-exports types and functions from
// israeliPricingPsychologyEngine. Components must import from here.

export type {
  CulturalSegment,
  SegmentPricingProfile,
  TashlumimSplit,
  PriceWindow,
  CalendarTimingAdvice,
  VATFraming,
  AnchoredPrice,
  PriceFraming,
  FramedPrice,
  PricingRiskFlag,
  IsraeliPricingAnalysis,
} from "@/engine/israeliPricingPsychologyEngine";

export {
  SEGMENT_PROFILES,
  VAT_RATE,
  getSegmentProfile,
  suggestTashlumim,
  getCalendarTiming,
  frameVAT,
  anchorWithBuffer,
  chooseFraming,
  detectPricingRisks,
  analyzeIsraeliPricing,
} from "@/engine/israeliPricingPsychologyEngine";

export type {
  IsraeliIndustryBenchmark,
} from "@/engine/pricingKnowledge";

export {
  ISRAELI_INDUSTRY_BENCHMARKS,
  getIsraeliBenchmark,
} from "@/engine/pricingKnowledge";
