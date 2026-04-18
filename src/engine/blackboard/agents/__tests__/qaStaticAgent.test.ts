import { describe, it, expect } from "vitest";
import { qaStaticAgent, runStaticAnalysis } from "../qaStaticAgent";
import { Blackboard } from "../../blackboardStore";
import type { FormData } from "@/types/funnel";
import type { FunnelResult } from "@/types/funnel";

// ── Helpers ───────────────────────────────────────────────────────────────
function makeBoard() {
  return new Blackboard();
}

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "marketing automation",
    productDescription: "SaaS platform for marketing automation that helps businesses grow",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "instagram"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeFunnelResult(overrides: Partial<FunnelResult> = {}): FunnelResult {
  return {
    funnelName: { he: "משפך מכירות", en: "Sales Funnel" },
    stages: [
      {
        id: "awareness",
        name: { he: "מודעות", en: "Awareness" },
        budgetPercent: 40,
        channels: [
          {
            channel: "facebook",
            name: { he: "פייסבוק", en: "Facebook" },
            budgetPercent: 60,
            kpis: [{ he: "חשיפות", en: "Impressions" }],
            tips: [],
          },
        ],
        description: { he: "שלב מודעות", en: "Awareness stage" },
      },
      {
        id: "conversion",
        name: { he: "המרה", en: "Conversion" },
        budgetPercent: 60,
        channels: [],
        description: { he: "שלב המרה", en: "Conversion stage" },
      },
    ],
    totalBudget: 6000,
    formData: makeFormData(),
    hookTips: [],
    overallTips: [],
    copyLab: undefined,
    ...overrides,
  } as FunnelResult;
}

describe("qaStaticAgent", () => {
  // ── Agent metadata ────────────────────────────────────────────────────────
  describe("Agent metadata", () => {
    it("has the correct name", () => {
      expect(qaStaticAgent.name).toBe("qaStatic");
    });

    it("depends on funnel agent", () => {
      expect(qaStaticAgent.dependencies).toContain("funnel");
    });

    it("writes to qaStaticResult section", () => {
      expect(qaStaticAgent.writes).toContain("qaStaticResult");
    });
  });

  // ── Guard clauses ─────────────────────────────────────────────────────────
  describe("Guard clauses", () => {
    it("does nothing when formData is missing", () => {
      const board = makeBoard();
      board.set("funnelResult", makeFunnelResult() as any);

      qaStaticAgent.run(board);

      expect(board.get("qaStaticResult")).toBeNull();
    });

    it("does nothing when funnelResult is missing", () => {
      const board = makeBoard();
      board.set("formData", makeFormData());

      qaStaticAgent.run(board);

      expect(board.get("qaStaticResult")).toBeNull();
    });

    it("does nothing when both are missing", () => {
      const board = makeBoard();

      qaStaticAgent.run(board);

      expect(board.get("qaStaticResult")).toBeNull();
    });
  });

  // ── Board integration ─────────────────────────────────────────────────────
  describe("Board integration", () => {
    it("writes qaStaticResult when both formData and funnelResult are present", () => {
      const board = makeBoard();
      board.set("formData", makeFormData());
      board.set("funnelResult", makeFunnelResult() as any);

      qaStaticAgent.run(board);

      expect(board.get("qaStaticResult")).not.toBeNull();
    });

    it("result has findings array", () => {
      const board = makeBoard();
      board.set("formData", makeFormData());
      board.set("funnelResult", makeFunnelResult() as any);

      qaStaticAgent.run(board);

      const result = board.get("qaStaticResult");
      expect(Array.isArray(result?.findings)).toBe(true);
    });

    it("result has score between 0 and 100", () => {
      const board = makeBoard();
      board.set("formData", makeFormData());
      board.set("funnelResult", makeFunnelResult() as any);

      qaStaticAgent.run(board);

      const result = board.get("qaStaticResult");
      expect(result!.score).toBeGreaterThanOrEqual(0);
      expect(result!.score).toBeLessThanOrEqual(100);
    });
  });
});

// ── Pure function: runStaticAnalysis ──────────────────────────────────────
describe("runStaticAnalysis", () => {
  describe("Budget validation", () => {
    it("marks budget as valid when percentages sum to 100", () => {
      const fd = makeFormData();
      const result = runStaticAnalysis(fd, makeFunnelResult());
      expect(result.budgetValid).toBe(true);
    });

    it("marks budget as invalid when stage percentages deviate more than 5% from 100", () => {
      const funnel = makeFunnelResult({
        stages: [
          {
            id: "s1",
            name: { he: "שלב 1", en: "Stage 1" },
            budgetPercent: 20,
            channels: [],
            description: { he: "", en: "" },
          },
          {
            id: "s2",
            name: { he: "שלב 2", en: "Stage 2" },
            budgetPercent: 20,
            channels: [],
            description: { he: "", en: "" },
          },
        ],
      });
      const result = runStaticAnalysis(makeFormData(), funnel);
      expect(result.budgetValid).toBe(false);
    });

    it("flags zero-budget stages that have channels", () => {
      const funnel = makeFunnelResult({
        stages: [
          {
            id: "s1",
            name: { he: "שלב 1", en: "Stage 1" },
            budgetPercent: 0,
            channels: [
              {
                channel: "facebook",
                name: { he: "פייסבוק", en: "Facebook" },
                budgetPercent: 100,
                kpis: [],
                tips: [],
              },
            ],
            description: { he: "", en: "" },
          },
          {
            id: "s2",
            name: { he: "שלב 2", en: "Stage 2" },
            budgetPercent: 100,
            channels: [],
            description: { he: "", en: "" },
          },
        ],
      });
      const result = runStaticAnalysis(makeFormData(), funnel);
      const budgetFindings = result.findings.filter((f) => f.category === "budget");
      expect(budgetFindings.length).toBeGreaterThan(0);
    });

    it("does not flag zero-budget stages with no channels", () => {
      const funnel = makeFunnelResult({
        stages: [
          {
            id: "s1",
            name: { he: "שלב 1", en: "Stage 1" },
            budgetPercent: 60,
            channels: [],
            description: { he: "", en: "" },
          },
          {
            id: "s2",
            name: { he: "שלב 2", en: "Stage 2" },
            budgetPercent: 40,
            channels: [],
            description: { he: "", en: "" },
          },
        ],
      });
      const result = runStaticAnalysis(makeFormData(), funnel);
      const zeroBudgetFindings = result.findings.filter(
        (f) => f.category === "budget" && f.message.en.includes("0% budget")
      );
      expect(zeroBudgetFindings.length).toBe(0);
    });
  });

  describe("Field completeness validation", () => {
    it("returns fieldsComplete true when all required fields are present", () => {
      const result = runStaticAnalysis(makeFormData(), makeFunnelResult());
      expect(result.fieldsComplete).toBe(true);
    });

    it("marks fieldsComplete false when businessField is missing", () => {
      const fd = makeFormData({ businessField: "" });
      const result = runStaticAnalysis(fd, makeFunnelResult());
      expect(result.fieldsComplete).toBe(false);
    });

    it("marks fieldsComplete false when audienceType is missing", () => {
      const fd = makeFormData({ audienceType: "" });
      const result = runStaticAnalysis(fd, makeFunnelResult());
      expect(result.fieldsComplete).toBe(false);
    });

    it("marks fieldsComplete false when mainGoal is missing", () => {
      const fd = makeFormData({ mainGoal: "" });
      const result = runStaticAnalysis(fd, makeFunnelResult());
      expect(result.fieldsComplete).toBe(false);
    });

    it("marks fieldsComplete false when budgetRange is missing", () => {
      const fd = makeFormData({ budgetRange: "" });
      const result = runStaticAnalysis(fd, makeFunnelResult());
      expect(result.fieldsComplete).toBe(false);
    });

    it("adds a completeness critical finding for missing businessField", () => {
      const fd = makeFormData({ businessField: "" });
      const result = runStaticAnalysis(fd, makeFunnelResult());
      const missing = result.findings.filter(
        (f) => f.category === "completeness" && f.severity === "critical"
      );
      expect(missing.length).toBeGreaterThan(0);
    });

    it("adds a completeness warning when productDescription is too short", () => {
      const fd = makeFormData({ productDescription: "Short" });
      const result = runStaticAnalysis(fd, makeFunnelResult());
      const shortDesc = result.findings.filter(
        (f) => f.category === "completeness" && f.severity === "warning"
      );
      expect(shortDesc.length).toBeGreaterThan(0);
    });
  });

  describe("Consistency checks", () => {
    it("flags b2b with tiktok channel as info finding", () => {
      const fd = makeFormData({ audienceType: "b2b", existingChannels: ["tiktok" as any] });
      const result = runStaticAnalysis(fd, makeFunnelResult());
      const consistency = result.findings.filter((f) => f.category === "consistency");
      expect(consistency.length).toBeGreaterThan(0);
    });

    it("flags high budget + beginner experience as warning", () => {
      const fd = makeFormData({ budgetRange: "high", experienceLevel: "beginner" });
      const result = runStaticAnalysis(fd, makeFunnelResult());
      const warning = result.findings.filter(
        (f) => f.category === "consistency" && f.severity === "warning"
      );
      expect(warning.length).toBeGreaterThan(0);
    });

    it("flags subscription model without loyalty goal as info", () => {
      const fd = makeFormData({ salesModel: "subscription", mainGoal: "sales" });
      const result = runStaticAnalysis(fd, makeFunnelResult());
      const info = result.findings.filter(
        (f) => f.category === "consistency" && f.severity === "info"
      );
      expect(info.length).toBeGreaterThan(0);
    });

    it("does NOT flag subscription model when mainGoal is loyalty", () => {
      const fd = makeFormData({ salesModel: "subscription", mainGoal: "loyalty" });
      const result = runStaticAnalysis(fd, makeFunnelResult());
      const subscriptionInfo = result.findings.filter(
        (f) =>
          f.category === "consistency" &&
          f.message.en.includes("Subscription model without retention focus")
      );
      expect(subscriptionInfo.length).toBe(0);
    });
  });

  describe("Score calculation", () => {
    it("returns a score object with numeric score", () => {
      const result = runStaticAnalysis(makeFormData(), makeFunnelResult());
      expect(typeof result.score).toBe("number");
    });

    it("score decreases when there are critical findings", () => {
      const perfectFd = makeFormData();
      const perfectResult = runStaticAnalysis(perfectFd, makeFunnelResult());

      const badFd = makeFormData({
        businessField: "",
        audienceType: "",
        mainGoal: "",
        budgetRange: "",
      });
      const badResult = runStaticAnalysis(badFd, makeFunnelResult());

      expect(badResult.score).toBeLessThan(perfectResult.score);
    });

    it("score is never negative", () => {
      const fd = makeFormData({
        businessField: "",
        audienceType: "",
        mainGoal: "",
        budgetRange: "",
        productDescription: "x",
        experienceLevel: "beginner",
        budgetRange: "high",
      } as any);
      const result = runStaticAnalysis(fd, makeFunnelResult());
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it("score is at most 100 for a clean input", () => {
      const result = runStaticAnalysis(makeFormData(), makeFunnelResult());
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe("Finding structure", () => {
    it("each finding has required fields", () => {
      const fd = makeFormData({ businessField: "" });
      const result = runStaticAnalysis(fd, makeFunnelResult());
      for (const finding of result.findings) {
        expect(finding).toHaveProperty("id");
        expect(finding).toHaveProperty("category");
        expect(finding).toHaveProperty("severity");
        expect(finding).toHaveProperty("message");
        expect(finding.message).toHaveProperty("he");
        expect(finding.message).toHaveProperty("en");
        expect(typeof finding.autoFixable).toBe("boolean");
      }
    });

    it("finding IDs are unique", () => {
      const fd = makeFormData({
        businessField: "",
        audienceType: "",
        mainGoal: "",
        budgetRange: "",
      });
      const result = runStaticAnalysis(fd, makeFunnelResult());
      const ids = result.findings.map((f) => f.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it("all severities are valid values", () => {
      const fd = makeFormData({ businessField: "" });
      const result = runStaticAnalysis(fd, makeFunnelResult());
      for (const finding of result.findings) {
        expect(["critical", "warning", "info"]).toContain(finding.severity);
      }
    });
  });
});
