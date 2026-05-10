// Pricing experiment boundary: re-exports types and functions from
// pricingExperimentEngine. Components must import from here.

export type {
  ExperimentStatus,
  CustomerOutcome,
  PricedProspect,
  PricingExperiment,
  ExperimentResult,
  ExperimentRecommendation,
  NextExperiment,
  PricingConfidenceTier,
} from "@/engine/pricingExperimentEngine";

export {
  createExperiment,
  getActiveExperiment,
  getAllExperiments,
  logProspectOutcome,
  abandonExperiment,
  analyzeExperiment,
  proposeNextExperiment,
  getCurrentConfidence,
} from "@/engine/pricingExperimentEngine";
