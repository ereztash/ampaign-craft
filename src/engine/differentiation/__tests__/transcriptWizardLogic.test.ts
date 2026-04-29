import { describe, expect, it } from "vitest";
import {
  buildDraftFromScanOutputs,
  isTranscriptWizardStepValid,
} from "../transcriptWizardLogic";
import type { PrincipleAgentOutput } from "../principles";

function makeOutput(overrides: Partial<PrincipleAgentOutput>): PrincipleAgentOutput {
  return {
    principleCode: "P1",
    principleName: "Mechanism Clarity",
    relevanceScore: 8,
    evidenceQuotes: [],
    summaryObservation: "obs",
    differentiationHypothesis: "hyp",
    ...overrides,
  };
}

describe("transcriptWizardLogic", () => {
  it("validates step 2 transcript length rule (>50 chars)", () => {
    const baseState = {
      intake: { clientName: "ACME", differentiationStatus: "none" as const },
      transcript: "a".repeat(50),
      scanOutputs: [] as PrincipleAgentOutput[],
      approvedCodes: new Set<string>(),
      draft: { oneSentence: "", paragraph: "", marketCheck: "" },
    };

    expect(isTranscriptWizardStepValid(2, baseState)).toBe(false);
    expect(isTranscriptWizardStepValid(2, { ...baseState, transcript: "a".repeat(51) })).toBe(true);
  });

  it("validates step 4 requires at least one approved code", () => {
    const state = {
      intake: { clientName: "ACME", differentiationStatus: "none" as const },
      transcript: "valid transcript ".repeat(5),
      scanOutputs: [makeOutput({ principleCode: "P2" })],
      approvedCodes: new Set<string>(),
      draft: { oneSentence: "", paragraph: "", marketCheck: "" },
    };

    expect(isTranscriptWizardStepValid(4, state)).toBe(false);
    expect(isTranscriptWizardStepValid(4, { ...state, approvedCodes: new Set(["P2"]) })).toBe(true);
  });

  it("builds draft from top approved hypotheses in score order", () => {
    const outputs: PrincipleAgentOutput[] = [
      makeOutput({
        principleCode: "P3",
        relevanceScore: 7.2,
        differentiationHypothesis: "Hypothesis C",
      }),
      makeOutput({
        principleCode: "P1",
        relevanceScore: 9.1,
        differentiationHypothesis: "Hypothesis A",
      }),
      makeOutput({
        principleCode: "P2",
        relevanceScore: 8.4,
        differentiationHypothesis: "Hypothesis B",
      }),
    ];

    const draft = buildDraftFromScanOutputs(outputs, new Set(["P1", "P2", "P3"]), "ACME");

    expect(draft.oneSentence).toBe("Hypothesis A");
    expect(draft.paragraph).toBe("Hypothesis A Hypothesis B Hypothesis C");
    expect(draft.marketCheck).toContain("Strong differentiation signal across 3 principles");
  });
});
