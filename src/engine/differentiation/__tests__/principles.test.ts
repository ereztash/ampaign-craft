import { describe, it, expect } from "vitest";
import {
  PRINCIPLES,
  getPrincipleByCode,
  aggregatePrincipleOutputs,
  type PrincipleAgentOutput,
  type PrincipleCode,
} from "../principles";

function makeOutput(
  code: PrincipleCode,
  score: number,
  overrides: Partial<PrincipleAgentOutput> = {},
): PrincipleAgentOutput {
  return {
    principleCode: code,
    principleName: code,
    relevanceScore: score,
    evidenceQuotes: [],
    summaryObservation: "test",
    differentiationHypothesis: "test hypothesis",
    ...overrides,
  };
}

describe("PRINCIPLES constant", () => {
  it("contains exactly 12 principles", () => {
    expect(PRINCIPLES.length).toBe(12);
  });

  it("codes are P1 through P12", () => {
    const codes = PRINCIPLES.map((p) => p.code);
    for (let i = 1; i <= 12; i++) {
      expect(codes).toContain(`P${i}` as PrincipleCode);
    }
  });

  it("all principles have he and en names", () => {
    for (const p of PRINCIPLES) {
      expect(p.name.he.length).toBeGreaterThan(0);
      expect(p.name.en.length).toBeGreaterThan(0);
    }
  });

  it("each principle has at least one scan question", () => {
    for (const p of PRINCIPLES) {
      expect(p.scanQuestions.length).toBeGreaterThan(0);
    }
  });

  it("each principle has a source reference", () => {
    for (const p of PRINCIPLES) {
      expect(typeof p.source).toBe("string");
      expect(p.source.length).toBeGreaterThan(0);
    }
  });
});

describe("getPrincipleByCode", () => {
  it("returns correct principle for P1", () => {
    const p = getPrincipleByCode("P1");
    expect(p?.code).toBe("P1");
    expect(p?.name.en).toBeTruthy();
  });

  it("returns correct principle for P12", () => {
    const p = getPrincipleByCode("P12");
    expect(p?.code).toBe("P12");
  });

  it("returns undefined for unknown code", () => {
    expect(getPrincipleByCode("P99" as PrincipleCode)).toBeUndefined();
  });
});

describe("aggregatePrincipleOutputs", () => {
  it("classifies strong signal when 3+ outputs score >= 8", () => {
    const outputs: PrincipleAgentOutput[] = [
      makeOutput("P1", 9),
      makeOutput("P2", 8),
      makeOutput("P3", 8.5),
      makeOutput("P4", 3),
    ];
    const report = aggregatePrincipleOutputs(outputs);
    expect(report.convergence).toBe("strong");
    expect(report.strongSignals.length).toBe(3);
  });

  it("classifies weak signal when fewer than 3 outputs score >= 8", () => {
    const outputs: PrincipleAgentOutput[] = [
      makeOutput("P1", 8),
      makeOutput("P2", 5),
      makeOutput("P3", 4),
    ];
    const report = aggregatePrincipleOutputs(outputs);
    expect(report.convergence).toBe("weak");
  });

  it("excludes failed outputs from scoring", () => {
    const outputs: PrincipleAgentOutput[] = [
      makeOutput("P1", 9),
      makeOutput("P2", 9),
      makeOutput("P3", 9, { failed: true }),
      makeOutput("P4", 9, { failed: true }),
    ];
    const report = aggregatePrincipleOutputs(outputs);
    // Only 2 valid outputs with score >= 8 → weak
    expect(report.convergence).toBe("weak");
    expect(report.strongSignals.length).toBe(2);
  });

  it("sorts strongSignals by descending score", () => {
    const outputs: PrincipleAgentOutput[] = [
      makeOutput("P1", 8.5),
      makeOutput("P2", 9.5),
      makeOutput("P3", 9.0),
    ];
    const report = aggregatePrincipleOutputs(outputs);
    expect(report.strongSignals[0].relevanceScore).toBe(9.5);
    expect(report.strongSignals[1].relevanceScore).toBe(9.0);
    expect(report.strongSignals[2].relevanceScore).toBe(8.5);
  });

  it("corePrinciples contains codes of all strong signals", () => {
    const outputs: PrincipleAgentOutput[] = [
      makeOutput("P1", 9),
      makeOutput("P2", 8),
      makeOutput("P3", 8.5),
    ];
    const report = aggregatePrincipleOutputs(outputs);
    expect(report.corePrinciples).toContain("P1");
    expect(report.corePrinciples).toContain("P2");
    expect(report.corePrinciples).toContain("P3");
  });

  it("handles all failed outputs gracefully", () => {
    const outputs: PrincipleAgentOutput[] = PRINCIPLES.map((p) =>
      makeOutput(p.code, 0, { failed: true }),
    );
    const report = aggregatePrincipleOutputs(outputs);
    expect(report.convergence).toBe("weak");
    expect(report.strongSignals.length).toBe(0);
    expect(report.corePrinciples.length).toBe(0);
  });

  it("clamps weakSignals to [6,8)", () => {
    const outputs: PrincipleAgentOutput[] = [
      makeOutput("P1", 7.5),
      makeOutput("P2", 6.0),
      makeOutput("P3", 5.9),
    ];
    const report = aggregatePrincipleOutputs(outputs);
    expect(report.weakSignals.length).toBe(2);
    expect(report.belowThreshold.length).toBe(1);
  });
});
