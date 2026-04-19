import { describe, it, expect, vi, beforeEach } from "vitest";
import { coiAgent } from "../coiAgent";
import { Blackboard } from "../../blackboardStore";

// ── Mock the cost-of-inaction engine ─────────────────────────────────────
vi.mock("@/engine/costOfInactionEngine", () => ({
  calculateCostOfInaction: vi.fn(() => ({
    monthlyWaste: 1800,
    annualWaste: 21600,
    unrealizedLeads: 36,
    unrealizedRevenue: 1080,
    lossFramedMessage: { he: "אתה מפסיד ₪1,800 בחודש", en: "You are losing ₪1,800 per month" },
    comparisonMessage: { he: "המתחרים שלך מקדימים אותך", en: "Your competitors are ahead" },
    urgencyMessage: { he: "כל יום שעובר עולה לך ₪60", en: "Every day that passes costs you ₪60" },
    improvementPercent: 25,
    competitorGapMessage: { he: "פער תחרותי גדל", en: "Competitive gap widening" },
    compoundingLoss: { threeMonth: 5400, sixMonth: 10800, twelveMonth: 21600 },
  })),
}));

// ── Helper ────────────────────────────────────────────────────────────────
function makeBoard() {
  return new Blackboard();
}

function makeFunnelResult(overrides = {}) {
  return {
    funnelName: { he: "משפך מכירות", en: "Sales Funnel" },
    stages: [
      {
        id: "awareness",
        name: { he: "מודעות", en: "Awareness" },
        budgetPercent: 40,
        channels: [],
        description: { he: "שלב המודעות", en: "Awareness stage" },
      },
    ],
    totalBudget: 6000,
    formData: {
      businessField: "tech",
      audienceType: "b2c",
      ageRange: [25, 45],
      interests: "marketing",
      productDescription: "SaaS platform",
      averagePrice: 200,
      salesModel: "subscription",
      budgetRange: "medium",
      mainGoal: "sales",
      existingChannels: ["facebook"],
      experienceLevel: "intermediate",
    },
    ...overrides,
  };
}

describe("coiAgent", () => {
  // ── Metadata ─────────────────────────────────────────────────────────────
  describe("Agent metadata", () => {
    it("has the correct name", () => {
      expect(coiAgent.name).toBe("coi");
    });

    it("depends on funnel agent", () => {
      expect(coiAgent.dependencies).toContain("funnel");
    });

    it("writes to costOfInaction section", () => {
      expect(coiAgent.writes).toContain("costOfInaction");
    });
  });

  // ── Happy-path ────────────────────────────────────────────────────────────
  describe("Successful execution", () => {
    it("writes costOfInaction to the board when funnelResult is present", () => {
      const board = makeBoard();
      board.set("funnelResult", makeFunnelResult() as any);

      coiAgent.run(board);

      expect(board.get("costOfInaction")).not.toBeNull();
    });

    it("produces a costOfInaction object with all required fields", () => {
      const board = makeBoard();
      board.set("funnelResult", makeFunnelResult() as any);

      coiAgent.run(board);

      const coi = board.get("costOfInaction");
      expect(coi).toHaveProperty("monthlyWaste");
      expect(coi).toHaveProperty("annualWaste");
      expect(coi).toHaveProperty("unrealizedLeads");
      expect(coi).toHaveProperty("unrealizedRevenue");
      expect(coi).toHaveProperty("lossFramedMessage");
      expect(coi).toHaveProperty("compoundingLoss");
    });

    it("compoundingLoss has three-month, six-month, and twelve-month projections", () => {
      const board = makeBoard();
      board.set("funnelResult", makeFunnelResult() as any);

      coiAgent.run(board);

      const coi = board.get("costOfInaction");
      expect(coi?.compoundingLoss).toHaveProperty("threeMonth");
      expect(coi?.compoundingLoss).toHaveProperty("sixMonth");
      expect(coi?.compoundingLoss).toHaveProperty("twelveMonth");
    });

    it("calls calculateCostOfInaction with the funnel result", async () => {
      const { calculateCostOfInaction } = await import("@/engine/costOfInactionEngine");
      const board = makeBoard();
      const funnel = makeFunnelResult();
      board.set("funnelResult", funnel as any);

      coiAgent.run(board);

      expect(calculateCostOfInaction).toHaveBeenCalledWith(funnel);
    });
  });

  // ── Guard clauses ─────────────────────────────────────────────────────────
  describe("Guard clauses", () => {
    it("does nothing when funnelResult is missing", () => {
      const board = makeBoard();

      coiAgent.run(board);

      expect(board.get("costOfInaction")).toBeNull();
    });
  });

  // ── Numeric integrity ─────────────────────────────────────────────────────
  describe("Numeric integrity", () => {
    it("annualWaste equals twelve times monthlyWaste", () => {
      const board = makeBoard();
      board.set("funnelResult", makeFunnelResult() as any);

      coiAgent.run(board);

      const coi = board.get("costOfInaction");
      // The mock returns fixed values — verify the engine was called and values are consistent.
      expect(coi?.annualWaste).toBe(coi!.monthlyWaste * 12);
    });
  });
});
