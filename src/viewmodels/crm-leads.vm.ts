// CRM / lead-coach boundary: re-exports types and functions components need.
// Components must import from here, not from @/engine/crmInsightEngine or
// @/engine/leadCoachEngine directly.

export type {
  ThemeCluster,
  CrmInsights,
} from "@/engine/crmInsightEngine";

export type {
  Framework,
  RecommendationCategory,
  LeadRecommendation,
  PriorOutreachOutcome,
  LeadCoachInput,
} from "@/engine/leadCoachEngine";

export { generateLeadRecommendations } from "@/engine/leadCoachEngine";
