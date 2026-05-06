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

export type { FoggLeg, ProspectProfile } from "./prospect-intelligence.vm";
export {
  triggerProspectResearch,
  getProspectProfile,
  clearProspectProfile,
} from "./prospect-intelligence.vm";

export type { PhaseId, PhaseConfig, PhaseQuestion } from "./differentiation-phases.vm";
export { PHASES, getPhaseById, getQuestionsForPhase } from "./differentiation-phases.vm";

export * from "./behavioral-action.vm";
export * from "./business-fingerprint.vm";
export * from "./pricing.vm";
export * from "./sales.vm";

export * from "./differentiation.vm";
export * from "./moat.vm";
export * from "./churn.vm";
export * from "./stylome.vm";
export * from "./brand.vm";

export * from "./guidance.vm";
export * from "./data-import.vm";
export * from "./export.vm";
export * from "./referral.vm";
export * from "./training.vm";
export * from "./blackboard.vm";
