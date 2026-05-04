// ViewModel adapter for differentiationPhases engine.
// Components import PHASES and related types from here,
// never directly from @/engine/differentiationPhases.

export type {
  PhaseId,
  PhaseConfig,
  PhaseQuestion,
  DifferentiationFormData,
} from "@/engine/differentiationPhases";

export {
  PHASES,
  getPhaseById,
  getQuestionsForPhase,
} from "@/engine/differentiationPhases";
