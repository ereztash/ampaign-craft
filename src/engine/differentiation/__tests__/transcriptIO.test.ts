import { describe, it, expect } from "vitest";
import {
  detectFileKind,
  renderDifferentiationMarkdown,
  renderPlanStage1Markdown,
  _internal,
} from "../transcriptIO";
import type { TranscriptExportInput } from "../transcriptIO";
import { detectStagesInTranscript } from "../conversationStages";
import { aggregatePrincipleOutputs, PRINCIPLES } from "../principles";
import type { PrincipleAgentOutput } from "../principles";

function makeOutput(code: string, score: number): PrincipleAgentOutput {
  return {
    principleCode: code as PrincipleAgentOutput["principleCode"],
    principleName: code,
    relevanceScore: score,
    evidenceQuotes: [`Evidence for ${code}`],
    summaryObservation: `Observation for ${code}`,
    differentiationHypothesis: `Hypothesis for ${code}`,
  };
}

function makeExportInput(overrides: Partial<TranscriptExportInput> = {}): TranscriptExportInput {
  const transcript = "במשפט אחד: תמשיג. אני קורא לזה Method X.";
  const stageReport = detectStagesInTranscript(transcript);
  const principleOutputs = PRINCIPLES.slice(0, 4).map((p, i) =>
    makeOutput(p.code, i < 3 ? 8.5 : 5),
  );
  const convergence = aggregatePrincipleOutputs(principleOutputs);
  return {
    clientName: "Acme Corp",
    industry: "SaaS",
    differentiationStatus: "weak",
    transcript,
    stageReport,
    principleOutputs,
    convergence,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("detectFileKind", () => {
  const makeFile = (name: string, type = "") =>
    new File([""], name, { type });

  it("detects .docx", () => expect(detectFileKind(makeFile("doc.docx"))).toBe("docx"));
  it("detects .md", () => expect(detectFileKind(makeFile("note.md"))).toBe("md"));
  it("detects .txt", () => expect(detectFileKind(makeFile("file.txt"))).toBe("txt"));
  it("detects txt by MIME type", () =>
    expect(detectFileKind(makeFile("noext", "text/plain"))).toBe("txt"));
  it("returns null for unsupported", () =>
    expect(detectFileKind(makeFile("file.pdf"))).toBeNull());
});

describe("slugify (_internal)", () => {
  const { slugify } = _internal;
  it("replaces spaces with hyphens", () => {
    expect(slugify("Acme Corp")).toBe("Acme-Corp");
  });
  it("removes unsafe filename characters", () => {
    expect(slugify("Client: ABC/DEF")).toBe("Client-ABC-DEF");
  });
  it("collapses multiple hyphens", () => {
    expect(slugify("A  B")).toBe("A-B");
  });
  it("caps at 80 chars", () => {
    const long = "A".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });
});

describe("renderDifferentiationMarkdown", () => {
  it("includes YAML frontmatter", () => {
    const md = renderDifferentiationMarkdown(makeExportInput());
    expect(md).toMatch(/^---/);
    expect(md).toMatch(/client:/);
    expect(md).toMatch(/tags: \[differentiation, client\]/);
  });

  it("includes the client name in heading", () => {
    const md = renderDifferentiationMarkdown(makeExportInput());
    expect(md).toContain("# Differentiation — Acme Corp");
  });

  it("includes convergence summary section", () => {
    const md = renderDifferentiationMarkdown(makeExportInput());
    expect(md).toContain("## Convergence Summary");
  });

  it("includes principle scan table with all 12 rows", () => {
    const md = renderDifferentiationMarkdown(makeExportInput());
    for (const p of PRINCIPLES) {
      expect(md).toContain(p.code);
    }
  });

  it("includes stage coverage section", () => {
    const md = renderDifferentiationMarkdown(makeExportInput());
    expect(md).toContain("## Conversation Stage Coverage");
  });

  it("includes differentiation draft when provided", () => {
    const md = renderDifferentiationMarkdown(
      makeExportInput({
        differentiationDraft: {
          oneSentence: "We help consultants scale.",
          paragraph: "Extended paragraph here.",
          marketCheck: "Market check notes.",
        },
      }),
    );
    expect(md).toContain("## Differentiation Draft");
    expect(md).toContain("We help consultants scale.");
  });
});

describe("renderPlanStage1Markdown", () => {
  it("has correct YAML stage field", () => {
    const md = renderPlanStage1Markdown(makeExportInput());
    expect(md).toContain("stage: 1");
  });

  it("contains next steps checklist", () => {
    const md = renderPlanStage1Markdown(makeExportInput());
    expect(md).toContain("- [ ]");
  });

  it("lists core principles when convergence is strong", () => {
    const outputs = PRINCIPLES.slice(0, 3).map((p) => makeOutput(p.code, 9));
    const convergence = aggregatePrincipleOutputs(outputs);
    const md = renderPlanStage1Markdown(
      makeExportInput({ principleOutputs: outputs, convergence }),
    );
    expect(md).toContain(PRINCIPLES[0].code);
  });
});
