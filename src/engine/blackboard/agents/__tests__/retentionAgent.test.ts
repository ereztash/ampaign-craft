import { describe, it, expect, vi } from "vitest";
import { retentionAgent } from "../retentionAgent";
import { Blackboard } from "../../blackboardStore";

// ── Mock the retention & churn engines ───────────────────────────────────
vi.mock("@/engine/retentionFlywheelEngine", () => ({
  generateRetentionFlywheel: vi.fn(() => ({
    stages: [
      {
        id: "onboarding",
        name: { he: "קליטה", en: "Onboarding" },
        actions: [{ he: "שלח אימייל ברוכים הבאים", en: "Send welcome email" }],
        goal: { he: "הפעלת לקוח", en: "Customer activation" },
        metric: "activationRate",
        targetValue: 70,
      },
      {
        id: "engagement",
        name: { he: "מעורבות", en: "Engagement" },
        actions: [{ he: "שלח תוכן שימושי", en: "Send useful content" }],
        goal: { he: "שמירה על מעורבות", en: "Maintain engagement" },
        metric: "dau",
        targetValue: 60,
      },
    ],
    flywheelScore: 72,
    projectedChurnReduction: 15,
    topRisks: [{ he: "חוסר שימוש", en: "Non-usage" }],
    keyActions: [{ he: "שלח תזכורות", en: "Send reminders" }],
  })),
}));

vi.mock("@/engine/churnPredictionEngine", () => ({
  assessChurnRisk: vi.fn(() => ({
    riskScore: 28,
    riskTier: "watch",
    signals: [
      { signal: "low engagement", weight: 0.4, present: true },
      { signal: "price sensitivity", weight: 0.3, present: false },
    ],
    recommendations: [
      { he: "שפר מעורבות", en: "Improve engagement" },
    ],
    projectedChurnRate: 0.12,
    confidenceLevel: 0.8,
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────
function makeBoard() {
  return new Blackboard();
}

function makeFormData(overrides = {}) {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45] as [number, number],
    interests: "marketing",
    productDescription: "SaaS platform for marketing automation",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "loyalty",
    existingChannels: ["facebook", "email"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

describe("retentionAgent", () => {
  // ── Metadata ──────────────────────────────────────────────────────────────
  describe("Agent metadata", () => {
    it("has the correct name", () => {
      expect(retentionAgent.name).toBe("retention");
    });

    it("has no dependencies (root agent)", () => {
      expect(retentionAgent.dependencies).toEqual([]);
    });

    it("writes to retentionFlywheel section", () => {
      expect(retentionAgent.writes).toContain("retentionFlywheel");
    });

    it("writes to churnRisk section", () => {
      expect(retentionAgent.writes).toContain("churnRisk");
    });
  });

  // ── Happy-path ────────────────────────────────────────────────────────────
  describe("Successful execution", () => {
    it("writes retentionFlywheel to board when formData is present", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      retentionAgent.run(board);

      expect(board.get("retentionFlywheel")).not.toBeNull();
    });

    it("writes churnRisk to board when formData is present", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      retentionAgent.run(board);

      expect(board.get("churnRisk")).not.toBeNull();
    });

    it("retentionFlywheel has stages array", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      retentionAgent.run(board);

      const flywheel = board.get("retentionFlywheel");
      expect(Array.isArray(flywheel?.stages)).toBe(true);
      expect(flywheel!.stages.length).toBeGreaterThan(0);
    });

    it("retentionFlywheel has flywheelScore as a number", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      retentionAgent.run(board);

      const flywheel = board.get("retentionFlywheel");
      expect(typeof flywheel?.flywheelScore).toBe("number");
    });

    it("churnRisk has riskTier field", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      retentionAgent.run(board);

      const risk = board.get("churnRisk");
      expect(["healthy", "watch", "at-risk", "critical"]).toContain(risk?.riskTier);
    });

    it("churnRisk has riskScore as a number", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      retentionAgent.run(board);

      const risk = board.get("churnRisk");
      expect(typeof risk?.riskScore).toBe("number");
    });

    it("calls generateRetentionFlywheel with formData", async () => {
      const { generateRetentionFlywheel } = await import("@/engine/retentionFlywheelEngine");
      const board = makeBoard();
      const fd = makeFormData();
      board.set("formData", fd as any);

      retentionAgent.run(board);

      expect(generateRetentionFlywheel).toHaveBeenCalledWith(fd);
    });

    it("calls assessChurnRisk with formData", async () => {
      const { assessChurnRisk } = await import("@/engine/churnPredictionEngine");
      const board = makeBoard();
      const fd = makeFormData();
      board.set("formData", fd as any);

      retentionAgent.run(board);

      expect(assessChurnRisk).toHaveBeenCalledWith(fd);
    });
  });

  // ── Guard clauses ─────────────────────────────────────────────────────────
  describe("Guard clauses", () => {
    it("does nothing when formData is missing", () => {
      const board = makeBoard();

      retentionAgent.run(board);

      expect(board.get("retentionFlywheel")).toBeNull();
      expect(board.get("churnRisk")).toBeNull();
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────────
  describe("Idempotency", () => {
    it("overwrites both outputs on re-run", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      retentionAgent.run(board);
      const firstFlywheel = board.get("retentionFlywheel");
      const firstRisk = board.get("churnRisk");

      retentionAgent.run(board);
      const secondFlywheel = board.get("retentionFlywheel");
      const secondRisk = board.get("churnRisk");

      expect(firstFlywheel).not.toBeNull();
      expect(secondFlywheel).not.toBeNull();
      expect(firstRisk).not.toBeNull();
      expect(secondRisk).not.toBeNull();
    });
  });

  // ── Data quality ──────────────────────────────────────────────────────────
  describe("Data quality", () => {
    it("churnRisk signals is an array", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      retentionAgent.run(board);

      const risk = board.get("churnRisk");
      expect(Array.isArray(risk?.signals)).toBe(true);
    });

    it("churnRisk recommendations is an array", () => {
      const board = makeBoard();
      board.set("formData", makeFormData() as any);

      retentionAgent.run(board);

      const risk = board.get("churnRisk");
      expect(Array.isArray(risk?.recommendations)).toBe(true);
    });
  });
});
