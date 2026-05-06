// ─── Differentiation ViewModel ───────────────────────────────────────────────
// Thin re-exports from differentiation engine modules.
// Components import from here; never directly from @/engine/*.

export { generateDifferentiation } from "@/engine/differentiationEngine";
export type { AiResults } from "@/engine/differentiationEngine";

export {
  BUYING_COMMITTEE_ROLES,
  COMPETITOR_ARCHETYPES,
  HIDDEN_VALUES,
} from "@/engine/differentiationKnowledge";

export {
  STAGES,
  detectStagesInTranscript,
} from "@/engine/differentiation/conversationStages";
export type { StageDetectionReport } from "@/engine/differentiation/conversationStages";

export {
  buildDraftFromScanOutputs,
  isTranscriptWizardStepValid,
} from "@/engine/differentiation/transcriptWizardLogic";
export type { TranscriptWizardStepId } from "@/engine/differentiation/transcriptWizardLogic";

export {
  downloadDifferentiationMarkdown,
  downloadPlanStage1Markdown,
  readFileAsText,
} from "@/engine/differentiation/transcriptIO";

export { PRINCIPLES_BY_CODE } from "@/engine/differentiation/principles";
export type {
  ConvergenceReport,
  PrincipleAgentOutput,
} from "@/engine/differentiation/principles";

export { runPrincipleScan } from "@/engine/differentiation/principleAgents";

export { synthesizeUVP } from "@/engine/uvpSynthesisEngine";
export type { UVPVariant } from "@/engine/uvpSynthesisEngine";
