import { PRINCIPLES_BY_CODE, type PrincipleAgentOutput } from "./principles";

export type TranscriptWizardStepId = 1 | 2 | 3 | 4 | 5 | 6;

type DifferentiationStatus = "none" | "weak" | "working" | "strong";

export interface TranscriptWizardValidationState {
  intake: { clientName: string; differentiationStatus?: DifferentiationStatus };
  transcript: string;
  scanOutputs: PrincipleAgentOutput[];
  approvedCodes: Set<string>;
  draft: { oneSentence: string };
}

/**
 * Rule 1 (from CLAUDE.md): strict step-by-step validation.
 * Keep this pure so it can be tested independently from React/UI concerns.
 */
export function isTranscriptWizardStepValid(
  step: TranscriptWizardStepId,
  state: TranscriptWizardValidationState,
): boolean {
  if (step === 1) return state.intake.clientName.trim().length > 0 && state.intake.differentiationStatus !== undefined;
  if (step === 2) return state.transcript.trim().length > 50;
  if (step === 3) return state.scanOutputs.length > 0;
  if (step === 4) return state.approvedCodes.size >= 1;
  if (step === 5) return state.draft.oneSentence.trim().length > 0;
  return true;
}

/**
 * Build a draft summary from approved principle agent outputs.
 * Pure function to reduce component complexity and allow deterministic tests.
 */
export function buildDraftFromScanOutputs(
  outputs: PrincipleAgentOutput[],
  approvedCodes: Set<string>,
  clientName: string,
): { oneSentence: string; paragraph: string; marketCheck: string } {
  const approved = outputs.filter((o) => approvedCodes.has(o.principleCode) && !o.failed);
  const topHypotheses = approved
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3)
    .map((o) => o.differentiationHypothesis)
    .filter(Boolean);

  const topQuotes = approved
    .flatMap((o) => o.evidenceQuotes)
    .slice(0, 2);

  const principleNames = approved
    .slice(0, 3)
    .map((o) => {
      const def = PRINCIPLES_BY_CODE.get(o.principleCode);
      return def?.name.en ?? o.principleCode;
    });

  const oneSentence = topHypotheses[0] ||
    `${clientName} differentiates through ${principleNames.join(", ")}.`;

  const paragraph = topHypotheses.length > 1
    ? topHypotheses.join(" ")
    : `${oneSentence} ${topQuotes.join(" ")}`.trim();

  const marketCheck = approved.length >= 3
    ? `Strong differentiation signal across ${approved.length} principles. Ready for market positioning.`
    : `Partial signal (${approved.length} approved principles). Consider strengthening evidence before market positioning.`;

  return { oneSentence, paragraph, marketCheck };
}
