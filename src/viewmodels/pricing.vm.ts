// ─── Pricing ViewModel ───────────────────────────────────────────────────────
// Bridges pricingWizardEngine and pricingIntelligenceEngine → UI props.

export type {
  DreamOutcomeLevel,
  EffortLevel,
  PricingWizardInput,
  PricingWizardRecommendation,
  SocialProofLevel,
  TimeToValue,
} from "@/engine/pricingWizardEngine";
export { DIFFERENTIATOR_OPTIONS } from "@/engine/pricingWizardEngine";
export { generatePricingIntelligence } from "@/engine/pricingIntelligenceEngine";
