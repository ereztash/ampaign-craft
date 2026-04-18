import { describe, it, expect, vi } from "vitest";
import { qaOrchestratorAgent, computeOverallScore } from "../qaOrchestratorAgent";
import { Blackboard } from "../../blackboardStore";
import type { QAStaticResult, QAContentResult, QASecurityResult, QAFinding } from "@/types/qa";

// ── Helpers ───────────────────────────────────────────────────────────────
function makeBoard() {
  return new Blackboard();
}

function makeFinding(overrides: Partial<QAFinding> = {}): QAFinding {
  return {
    id: "f-1",
    category: "completeness",
    severity: "warning",
    message: { he: "בעיה", en: "Issue" },
    autoFixable: false,
    ...overrides,
  };
}

function makeStaticResult(overrides: Partial<QAStaticResult> = {}): QAStaticResult {
  return {
    findings: [],
    budgetValid: true,
    kpisRealistic: true,
    fieldsComplete: true,
    score: 90,
    ...overrides,
  };
}

function makeContentResult(overrides: Partial<QAContentResult> = {}): QAContentResult {
  return {
    findings: [],
    culturalScore: 85,
    brandConsistency: 80,
    ctaClarity: 88,
    hebrewQuality: 90,
    overallScore: 86,
    ...overrides,
  };
}

function makeSecurityResult(overrides: Partial<QASecurityResult> = {}): QASecurityResult {
  return {
    findings: [],
    piiDetected: false,
    injectionRisks: 0,
    unsafeTemplates: 0,
    score: 100,
    ...overrides,
  };
}

describe("qaOrchestratorAgent", () => {
  // ── Agent metadata ────────────────────────────────────────────────────────
  describe("Agent metadata", () => {
    it("has the correct name", () => {
      expect(qaOrchestratorAgent.name).toBe("qaOrchestrator");
    });

    it("depends on qaStatic agent", () => {
      expect(qaOrchestratorAgent.dependencies).toContain("qaStatic");
    });

    it("depends on qaContent agent", () => {
      expect(qaOrchestratorAgent.dependencies).toContain("qaContent");
    });

    it("depends on qaSecurity agent", () => {
      expect(qaOrchestratorAgent.dependencies).toContain("qaSecurity");
    });

    it("writes to qaOverallScore section", () => {
      expect(qaOrchestratorAgent.writes).toContain("qaOverallScore");
    });
  });

  // ── Board integration ─────────────────────────────────────────────────────
  describe("Board integration", () => {
    it("writes qaOverallScore even when all sub-results are null", () => {
      const board = makeBoard();

      qaOrchestratorAgent.run(board);

      expect(board.get("qaOverallScore")).not.toBeNull();
    });

    it("writes qaOverallScore when all sub-results are present", () => {
      const board = makeBoard();
      board.set("qaStaticResult", makeStaticResult());
      board.set("qaContentResult", makeContentResult() as any);
      board.set("qaSecurityResult", makeSecurityResult());

      qaOrchestratorAgent.run(board);

      expect(board.get("qaOverallScore")).not.toBeNull();
    });

    it("overall score has all required fields", () => {
      const board = makeBoard();

      qaOrchestratorAgent.run(board);

      const score = board.get("qaOverallScore");
      expect(score).toHaveProperty("staticScore");
      expect(score).toHaveProperty("contentScore");
      expect(score).toHaveProperty("securityScore");
      expect(score).toHaveProperty("overallScore");
      expect(score).toHaveProperty("grade");
      expect(score).toHaveProperty("totalFindings");
      expect(score).toHaveProperty("criticalFindings");
      expect(score).toHaveProperty("recommendations");
    });
  });
});

// ── Pure function: computeOverallScore ────────────────────────────────────
describe("computeOverallScore", () => {
  describe("Score calculation", () => {
    it("uses default scores when all inputs are null", () => {
      const result = computeOverallScore(null, null, null);
      // static=70, content=70, security=100 → 70*0.35 + 70*0.40 + 100*0.25 = 24.5+28+25 = 77.5 → 78
      expect(result.overallScore).toBe(78);
    });

    it("computes weighted average correctly", () => {
      const result = computeOverallScore(
        makeStaticResult({ score: 100 }),
        makeContentResult({ overallScore: 100 }),
        makeSecurityResult({ score: 100 })
      );
      expect(result.overallScore).toBe(100);
    });

    it("uses partial weights when only static is provided", () => {
      const result = computeOverallScore(
        makeStaticResult({ score: 100 }),
        null,
        null
      );
      // static=100, content=70 (default), security=100 (default)
      // 100*0.35 + 70*0.40 + 100*0.25 = 35 + 28 + 25 = 88
      expect(result.overallScore).toBe(88);
    });

    it("staticScore in result matches input", () => {
      const result = computeOverallScore(makeStaticResult({ score: 80 }), null, null);
      expect(result.staticScore).toBe(80);
    });

    it("contentScore in result matches input", () => {
      const result = computeOverallScore(null, makeContentResult({ overallScore: 75 }), null);
      expect(result.contentScore).toBe(75);
    });

    it("securityScore in result matches input", () => {
      const result = computeOverallScore(null, null, makeSecurityResult({ score: 95 }));
      expect(result.securityScore).toBe(95);
    });

    it("defaults security score to 100 (assume safe if not scanned)", () => {
      const result = computeOverallScore(null, null, null);
      expect(result.securityScore).toBe(100);
    });
  });

  describe("Grade assignment", () => {
    it("assigns grade A for score >= 90", () => {
      const result = computeOverallScore(
        makeStaticResult({ score: 100 }),
        makeContentResult({ overallScore: 100 }),
        makeSecurityResult({ score: 100 })
      );
      expect(result.grade).toBe("A");
    });

    it("assigns grade B for score 80-89", () => {
      const result = computeOverallScore(
        makeStaticResult({ score: 80 }),
        makeContentResult({ overallScore: 80 }),
        makeSecurityResult({ score: 80 })
      );
      expect(result.grade).toBe("B");
    });

    it("assigns grade C for score 70-79", () => {
      const result = computeOverallScore(
        makeStaticResult({ score: 70 }),
        makeContentResult({ overallScore: 70 }),
        makeSecurityResult({ score: 70 })
      );
      expect(result.grade).toBe("C");
    });

    it("assigns grade D for score 55-69", () => {
      const result = computeOverallScore(
        makeStaticResult({ score: 55 }),
        makeContentResult({ overallScore: 55 }),
        makeSecurityResult({ score: 55 })
      );
      expect(result.grade).toBe("D");
    });

    it("assigns grade F for score < 55", () => {
      const result = computeOverallScore(
        makeStaticResult({ score: 30 }),
        makeContentResult({ overallScore: 30 }),
        makeSecurityResult({ score: 30 })
      );
      expect(result.grade).toBe("F");
    });

    it("caps grade at C when there are critical security findings, even if base grade is A", () => {
      const criticalSecurityFinding = makeFinding({
        category: "security",
        severity: "critical",
      });
      const result = computeOverallScore(
        makeStaticResult({ score: 100 }),
        makeContentResult({ overallScore: 100 }),
        makeSecurityResult({ score: 100, findings: [criticalSecurityFinding] })
      );
      // overallScore = 100 → base grade A, but critical security → capped at C
      expect(result.grade).toBe("C");
    });

    it("does NOT cap grade when critical finding is non-security (e.g., budget)", () => {
      const criticalBudgetFinding = makeFinding({
        category: "budget",
        severity: "critical",
      });
      const result = computeOverallScore(
        makeStaticResult({ score: 100, findings: [criticalBudgetFinding] }),
        makeContentResult({ overallScore: 100 }),
        makeSecurityResult({ score: 100 })
      );
      expect(result.grade).toBe("A");
    });
  });

  describe("Findings aggregation", () => {
    it("totalFindings is sum of all sub-result findings", () => {
      const result = computeOverallScore(
        makeStaticResult({ findings: [makeFinding({ id: "s1" }), makeFinding({ id: "s2" })] }),
        makeContentResult({ findings: [makeFinding({ id: "c1" })] }),
        makeSecurityResult({ findings: [] })
      );
      expect(result.totalFindings).toBe(3);
    });

    it("criticalFindings counts only critical severity", () => {
      const result = computeOverallScore(
        makeStaticResult({ findings: [makeFinding({ id: "s1", severity: "critical" })] }),
        makeContentResult({ findings: [makeFinding({ id: "c1", severity: "warning" })] }),
        makeSecurityResult({ findings: [makeFinding({ id: "sec1", severity: "critical" })] })
      );
      expect(result.criticalFindings).toBe(2);
    });

    it("totalFindings is 0 when all inputs are null", () => {
      const result = computeOverallScore(null, null, null);
      expect(result.totalFindings).toBe(0);
    });
  });

  describe("Pass threshold", () => {
    it("passedAt is ISO timestamp when score >= 70 and no critical findings", () => {
      const result = computeOverallScore(
        makeStaticResult({ score: 85 }),
        makeContentResult({ overallScore: 85 }),
        makeSecurityResult({ score: 100 })
      );
      expect(result.passedAt).not.toBeNull();
      expect(result.passedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("passedAt is null when score < 70", () => {
      const result = computeOverallScore(
        makeStaticResult({ score: 40 }),
        makeContentResult({ overallScore: 40 }),
        makeSecurityResult({ score: 40 })
      );
      expect(result.passedAt).toBeNull();
    });

    it("passedAt is null when score >= 70 but has critical findings", () => {
      const result = computeOverallScore(
        makeStaticResult({
          score: 85,
          findings: [makeFinding({ id: "s1", severity: "critical" })],
        }),
        makeContentResult({ overallScore: 85 }),
        makeSecurityResult({ score: 100 })
      );
      expect(result.passedAt).toBeNull();
    });
  });

  describe("Recommendations generation", () => {
    it("returns empty recommendations for perfect inputs", () => {
      const result = computeOverallScore(
        makeStaticResult({ score: 100, budgetValid: true, kpisRealistic: true, fieldsComplete: true }),
        makeContentResult({ overallScore: 100, culturalScore: 100, hebrewQuality: 100, ctaClarity: 100 }),
        makeSecurityResult({ score: 100, piiDetected: false, injectionRisks: 0, unsafeTemplates: 0 })
      );
      expect(result.recommendations).toHaveLength(0);
    });

    it("adds budget recommendation when budgetValid is false", () => {
      const result = computeOverallScore(
        makeStaticResult({ budgetValid: false }),
        null,
        null
      );
      const budgetRec = result.recommendations.find((r) => r.en.includes("budget"));
      expect(budgetRec).toBeDefined();
    });

    it("adds KPI recommendation when kpisRealistic is false", () => {
      const result = computeOverallScore(
        makeStaticResult({ kpisRealistic: false }),
        null,
        null
      );
      const kpiRec = result.recommendations.find((r) => r.en.includes("KPI"));
      expect(kpiRec).toBeDefined();
    });

    it("adds completeness recommendation when fieldsComplete is false", () => {
      const result = computeOverallScore(
        makeStaticResult({ fieldsComplete: false }),
        null,
        null
      );
      const completenessRec = result.recommendations.find((r) => r.en.includes("required fields"));
      expect(completenessRec).toBeDefined();
    });

    it("adds cultural recommendation when culturalScore < 70", () => {
      const result = computeOverallScore(
        null,
        makeContentResult({ culturalScore: 50 }),
        null
      );
      const culturalRec = result.recommendations.find((r) => r.en.includes("cultural fit"));
      expect(culturalRec).toBeDefined();
    });

    it("adds Hebrew quality recommendation when hebrewQuality < 70", () => {
      const result = computeOverallScore(
        null,
        makeContentResult({ hebrewQuality: 60 }),
        null
      );
      const hebrewRec = result.recommendations.find((r) => r.en.includes("Hebrew quality"));
      expect(hebrewRec).toBeDefined();
    });

    it("adds CTA recommendation when ctaClarity < 70", () => {
      const result = computeOverallScore(
        null,
        makeContentResult({ ctaClarity: 55 }),
        null
      );
      const ctaRec = result.recommendations.find((r) => r.en.includes("calls to action"));
      expect(ctaRec).toBeDefined();
    });

    it("adds PII recommendation when piiDetected is true", () => {
      const result = computeOverallScore(
        null,
        null,
        makeSecurityResult({ piiDetected: true })
      );
      const piiRec = result.recommendations.find((r) => r.en.includes("PII"));
      expect(piiRec).toBeDefined();
    });

    it("adds injection risk recommendation when injectionRisks > 0", () => {
      const result = computeOverallScore(
        null,
        null,
        makeSecurityResult({ injectionRisks: 2 })
      );
      const injRec = result.recommendations.find((r) => r.en.includes("unsafe code patterns"));
      expect(injRec).toBeDefined();
    });

    it("adds unsafe template recommendation when unsafeTemplates > 0", () => {
      const result = computeOverallScore(
        null,
        null,
        makeSecurityResult({ unsafeTemplates: 1 })
      );
      const tplRec = result.recommendations.find((r) => r.en.includes("templates"));
      expect(tplRec).toBeDefined();
    });

    it("recommendations have he and en fields", () => {
      const result = computeOverallScore(
        makeStaticResult({ budgetValid: false }),
        null,
        null
      );
      for (const rec of result.recommendations) {
        expect(rec).toHaveProperty("he");
        expect(rec).toHaveProperty("en");
        expect(typeof rec.he).toBe("string");
        expect(typeof rec.en).toBe("string");
      }
    });
  });
});
