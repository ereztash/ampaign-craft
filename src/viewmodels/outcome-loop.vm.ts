// Outcome-loop boundary: re-exports only what components need from outcomeLoopEngine.
// Components must import from here, not from @/engine/outcomeLoopEngine directly.

export type {
  RecommendationSource,
  OutcomeHorizon,
  RecommendationEvent,
  OutcomeReport,
} from "@/engine/outcomeLoopEngine";

export {
  captureRecommendationShown,
  captureVariantPick,
  captureOutcome,
  buildContextSnapshot,
} from "@/engine/outcomeLoopEngine";
