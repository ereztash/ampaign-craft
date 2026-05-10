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
  generateWeeklyPulse,
  buildUserKnowledgeGraph,
  loadChatInsights,
  loadImportedDataSignals,
  loadMetaSignals,
} from "./next-step.vm";

export type {
  DISCDimension,
  DISCDistribution,
  DISCProfile,
  DISCProfileVM,
  NextStepVM,
  ChurnRiskAssessment,
  ChurnRiskVM,
  ChurnInterventionVM,
} from "./user-profile.vm";
export {
  toDISCProfileVM,
  toNextStepVM,
  toChurnRiskVM,
  inferDISCProfile,
  getReaderFraming,
} from "./user-profile.vm";

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

export type {
  PromiseVerification,
  BehaviorMismatch,
  IntakeTelemetryEvent,
  IntakeNeed,
  IntakePain,
  IntakeRouteTarget,
  IntakePromise,
  IntakeRouting,
  IntakeSignal,
} from "./intake.vm";
export {
  verifyPromise,
  detectBehaviorMismatch,
  initTelemetry,
  recordRouteVisit,
  recordFirstOutput,
  getTelemetry,
  clearTelemetry,
  getIntakeSignal,
  setIntakeSignal,
  clearIntakeSignal,
  hasCompletedIntake,
} from "./intake.vm";

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
  calculateEPS,
  getEPSVerdict,
  generateCrossDomainInsights,
  getPredictiveContentVerdict,
  assignToCohort,
} from "./analytics.vm";

export type { FoggLeg, ProspectProfile } from "./prospect-intelligence.vm";
export {
  triggerProspectResearch,
  getProspectProfile,
  clearProspectProfile,
} from "./prospect-intelligence.vm";

export type { PhaseId, PhaseConfig, PhaseQuestion, DifferentiationFormData } from "./differentiation-phases.vm";
export { PHASES, getPhaseById, getQuestionsForPhase } from "./differentiation-phases.vm";

// ── Re-exports added for engine-import boundary cleanup (2026-05-06) ─────────

export {
  deriveHeuristicSet,
  getActiveHeuristicIds,
  getL3ComponentConfig,
  getL5CSSVars,
  getPrimaryCtaVerbs,
} from "./behavioral-heuristic.vm";

export type { BrandVector, BrandVectorResult } from "./brand-vector.vm";
export { analyzeBrandVector } from "./brand-vector.vm";

export type {
  BusinessArchetype,
  FingerprintDimensions,
  FingerprintUX,
  BusinessFingerprint,
} from "./business-fingerprint.vm";
export {
  computeFingerprint,
  DIMENSION_LABELS,
  ARCHETYPE_LABELS,
} from "./business-fingerprint.vm";

export type {
  RiskTier,
  WeeklyAction,
  NudgeEvent,
  LeadingIndicator,
  Phase,
  ChurnPlaybook,
  ChurnSignal,
  ChurnIntervention,
  NRRProjection,
} from "./churn.vm";
export { buildChurnPlaybook, assessChurnRisk } from "./churn.vm";

export type { CopyQAResult, CopyRisk } from "./copy-qa.vm";
export { analyzeCopy } from "./copy-qa.vm";

export {
  parseXlsxFile,
  detectSchema,
  validateDataset,
  analyzeTrends,
} from "./data-import.vm";

export type {
  AiResults,
  HiddenValueDef,
  CompetitorArchetypeDef,
  BuyingCommitteeRoleDef,
  HybridCategoryDef,
  ContraryMetricDef,
  B2CCompetitorArchetypeDef,
  InfluenceNetworkRoleDef,
} from "./differentiation.vm";
export {
  generateDifferentiation,
  scoreClaimVerification,
  buildGapAnalysis,
  buildHiddenValueProfile,
  getTopHiddenValues,
  calculateDifferentiationStrength,
  selectContraryMetrics,
  suggestHybridCategory,
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
} from "./differentiation.vm";

export type {
  StageId,
  ConversationStage,
  DetectedStage,
  StageDetectionReport,
  PrincipleCode,
  PrincipleDefinition,
  PrincipleAgentOutput,
  ConvergenceReport,
  PrincipleScanInput,
  PrincipleScanProgress,
  PrincipleScanResult,
  SupportedFileKind,
  TranscriptExportInput,
  TranscriptWizardStepId,
  TranscriptWizardValidationState,
} from "./differentiation-transcript.vm";
export {
  STAGES,
  getStageById,
  detectStagesInTranscript,
  getStageSnippet,
  PRINCIPLES,
  PRINCIPLES_BY_CODE,
  getPrincipleByCode,
  aggregatePrincipleOutputs,
  runPrincipleScan,
  detectFileKind,
  readFileAsText,
  renderDifferentiationMarkdown,
  renderPlanStage1Markdown,
  downloadDifferentiationMarkdown,
  downloadPlanStage1Markdown,
  isTranscriptWizardStepValid,
  buildDraftFromScanOutputs,
} from "./differentiation-transcript.vm";

export type {
  TrafficLight,
  BriefRisk,
  NRRScenario,
  ActionItem,
  ExecutiveBrief,
  BuildExecutiveBriefInput,
} from "./executive-brief.vm";
export { buildExecutiveBrief } from "./executive-brief.vm";

export type { ExportResult } from "./export.vm";
export { downloadExport } from "./export.vm";

export { generateGuidance, getOverallHealth, computeGaps } from "./guidance.vm";

export type {
  ObjectionHandler,
  PricePresentation,
  FollowUpStep,
  NeuroClosingStrategy,
} from "./neuro-closing.vm";
export { generateClosingStrategy } from "./neuro-closing.vm";

export type {
  NudgeType,
  FoggTriggerStyle,
  BehavioralNudge,
  CORResourceState,
  MotivationState,
  BAEInput,
} from "./behavioral-action.vm";

export type { FeedbackRating } from "./training-data.vm";
export { updateFeedback } from "./training-data.vm";

export type {
  DreamOutcomeLevel,
  TimeToValue,
  EffortLevel,
  SocialProofLevel,
  PricingWizardInput,
  PricingWizardTier,
  PricingWizardRecommendation,
} from "./pricing.vm";
export {
  generatePricingIntelligence,
  DIFFERENTIATOR_OPTIONS,
  computePricingWizardRecommendation,
} from "./pricing.vm";

// ── Pricing wedge: Israeli psychology + experiment loop (2026-05-06) ─────────
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
  IsraeliIndustryBenchmark,
} from "./israeli-pricing.vm";
export {
  SEGMENT_PROFILES,
  VAT_RATE,
  ISRAELI_INDUSTRY_BENCHMARKS,
  getSegmentProfile,
  suggestTashlumim,
  getCalendarTiming,
  frameVAT,
  anchorWithBuffer,
  chooseFraming,
  detectPricingRisks,
  analyzeIsraeliPricing,
  getIsraeliBenchmark,
} from "./israeli-pricing.vm";

export type {
  ExperimentStatus,
  CustomerOutcome,
  PricedProspect,
  PricingExperiment,
  ExperimentResult,
  ExperimentRecommendation,
  NextExperiment,
  PricingConfidenceTier,
} from "./pricing-experiment.vm";
export {
  createExperiment,
  getActiveExperiment,
  getAllExperiments,
  logProspectOutcome,
  abandonExperiment,
  analyzeExperiment,
  proposeNextExperiment,
  getCurrentConfidence,
} from "./pricing-experiment.vm";

export type { AgentInsight } from "./agent-blackboard.vm";
export { runPartialAgents } from "./agent-blackboard.vm";

export {
  assembleQuote,
  generateQuoteFromScratch,
} from "./quote.vm";

export type {
  ReferralData,
  ReferralRecord,
  ReferralReward,
} from "./referral.vm";
export {
  REFERRAL_REWARDS,
  generateReferralCode,
  getReferralData,
  recordReferral,
  markReferralConverted,
  getReferralLink,
  getReferralStats,
} from "./referral.vm";

export { generateRetentionStrategy } from "./retention-growth.vm";

export type {
  DealStageId,
  DealStage,
  SalesForecast,
  ObjectionScript,
  SalesAutomation,
  SalesPipelineResult,
  NeuroVector,
  NeuroClosingFramework,
  BuyerPersonality,
  PersonalityProfile,
} from "./sales-pipeline.vm";
export {
  BUYER_PERSONALITIES,
  detectBuyerPersonality,
  generateSalesPipeline,
  getNeuroClosingFrameworks,
  getSalesTypeLabel,
} from "./sales-pipeline.vm";

export type { StylomeProfile, StylomeSample } from "./stylome.vm";
export {
  analyzeSamples,
  INTERVIEW_QUESTIONS,
} from "./stylome.vm";

export type {
  UVPFormat,
  UVPVariant,
  UVPFormatSet,
  SynthesizeUVPInput,
} from "./uvp-synthesis.vm";
export { synthesizeUVP } from "./uvp-synthesis.vm";

export type {
  ReportOutcome,
  WeeklyHistoryItem,
} from "./weekly-loop.vm";
export {
  deriveLoopState,
  continueCommitment,
  abandonCommitment,
  getWeeklyHistory,
} from "./weekly-loop.vm";

export type {
  PrincipleTrace,
  TracedPrinciple,
  TracedSource,
} from "./moat.vm";
export {
  enrichDifferentiationWithCitations,
  distinctPrinciples,
  getLibrary,
  getSourceRegistry,
  findPrinciple,
  findSource,
  libraryVersion,
} from "./moat.vm";
