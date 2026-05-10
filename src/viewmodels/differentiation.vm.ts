// Differentiation boundary: re-exports types and functions from
// differentiationEngine and differentiationKnowledge.
// Components must import from here.

export type { AiResults } from "@/engine/differentiationEngine";
export {
  generateDifferentiation,
  scoreClaimVerification,
  buildGapAnalysis,
  buildHiddenValueProfile,
  getTopHiddenValues,
  calculateDifferentiationStrength,
  selectContraryMetrics,
  suggestHybridCategory,
} from "@/engine/differentiationEngine";

export type {
  HiddenValueDef,
  CompetitorArchetypeDef,
  BuyingCommitteeRoleDef,
  HybridCategoryDef,
  ContraryMetricDef,
  B2CCompetitorArchetypeDef,
  InfluenceNetworkRoleDef,
} from "@/engine/differentiationKnowledge";

export {
  HIDDEN_VALUES,
  COMPETITOR_ARCHETYPES,
  BUYING_COMMITTEE_ROLES,
  FAKE_DIFFERENTIATION_SIGNALS,
  REAL_DIFFERENTIATION_SIGNALS,
  HYBRID_CATEGORIES,
  CONTRARY_METRICS,
  NORMALIZING_FRAMES,
  B2C_HIDDEN_VALUES,
  B2C_COMPETITOR_ARCHETYPES,
  INFLUENCE_NETWORK_ROLES,
  B2C_CONTRARY_METRICS,
  B2C_NORMALIZING_FRAMES,
  getHiddenValuesForMode,
  getCompetitorArchetypesForMode,
  getContraryMetricsForMode,
} from "@/engine/differentiationKnowledge";
