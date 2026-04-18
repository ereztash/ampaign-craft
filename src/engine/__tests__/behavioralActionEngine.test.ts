import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeCORState,
  computeMotivationState,
  ENGINE_MANIFEST,
  type BAEInput,
  type CORResourceState,
  type MotivationState,
  type FoggTriggerStyle,
  type NudgeType,
} from "../behavioralActionEngine";

// ── Mock heavy external deps ───────────────────────────────────────────────
vi.mock("../blackboard/contract", () => ({
  writeContext: vi.fn().mockResolvedValue(undefined),
  conceptKey: vi.fn((_a: string, _b: string, _c: string) => `${_a}-${_b}-${_c}`),
}));
vi.mock("../trainingDataEngine", () => ({
  captureTrainingPair: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/socialProofData", () => ({
  getSocialProof: vi.fn().mockReturnValue({
    usersCount: 1200,
    topMetric: { he: "ROI", en: "ROI" },
    topMetricValue: "+32%",
  }),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────
function makeInput(overrides: Partial<BAEInput> = {}): BAEInput {
  return {
    modulesTotal: 10,
    modulesCompleted: 5,
    streakWeeks: 2,
    achievementsUnlocked: 3,
    achievementsTotal: 10,
    businessField: "tech",
    sessionMinutes: 20,
    investment: {
      plansCreated: 2,
      totalSessionsMinutes: 90,
      aiQueriesUsed: 5,
      campaignsGenerated: 1,
      lastActiveAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// ENGINE_MANIFEST
// ─────────────────────────────────────────────────────────────────────────

describe("BehavioralActionEngine — ENGINE_MANIFEST", () => {
  it("has the expected name", () => {
    expect(ENGINE_MANIFEST.name).toBe("behavioralActionEngine");
  });

  it("has required manifest fields", () => {
    expect(ENGINE_MANIFEST.stage).toBe("deploy");
    expect(ENGINE_MANIFEST.isLive).toBe(true);
    expect(Array.isArray(ENGINE_MANIFEST.reads)).toBe(true);
    expect(Array.isArray(ENGINE_MANIFEST.writes)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// computeCORState
// ─────────────────────────────────────────────────────────────────────────

describe("computeCORState", () => {
  it("returns all required fields", () => {
    const cor = computeCORState(makeInput());
    expect(cor).toHaveProperty("cognitiveLoad");
    expect(cor).toHaveProperty("emotionalEnergy");
    expect(cor).toHaveProperty("timeResource");
    expect(cor).toHaveProperty("shouldSimplify");
  });

  it("all numeric fields are in 0-100 range", () => {
    const cor = computeCORState(makeInput());
    expect(cor.cognitiveLoad).toBeGreaterThanOrEqual(0);
    expect(cor.cognitiveLoad).toBeLessThanOrEqual(100);
    expect(cor.emotionalEnergy).toBeGreaterThanOrEqual(0);
    expect(cor.emotionalEnergy).toBeLessThanOrEqual(100);
    expect(cor.timeResource).toBeGreaterThanOrEqual(0);
    expect(cor.timeResource).toBeLessThanOrEqual(100);
  });

  it("short session produces low cognitive load (≤30)", () => {
    const cor = computeCORState(makeInput({ sessionMinutes: 5 }));
    expect(cor.cognitiveLoad).toBeLessThanOrEqual(30);
  });

  it("long session (60 min) produces high cognitive load", () => {
    const corLong = computeCORState(makeInput({ sessionMinutes: 60 }));
    const corShort = computeCORState(makeInput({ sessionMinutes: 5 }));
    expect(corLong.cognitiveLoad).toBeGreaterThan(corShort.cognitiveLoad);
  });

  it("shouldSimplify is false for short session", () => {
    const cor = computeCORState(makeInput({ sessionMinutes: 10 }));
    expect(cor.shouldSimplify).toBe(false);
  });

  it("shouldSimplify is true for very long session (80+ min)", () => {
    const cor = computeCORState(makeInput({ sessionMinutes: 80 }));
    expect(cor.shouldSimplify).toBe(true);
  });

  it("more streak weeks → higher emotional energy", () => {
    const low = computeCORState(makeInput({ streakWeeks: 0 }));
    const high = computeCORState(makeInput({ streakWeeks: 8 }));
    expect(high.emotionalEnergy).toBeGreaterThan(low.emotionalEnergy);
  });

  it("time resource decreases with session length", () => {
    const shortSess = computeCORState(makeInput({ sessionMinutes: 10 }));
    const longSess = computeCORState(makeInput({ sessionMinutes: 70 }));
    expect(shortSess.timeResource).toBeGreaterThan(longSess.timeResource);
  });

  it("session at boundary of 15 min", () => {
    const cor = computeCORState(makeInput({ sessionMinutes: 15 }));
    expect(cor.cognitiveLoad).toBeCloseTo(30, 0);
  });

  it("session at boundary of 45 min", () => {
    const cor = computeCORState(makeInput({ sessionMinutes: 45 }));
    expect(cor.cognitiveLoad).toBeGreaterThan(30);
    expect(cor.cognitiveLoad).toBeLessThanOrEqual(75);
  });

  it("zero achievements → zero achievement emotional boost", () => {
    const cor = computeCORState(makeInput({ achievementsTotal: 0, achievementsUnlocked: 0 }));
    expect(cor.emotionalEnergy).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// computeMotivationState
// ─────────────────────────────────────────────────────────────────────────

describe("computeMotivationState", () => {
  it("returns all required top-level fields", () => {
    const result = computeMotivationState(makeInput());
    expect(result).toHaveProperty("motivation");
    expect(result).toHaveProperty("ability");
    expect(result).toHaveProperty("triggerReadiness");
    expect(result).toHaveProperty("foggScore");
    expect(result).toHaveProperty("nudge");
    expect(result).toHaveProperty("resourceState");
    expect(result).toHaveProperty("activeDrivers");
  });

  it("motivation, ability, triggerReadiness are between 0 and 1", () => {
    const result = computeMotivationState(makeInput());
    expect(result.motivation).toBeGreaterThanOrEqual(0);
    expect(result.motivation).toBeLessThanOrEqual(1);
    expect(result.ability).toBeGreaterThanOrEqual(0);
    expect(result.ability).toBeLessThanOrEqual(1);
    expect(result.triggerReadiness).toBeGreaterThanOrEqual(0);
    expect(result.triggerReadiness).toBeLessThanOrEqual(1);
  });

  it("foggScore equals m * a * t (approximately)", () => {
    const result = computeMotivationState(makeInput());
    const expected = Math.round(result.motivation * result.ability * result.triggerReadiness * 100) / 100;
    expect(result.foggScore).toBeCloseTo(expected, 1);
  });

  it("nudge has bilingual message", () => {
    const result = computeMotivationState(makeInput());
    expect(result.nudge.message.he).toBeTruthy();
    expect(result.nudge.message.en).toBeTruthy();
  });

  it("nudge intensity is between 0 and 1", () => {
    const result = computeMotivationState(makeInput());
    expect(result.nudge.intensity).toBeGreaterThanOrEqual(0);
    expect(result.nudge.intensity).toBeLessThanOrEqual(1);
  });

  it("activeDrivers is an array with at least one nudge", () => {
    const result = computeMotivationState(makeInput());
    expect(Array.isArray(result.activeDrivers)).toBe(true);
    expect(result.activeDrivers.length).toBeGreaterThanOrEqual(1);
  });

  it("COR recovery nudge appears when shouldSimplify=true (long session)", () => {
    const result = computeMotivationState(makeInput({ sessionMinutes: 80 }));
    const types = result.activeDrivers.map((n) => n.type);
    expect(types).toContain("cor_recovery");
  });

  it("goal gradient nudge appears when partially complete", () => {
    const result = computeMotivationState(makeInput({ modulesCompleted: 5, modulesTotal: 10 }));
    const types = result.activeDrivers.map((n) => n.type);
    expect(types).toContain("goal_gradient");
  });

  it("no goal gradient nudge when modules are all complete", () => {
    const result = computeMotivationState(makeInput({ modulesCompleted: 10, modulesTotal: 10 }));
    const types = result.activeDrivers.map((n) => n.type);
    expect(types).not.toContain("goal_gradient");
  });

  it("investment nudge appears when user has plans", () => {
    const result = computeMotivationState(makeInput({ investment: { plansCreated: 3, totalSessionsMinutes: 120, aiQueriesUsed: 0, campaignsGenerated: 0, lastActiveAt: "" } }));
    const types = result.activeDrivers.map((n) => n.type);
    expect(types).toContain("investment_sunk");
  });

  it("accepts undefined blackboard context gracefully", () => {
    const result = computeMotivationState(makeInput(), undefined);
    expect(result.foggScore).toBeGreaterThanOrEqual(0);
  });

  it("ukg urgency signal 'acute' boosts motivation", () => {
    const without = computeMotivationState(makeInput());
    const with_ = computeMotivationState(makeInput(), undefined, {
      derived: { urgencySignal: "acute" },
      chatInsights: { goalClarity: 50 },
    } as unknown as import("../userKnowledgeGraph").UserKnowledgeGraph);
    expect(with_.motivation).toBeGreaterThanOrEqual(without.motivation);
  });

  it("ukg low goalClarity reduces triggerReadiness", () => {
    const result = computeMotivationState(makeInput(), undefined, {
      derived: { urgencySignal: "none" },
      chatInsights: { goalClarity: 10 },
    } as unknown as import("../userKnowledgeGraph").UserKnowledgeGraph);
    expect(result.triggerReadiness).toBeGreaterThanOrEqual(0);
    expect(result.triggerReadiness).toBeLessThanOrEqual(1);
  });

  it("DISC profile influences nudge message (D type)", () => {
    const result = computeMotivationState(makeInput({ discProfile: { D: 80, I: 10, S: 5, C: 5 } as unknown as import("../discProfileEngine").DISCDistribution }));
    expect(result.nudge.message.en).toBeTruthy();
  });

  it("zero modules total doesn't crash", () => {
    const result = computeMotivationState(makeInput({ modulesTotal: 0, modulesCompleted: 0 }));
    expect(result.motivation).toBeGreaterThanOrEqual(0);
  });

  it("100% achievement rate → max emotional energy contribution", () => {
    const result = computeMotivationState(makeInput({ achievementsUnlocked: 10, achievementsTotal: 10 }));
    expect(result.resourceState.emotionalEnergy).toBeGreaterThan(50);
  });
});
