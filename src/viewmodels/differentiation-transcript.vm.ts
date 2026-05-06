// Differentiation-transcript boundary: re-exports for DifferentiationTranscriptWizard.
// Components must import from here, not from @/engine/differentiation/*.

export type {
  StageId,
  ConversationStage,
  DetectedStage,
  StageDetectionReport,
} from "@/engine/differentiation/conversationStages";
export {
  STAGES,
  getStageById,
  detectStagesInTranscript,
  getStageSnippet,
} from "@/engine/differentiation/conversationStages";

export type {
  PrincipleCode,
  PrincipleDefinition,
  PrincipleAgentOutput,
  ConvergenceReport,
} from "@/engine/differentiation/principles";
export {
  PRINCIPLES,
  PRINCIPLES_BY_CODE,
  getPrincipleByCode,
  aggregatePrincipleOutputs,
} from "@/engine/differentiation/principles";

export type {
  PrincipleScanInput,
  PrincipleScanProgress,
  PrincipleScanResult,
} from "@/engine/differentiation/principleAgents";
export { runPrincipleScan } from "@/engine/differentiation/principleAgents";

export type { SupportedFileKind, TranscriptExportInput } from "@/engine/differentiation/transcriptIO";
export {
  detectFileKind,
  readFileAsText,
  renderDifferentiationMarkdown,
  renderPlanStage1Markdown,
  downloadDifferentiationMarkdown,
  downloadPlanStage1Markdown,
} from "@/engine/differentiation/transcriptIO";

export type {
  TranscriptWizardStepId,
  TranscriptWizardValidationState,
} from "@/engine/differentiation/transcriptWizardLogic";
export {
  isTranscriptWizardStepValid,
  buildDraftFromScanOutputs,
} from "@/engine/differentiation/transcriptWizardLogic";
