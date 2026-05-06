// Analytics engines boundary: re-exports types and functions that components
// need from the analytics/intelligence engine layer.
// Components import from here, never from these engines directly.

export type { CompoundingLoss, CostOfInaction } from "@/engine/costOfInactionEngine";
export { calculateCostOfInaction } from "@/engine/costOfInactionEngine";

export type { CLGResult, CLGWeek, CLGMetric } from "@/engine/clgEngine";
export { generateCLGStrategy } from "@/engine/clgEngine";

export type { FlywheelStep, RetentionFlywheel } from "@/engine/retentionFlywheelEngine";
export { generateRetentionFlywheel } from "@/engine/retentionFlywheelEngine";

export { personalizeResult } from "@/engine/funnelEngine";

export type { HormoziDimension, HormoziValueResult } from "@/engine/hormoziValueEngine";
export { calculateValueScore } from "@/engine/hormoziValueEngine";

export type {
  ActionSignal,
  ReflectiveContext,
  ActionCard,
} from "@/engine/optimization/reflectiveAction";
export { generateReflectiveAction } from "@/engine/optimization/reflectiveAction";

export type {
  EmotionType,
  EmotionalBalance,
  ChannelEPS,
  EPSResult,
} from "@/engine/emotionalPerformanceEngine";
export { calculateEPS, getEPSVerdict } from "@/engine/emotionalPerformanceEngine";

export type {
  Industry,
  CrossDomainInsight,
  CrossDomainReport,
} from "@/engine/crossDomainBenchmarkEngine";
export { generateCrossDomainInsights } from "@/engine/crossDomainBenchmarkEngine";

export type {
  ContentLanguage,
  ChannelName,
  ChannelFitScore,
  PredictiveContentScore,
} from "@/engine/predictiveContentScoreEngine";
export { getPredictiveContentVerdict } from "@/engine/predictiveContentScoreEngine";

export type {
  CohortId,
  CohortCharacteristic,
  CohortStrategy,
  BehavioralCohort,
  CohortAssignment,
} from "@/engine/behavioralCohortEngine";
export { assignToCohort } from "@/engine/behavioralCohortEngine";
