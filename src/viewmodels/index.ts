// ─── ViewModel barrel ────────────────────────────────────────────────────────
// Single import point for all UI-facing view-model types and adapters.
// Components and pages must import from here, never from @/engine/* directly.

export type {
  HealthScore,
  HealthScoreBreakdown,
  HealthScoreBreakdownVM,
  HealthScoreVM,
} from "./health.vm";
export { calculateHealthScore, toHealthScoreVM, getHealthScoreColor } from "./health.vm";

export type {
  BottleneckModule,
  BottleneckSeverity,
  LoopState,
  Bottleneck,
  LoopSnapshot,
  WeeklyCommitment,
  BusinessInsight,
  InsightVM,
  BottleneckVM,
  LoopStateVM,
} from "./insights.vm";
export {
  selectTactic,
  detectBottlenecks,
  generateInsights,
  commitToAction,
  reportOutcome,
  startNewWeek,
  getStreak,
  getLoopSnapshot,
  getInsightUsageCount,
  toInsightVM,
  toBottleneckVM,
  toLoopStateVM,
} from "./insights.vm";

export type { NextStep, PulseAction, LossFramedMessage, WeeklyPulse } from "./next-step.vm";
export type {
  StylomeVoice,
  UserBehavior,
  ChatInsights,
  ImportedDataSignals,
  MetaSignals,
  DifferentiationContext,
  RealMetrics,
  DerivedInsights,
  UserKnowledgeGraph,
} from "./next-step.vm";
export {
  getRecommendedNextStep,
  buildUserKnowledgeGraph,
  loadChatInsights,
  loadImportedDataSignals,
  loadMetaSignals,
} from "./next-step.vm";

export type {
  DISCDimension,
  DISCProfileVM,
  NextStepVM,
  ChurnRiskVM,
  ChurnInterventionVM,
} from "./user-profile.vm";
export { toDISCProfileVM, toNextStepVM, toChurnRiskVM } from "./user-profile.vm";

export type {
  RecommendationSource,
  OutcomeHorizon,
  RecommendationEvent,
  OutcomeReport,
} from "./outcome-loop.vm";
export { captureRecommendationShown, captureVariantPick, captureOutcome, buildContextSnapshot } from "./outcome-loop.vm";

export type {
  ThemeCluster,
  CrmInsights,
  Framework,
  RecommendationCategory,
  LeadRecommendation,
  PriorOutreachOutcome,
  LeadCoachInput,
} from "./crm-leads.vm";
export { generateLeadRecommendations } from "./crm-leads.vm";

export type { PromiseVerification, BehaviorMismatch } from "./intake.vm";
export { verifyPromise } from "./intake.vm";

export type {
  CompoundingLoss,
  CostOfInaction,
  CLGResult,
  CLGWeek,
  CLGMetric,
  FlywheelStep,
  RetentionFlywheel,
  HormoziDimension,
  HormoziValueResult,
  ActionSignal,
  ReflectiveContext,
  ActionCard,
  EmotionType,
  EmotionalBalance,
  ChannelEPS,
  EPSResult,
  Industry,
  CrossDomainInsight,
  CrossDomainReport,
  ContentLanguage,
  ChannelName,
  ChannelFitScore,
  PredictiveContentScore,
  CohortId,
  CohortCharacteristic,
  CohortStrategy,
  BehavioralCohort,
  CohortAssignment,
} from "./analytics.vm";
export {
  calculateCostOfInaction,
  generateCLGStrategy,
  generateRetentionFlywheel,
  personalizeResult,
  calculateValueScore,
  generateReflectiveAction,
  getEPSVerdict,
  getPredictiveContentVerdict,
} from "./analytics.vm";
