import { describe, it, expect } from "vitest";
import {
  STAGES,
  detectStagesInTranscript,
  getStageSnippet,
  getStageById,
  type StageId,
} from "../conversationStages";

describe("STAGES constant", () => {
  it("contains exactly 14 stages", () => {
    expect(STAGES.length).toBe(14);
  });

  it("stages are numbered 1-14 in order", () => {
    STAGES.forEach((stage, i) => {
      expect(stage.number).toBe(i + 1);
    });
  });

  it("CLIENT_NAMING_MOMENT is marked critical", () => {
    const stage = STAGES.find((s) => s.id === "CLIENT_NAMING_MOMENT");
    expect(stage?.critical).toBe(true);
  });

  it("all stages have he and en names", () => {
    for (const stage of STAGES) {
      expect(stage.name.he.length).toBeGreaterThan(0);
      expect(stage.name.en.length).toBeGreaterThan(0);
    }
  });

  it("all stages have at least one detection pattern in each language", () => {
    for (const stage of STAGES) {
      expect(stage.detectionPatterns.he.length).toBeGreaterThan(0);
      expect(stage.detectionPatterns.en.length).toBeGreaterThan(0);
    }
  });
});

describe("getStageById", () => {
  it("returns the correct stage", () => {
    const stage = getStageById("FRAME_RESET");
    expect(stage?.id).toBe("FRAME_RESET");
    expect(stage?.number).toBe(1);
  });

  it("returns undefined for unknown id", () => {
    expect(getStageById("UNKNOWN_STAGE" as StageId)).toBeUndefined();
  });
});

describe("detectStagesInTranscript", () => {
  it("returns 14 entries in detectedStages", () => {
    const report = detectStagesInTranscript("empty transcript");
    expect(report.detectedStages.length).toBe(14);
  });

  it("coverage is 0 for empty transcript", () => {
    const report = detectStagesInTranscript("");
    expect(report.coverage).toBe(0);
  });

  it("detects COMPRESSION_DEMAND when 'במשפט אחד' appears", () => {
    const transcript = "בסדר, תמשיג את זה במשפט אחד בדיוק.";
    const report = detectStagesInTranscript(transcript);
    const stage = report.detectedStages.find((d) => d.stageId === "COMPRESSION_DEMAND");
    expect(stage?.detected).toBe(true);
    expect(stage?.matchedPhrases.length).toBeGreaterThan(0);
  });

  it("detects COMPRESSION_DEMAND in English", () => {
    const transcript = "Try to summarize this in one sentence if you can.";
    const report = detectStagesInTranscript(transcript);
    const stage = report.detectedStages.find((d) => d.stageId === "COMPRESSION_DEMAND");
    expect(stage?.detected).toBe(true);
  });

  it("detects CLIENT_NAMING_MOMENT", () => {
    const transcript = "אני קורא לזה 'שיטת הפרק הפתוח'.";
    const report = detectStagesInTranscript(transcript);
    const stage = report.detectedStages.find((d) => d.stageId === "CLIENT_NAMING_MOMENT");
    expect(stage?.detected).toBe(true);
  });

  it("detects META_OBSERVATION", () => {
    const transcript = "תקן אותי אם אני טועה, אבל אני רואה דפוס.";
    const report = detectStagesInTranscript(transcript);
    const stage = report.detectedStages.find((d) => d.stageId === "META_OBSERVATION");
    expect(stage?.detected).toBe(true);
  });

  it("places CLIENT_NAMING_MOMENT in criticalMissing when absent", () => {
    const report = detectStagesInTranscript("no naming here");
    expect(report.criticalMissing).toContain("CLIENT_NAMING_MOMENT");
  });

  it("does NOT place CLIENT_NAMING_MOMENT in criticalMissing when present", () => {
    const report = detectStagesInTranscript("i call it The Open Chapter Method");
    expect(report.criticalMissing).not.toContain("CLIENT_NAMING_MOMENT");
  });

  it("coverage equals detected / 14", () => {
    const transcript =
      "במשפט אחד: תמשיג. " +
      "תקן אותי אם טועה. " +
      "אני קורא לזה Method X. " +
      "ולפני זה מה היה? " +
      "מה מניע אותך לעבוד?";
    const report = detectStagesInTranscript(transcript);
    const expectedCoverage = report.detectedStages.filter((d) => d.detected).length / 14;
    expect(report.coverage).toBeCloseTo(expectedCoverage, 5);
  });
});

describe("getStageSnippet", () => {
  it("returns null for undetected stage", () => {
    const snippet = getStageSnippet("no relevant content here", "FRAME_RESET");
    expect(snippet).toBeNull();
  });

  it("returns a string with surrounding context for detected stage", () => {
    const transcript = "We discussed the product. Then I said: within one sentence please. Moving on.";
    const snippet = getStageSnippet(transcript, "COMPRESSION_DEMAND");
    expect(snippet).not.toBeNull();
    expect(typeof snippet).toBe("string");
    expect(snippet!.length).toBeGreaterThan(0);
  });
});
