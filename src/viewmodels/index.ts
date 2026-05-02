// ─── ViewModel barrel ────────────────────────────────────────────────────────
// Single import point for all UI-facing view-model types and adapters.
// Components and pages must import from here, never from @/engine/* directly.

export type {
  HealthScore,
  HealthScoreBreakdown,
  HealthScoreBreakdownVM,
  HealthScoreVM,
} from "./health.vm";
export { toHealthScoreVM, getHealthScoreColor } from "./health.vm";

export type {
  BottleneckModule,
  BottleneckSeverity,
  LoopState,
  InsightVM,
  BottleneckVM,
  LoopStateVM,
} from "./insights.vm";
export { toInsightVM, toBottleneckVM, toLoopStateVM } from "./insights.vm";

export type {
  DISCDimension,
  DISCProfileVM,
  NextStepVM,
  ChurnRiskVM,
  ChurnInterventionVM,
} from "./user-profile.vm";
export { toDISCProfileVM, toNextStepVM, toChurnRiskVM } from "./user-profile.vm";
