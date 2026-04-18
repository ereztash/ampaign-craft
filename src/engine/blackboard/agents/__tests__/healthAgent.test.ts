import { describe, it, expect, vi } from "vitest";
import { healthAgent } from "../healthAgent";
import { Blackboard } from "../../blackboardStore";

// ── Mock the health score engine ──────────────────────────────────────────
vi.mock("@/engine/healthScoreEngine", () => ({
  calculateHealthScore: vi.fn(() => ({
    overall: 78,
    dimensions: {
      budgetBalance: 85,
      channelDiversity: 70,
      kpiRealism: 80,
      funnelCompleteness: 75,
    },
    grade: "B",
    warnings: [],
    recommendations: [
      { he: "שפר גיוון ערוצים", en: "Improve channel diversity" },
    ],
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────
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
    formData: {} as any,
    hookTips: [],
    overallTips: [],
    ...overrides,
  };
}

describe("healthAgent", () => {
  // ── Metadata ──────────────────────────────────────────────────────────────
  describe("Agent metadata", () => {
    it("has the correct name", () => {
      expect(healthAgent.name).toBe("health");
    });

    it("depends on funnel agent", () => {
      expect(healthAgent.dependencies).toContain("funnel");
    });

    it("writes to healthScore section", () => {
      expect(healthAgent.writes).toContain("healthScore");
    });
  });

  // ── Happy-path ────────────────────────────────────────────────────────────
  describe("Successful execution", () => {
    it("writes healthScore to board when funnelResult is present", () => {
      const board = makeBoard();
      board.set("funnelResult", makeFunnelResult() as any);

      healthAgent.run(board);

      expect(board.get("healthScore")).not.toBeNull();
    });

    it("produces healthScore with overall numeric field", () => {
      const board = makeBoard();
      board.set("funnelResult", makeFunnelResult() as any);

      healthAgent.run(board);

      const score = board.get("healthScore");
      expect(typeof score?.overall).toBe("number");
    });

    it("produces healthScore with grade field", () => {
      const board = makeBoard();
      board.set("funnelResult", makeFunnelResult() as any);

      healthAgent.run(board);

      const score = board.get("healthScore");
      expect(score).toHaveProperty("grade");
      expect(["A", "B", "C", "D", "F"]).toContain(score?.grade);
    });

    it("produces healthScore with recommendations array", () => {
      const board = makeBoard();
      board.set("funnelResult", makeFunnelResult() as any);

      healthAgent.run(board);

      const score = board.get("healthScore");
      expect(Array.isArray(score?.recommendations)).toBe(true);
    });

    it("calls calculateHealthScore with the funnelResult", async () => {
      const { calculateHealthScore } = await import("@/engine/healthScoreEngine");
      const board = makeBoard();
      const funnel = makeFunnelResult();
      board.set("funnelResult", funnel as any);

      healthAgent.run(board);

      expect(calculateHealthScore).toHaveBeenCalledWith(funnel);
    });

    it("overall score is between 0 and 100", () => {
      const board = makeBoard();
      board.set("funnelResult", makeFunnelResult() as any);

      healthAgent.run(board);

      const score = board.get("healthScore");
      expect(score!.overall).toBeGreaterThanOrEqual(0);
      expect(score!.overall).toBeLessThanOrEqual(100);
    });
  });

  // ── Guard clauses ─────────────────────────────────────────────────────────
  describe("Guard clauses", () => {
    it("does nothing when funnelResult is missing", () => {
      const board = makeBoard();

      healthAgent.run(board);

      expect(board.get("healthScore")).toBeNull();
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────────
  describe("Idempotency", () => {
    it("can run multiple times and overwrites previous result", () => {
      const board = makeBoard();
      board.set("funnelResult", makeFunnelResult() as any);

      healthAgent.run(board);
      const first = board.get("healthScore");

      healthAgent.run(board);
      const second = board.get("healthScore");

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
    });
  });
});
