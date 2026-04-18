import { describe, it, expect, vi, beforeEach } from "vitest";
import { metaAgent } from "../metaAgent";
import { Blackboard } from "../../blackboardStore";

// ── Mock logger (used in blackboardStore) ─────────────────────────────────
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

// ── Mock ontologicalVerifier (used in blackboardStore.verifiedSet) ─────────
vi.mock("@/engine/blackboard/ontologicalVerifier", () => ({
  verifyWrite: vi.fn(() => ({ ok: true })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────
function makeBoard() {
  return new Blackboard();
}

function makeFormData() {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45] as [number, number],
    interests: "marketing",
    productDescription: "SaaS platform for marketing automation",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook"],
    experienceLevel: "intermediate",
  };
}

function makeHealthScore(overall = 80) {
  return {
    overall,
    dimensions: { budgetBalance: 80, channelDiversity: 80, kpiRealism: 80, funnelCompleteness: 80 },
    grade: "B",
    warnings: [],
    recommendations: [],
  };
}

function makeHormoziValue(overallScore = 75) {
  return {
    overallScore,
    dreamOutcome: { he: "", en: "" },
    perceivedLikelihood: 70,
    timeDelay: { he: "", en: "" },
    effortSacrifice: { he: "", en: "" },
    offer: { he: "", en: "" },
    priceJustification: { he: "", en: "" },
    bonuses: [],
    guarantee: { he: "", en: "" },
    scarcity: { he: "", en: "" },
  };
}

function makeChurnRisk(riskTier: "healthy" | "watch" | "at-risk" | "critical" = "watch") {
  return {
    riskScore: 30,
    riskTier,
    signals: [],
    recommendations: [],
    projectedChurnRate: 0.1,
    confidenceLevel: 0.8,
  };
}

describe("metaAgent", () => {
  // ── Metadata ──────────────────────────────────────────────────────────────
  describe("Agent metadata", () => {
    it("has the correct name", () => {
      expect(metaAgent.name).toBe("metaAgent");
    });

    it("depends on all known pipeline agents", () => {
      const deps = metaAgent.dependencies;
      expect(deps).toContain("knowledgeGraph");
      expect(deps).toContain("funnel");
      expect(deps).toContain("disc");
      expect(deps).toContain("hormozi");
      expect(deps).toContain("closing");
      expect(deps).toContain("coi");
      expect(deps).toContain("retention");
      expect(deps).toContain("health");
    });

    it("depends on QA pipeline agents", () => {
      const deps = metaAgent.dependencies;
      expect(deps).toContain("qaStatic");
      expect(deps).toContain("qaContent");
      expect(deps).toContain("qaSecurity");
      expect(deps).toContain("qaOrchestrator");
    });

    it("writes to metaMetrics section", () => {
      expect(metaAgent.writes).toContain("metaMetrics");
    });
  });

  // ── Execution ─────────────────────────────────────────────────────────────
  describe("Successful execution", () => {
    it("writes metaMetrics to board", () => {
      const board = makeBoard();

      metaAgent.run(board);

      expect(board.get("metaMetrics")).not.toBeNull();
    });

    it("metaMetrics has all required top-level fields", () => {
      const board = makeBoard();
      metaAgent.run(board);

      const metrics = board.get("metaMetrics");
      expect(metrics).toHaveProperty("cycleId");
      expect(metrics).toHaveProperty("evaluatedAt");
      expect(metrics).toHaveProperty("cycleDurationMs");
      expect(metrics).toHaveProperty("systemRejectionRate");
      expect(metrics).toHaveProperty("jGradient");
      expect(metrics).toHaveProperty("avgHalfLifeMs");
      expect(metrics).toHaveProperty("perAgent");
      expect(metrics).toHaveProperty("flaggedAgents");
      expect(metrics).toHaveProperty("aarrrHealth");
    });

    it("cycleId is a string (ms timestamp)", () => {
      const board = makeBoard();
      metaAgent.run(board);
      const metrics = board.get("metaMetrics");
      expect(typeof metrics?.cycleId).toBe("string");
      expect(isFinite(Number(metrics?.cycleId))).toBe(true);
    });

    it("evaluatedAt is a positive number (unix ms)", () => {
      const board = makeBoard();
      metaAgent.run(board);
      const metrics = board.get("metaMetrics");
      expect(metrics?.evaluatedAt).toBeGreaterThan(0);
    });

    it("cycleDurationMs is non-negative", () => {
      const board = makeBoard();
      metaAgent.run(board);
      const metrics = board.get("metaMetrics");
      expect(metrics?.cycleDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Rejection rate ────────────────────────────────────────────────────────
  describe("System rejection rate", () => {
    it("systemRejectionRate is 0 when no writes have been attempted", () => {
      const board = makeBoard();
      metaAgent.run(board);
      const metrics = board.get("metaMetrics");
      expect(metrics?.systemRejectionRate).toBe(0);
    });

    it("jGradient is 1 when systemRejectionRate is 0", () => {
      const board = makeBoard();
      metaAgent.run(board);
      const metrics = board.get("metaMetrics");
      expect(metrics?.jGradient).toBe(1);
    });

    it("jGradient + systemRejectionRate = 1", () => {
      const board = makeBoard();
      metaAgent.run(board);
      const metrics = board.get("metaMetrics");
      expect(metrics!.jGradient + metrics!.systemRejectionRate).toBeCloseTo(1);
    });
  });

  // ── Half-life ─────────────────────────────────────────────────────────────
  describe("Semantic half-life", () => {
    it("avgHalfLifeMs is null when no overwrites have occurred", () => {
      const board = makeBoard();
      metaAgent.run(board);
      const metrics = board.get("metaMetrics");
      expect(metrics?.avgHalfLifeMs).toBeNull();
    });
  });

  // ── Per-agent stats ───────────────────────────────────────────────────────
  describe("Per-agent stats", () => {
    it("perAgent is an empty array when no verifiedSet calls were made", () => {
      const board = makeBoard();
      metaAgent.run(board);
      const metrics = board.get("metaMetrics");
      expect(Array.isArray(metrics?.perAgent)).toBe(true);
      expect(metrics?.perAgent).toHaveLength(0);
    });

    it("flaggedAgents is empty when no writes were rejected", () => {
      const board = makeBoard();
      metaAgent.run(board);
      const metrics = board.get("metaMetrics");
      expect(Array.isArray(metrics?.flaggedAgents)).toBe(true);
      expect(metrics?.flaggedAgents).toHaveLength(0);
    });
  });

  // ── AARRR health ──────────────────────────────────────────────────────────
  describe("AARRR health score", () => {
    it("aarrrHealth has all five stage scores", () => {
      const board = makeBoard();
      metaAgent.run(board);
      const metrics = board.get("metaMetrics");
      const health = metrics?.aarrrHealth;
      expect(health).toHaveProperty("overall");
      expect(health).toHaveProperty("acquisition");
      expect(health).toHaveProperty("activation");
      expect(health).toHaveProperty("retention");
      expect(health).toHaveProperty("revenue");
      expect(health).toHaveProperty("referral");
    });

    it("aarrrHealth.computedFrom is an array of strings", () => {
      const board = makeBoard();
      metaAgent.run(board);
      const metrics = board.get("metaMetrics");
      expect(Array.isArray(metrics?.aarrrHealth?.computedFrom)).toBe(true);
    });

    it("all stage scores are >= 0", () => {
      const board = makeBoard();
      metaAgent.run(board);
      const health = board.get("metaMetrics")?.aarrrHealth;
      const scores = [health!.overall, health!.acquisition, health!.activation, health!.retention, health!.revenue, health!.referral];
      for (const s of scores) {
        expect(s).toBeGreaterThanOrEqual(0);
      }
    });

    it("acquisition increases when formData is present", () => {
      const boardWithoutData = makeBoard();
      metaAgent.run(boardWithoutData);
      const withoutAcquisition = boardWithoutData.get("metaMetrics")?.aarrrHealth?.acquisition;

      const boardWithData = makeBoard();
      boardWithData.set("formData", makeFormData() as any);
      metaAgent.run(boardWithData);
      const withAcquisition = boardWithData.get("metaMetrics")?.aarrrHealth?.acquisition;

      expect(withAcquisition).toBeGreaterThan(withoutAcquisition!);
    });

    it("activation increases when funnelResult is present", () => {
      const boardWithout = makeBoard();
      metaAgent.run(boardWithout);
      const without = boardWithout.get("metaMetrics")?.aarrrHealth?.activation;

      const boardWith = makeBoard();
      boardWith.set("funnelResult", { stages: [], totalBudget: 0, formData: {} as any } as any);
      metaAgent.run(boardWith);
      const with_ = boardWith.get("metaMetrics")?.aarrrHealth?.activation;

      expect(with_).toBeGreaterThan(without!);
    });

    it("retention increases when retentionFlywheel is present", () => {
      const boardWithout = makeBoard();
      metaAgent.run(boardWithout);
      const without = boardWithout.get("metaMetrics")?.aarrrHealth?.retention;

      const boardWith = makeBoard();
      boardWith.set("retentionFlywheel", { stages: [], flywheelScore: 0, projectedChurnReduction: 0, topRisks: [], keyActions: [] } as any);
      metaAgent.run(boardWith);
      const with_ = boardWith.get("metaMetrics")?.aarrrHealth?.retention;

      expect(with_).toBeGreaterThan(without!);
    });

    it("churnRisk healthy tier gives max retention bonus", () => {
      const boardHealthy = makeBoard();
      boardHealthy.set("retentionFlywheel", { stages: [], flywheelScore: 0, projectedChurnReduction: 0, topRisks: [], keyActions: [] } as any);
      boardHealthy.set("churnRisk", makeChurnRisk("healthy") as any);
      metaAgent.run(boardHealthy);
      const healthyRetention = boardHealthy.get("metaMetrics")?.aarrrHealth?.retention;

      const boardAtRisk = makeBoard();
      boardAtRisk.set("retentionFlywheel", { stages: [], flywheelScore: 0, projectedChurnReduction: 0, topRisks: [], keyActions: [] } as any);
      boardAtRisk.set("churnRisk", makeChurnRisk("at-risk") as any);
      metaAgent.run(boardAtRisk);
      const atRiskRetention = boardAtRisk.get("metaMetrics")?.aarrrHealth?.retention;

      expect(healthyRetention).toBeGreaterThan(atRiskRetention!);
    });

    it("revenue increases when hormoziValue is present", () => {
      const boardWithout = makeBoard();
      metaAgent.run(boardWithout);
      const without = boardWithout.get("metaMetrics")?.aarrrHealth?.revenue;

      const boardWith = makeBoard();
      boardWith.set("hormoziValue", makeHormoziValue(80) as any);
      metaAgent.run(boardWith);
      const with_ = boardWith.get("metaMetrics")?.aarrrHealth?.revenue;

      expect(with_).toBeGreaterThan(without!);
    });

    it("stage scores are capped at 110", () => {
      // Fill board with all positive signals to hit max
      const board = makeBoard();
      board.set("formData", makeFormData() as any);
      board.set("knowledgeGraph", {} as any);
      board.set("funnelResult", { stages: [], totalBudget: 0, formData: {} as any } as any);
      board.set("healthScore", makeHealthScore(100) as any);
      board.set("discProfile", {} as any);
      board.set("retentionFlywheel", { stages: [], flywheelScore: 0, projectedChurnReduction: 0, topRisks: [], keyActions: [] } as any);
      board.set("churnRisk", makeChurnRisk("healthy") as any);
      board.set("hormoziValue", makeHormoziValue(100) as any);
      board.set("costOfInaction", {} as any);
      metaAgent.run(board);
      const health = board.get("metaMetrics")?.aarrrHealth;
      const scores = [health!.acquisition, health!.activation, health!.retention, health!.revenue, health!.referral];
      for (const s of scores) {
        expect(s).toBeLessThanOrEqual(110);
      }
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────────
  describe("Idempotency", () => {
    it("can run multiple times and overwrites metaMetrics", () => {
      const board = makeBoard();

      metaAgent.run(board);
      const first = board.get("metaMetrics");

      metaAgent.run(board);
      const second = board.get("metaMetrics");

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
    });
  });
});
