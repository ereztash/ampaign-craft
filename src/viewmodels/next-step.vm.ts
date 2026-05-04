// Next-step + pulse + knowledge-graph boundary: re-exports types and functions
// that components need from these engines.

export type { NextStep } from "@/engine/nextStepEngine";
export { getRecommendedNextStep } from "@/engine/nextStepEngine";

export type {
  PulseAction,
  LossFramedMessage,
  WeeklyPulse,
} from "@/engine/pulseEngine";

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
} from "@/engine/userKnowledgeGraph";
export {
  buildUserKnowledgeGraph,
  loadChatInsights,
  loadImportedDataSignals,
  loadMetaSignals,
} from "@/engine/userKnowledgeGraph";
