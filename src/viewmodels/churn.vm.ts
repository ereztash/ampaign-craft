// Churn boundary: re-exports types and functions from churnPlaybookEngine and
// churnPredictionEngine. Components must import from here.

export type {
  RiskTier,
  WeeklyAction,
  NudgeEvent,
  LeadingIndicator,
  Phase,
  ChurnPlaybook,
} from "@/engine/churnPlaybookEngine";
export { buildChurnPlaybook } from "@/engine/churnPlaybookEngine";

export type {
  ChurnSignal,
  ChurnIntervention,
  NRRProjection,
  ChurnRiskAssessment,
} from "@/engine/churnPredictionEngine";
export { assessChurnRisk } from "@/engine/churnPredictionEngine";
