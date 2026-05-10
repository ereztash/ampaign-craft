// Pricing boundary: re-exports from pricingIntelligenceEngine and
// pricingWizardEngine. Components must import from here.

export { generatePricingIntelligence } from "@/engine/pricingIntelligenceEngine";

export type {
  DreamOutcomeLevel,
  TimeToValue,
  EffortLevel,
  SocialProofLevel,
  PricingWizardInput,
  PricingWizardTier,
  PricingWizardRecommendation,
} from "@/engine/pricingWizardEngine";
export {
  DIFFERENTIATOR_OPTIONS,
  computePricingWizardRecommendation,
} from "@/engine/pricingWizardEngine";
