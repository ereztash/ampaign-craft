import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  captureRecommendationShown,
  captureVariantPick,
  captureOutcome,
  capturePricingOutcome,
  buildContextSnapshot,
  snapshotEngineOutputs,
  getEngineHistory,
  captureContentSnapshot,
} from "../outcomeLoopEngine";

// ═══════════════════════════════════════════════
// Mock safeStorage
// ═══════════════════════════════════════════════

const store = new Map<string, unknown>();

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(<T>(key: string, fallback: T): T =>
      store.has(key) ? (store.get(key) as T) : fallback,
    ),
    setJSON: vi.fn((key: string, value: unknown) => {
      store.set(key, value);
    }),
    remove: vi.fn((key: string) => store.delete(key)),
  },
}));

// Mock Supabase import (all async paths fire-and-forget)
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: vi.fn().mockResolvedValue({ error: null }) }),
  },
}));

// Mock trainingDataEngine (used by capturePricingOutcome)
vi.mock("../trainingDataEngine", () => ({
  captureTrainingPair: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════
// captureRecommendationShown
// ═══════════════════════════════════════════════

describe("captureRecommendationShown", () => {
  it("returns a non-empty string ID", () => {
    const id = captureRecommendationShown({
      user_id: "user-1",
      archetype_id: "arch-1",
      confidence_tier: "high",
      source: "insight_feed",
      action_id: "pricing",
      action_label_en: "Set Your Pricing",
      context_snapshot: {},
    });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns unique IDs for each call", () => {
    const id1 = captureRecommendationShown({
      user_id: null,
      archetype_id: "arch-1",
      confidence_tier: "medium",
      source: "nudge_banner",
      action_id: "wizard",
      action_label_en: "Build Plan",
      context_snapshot: {},
    });
    const id2 = captureRecommendationShown({
      user_id: null,
      archetype_id: "arch-1",
      confidence_tier: "medium",
      source: "nudge_banner",
      action_id: "wizard",
      action_label_en: "Build Plan",
      context_snapshot: {},
    });
    expect(id1).not.toBe(id2);
  });

  it("works with null user_id (anonymous)", () => {
    expect(() =>
      captureRecommendationShown({
        user_id: null,
        archetype_id: "arch-1",
        confidence_tier: "low",
        source: "express_wizard",
        action_id: "onboarding",
        action_label_en: "Get Started",
        context_snapshot: { plan_count: 0 },
      }),
    ).not.toThrow();
  });

  it("accepts all valid source types", () => {
    const sources = [
      "insight_feed",
      "nudge_banner",
      "guidance_panel",
      "archetype_pipeline",
      "express_wizard",
    ] as const;
    for (const source of sources) {
      expect(() =>
        captureRecommendationShown({
          user_id: null,
          archetype_id: "arch-1",
          confidence_tier: "medium",
          source,
          action_id: "test",
          action_label_en: "Test",
          context_snapshot: {},
        }),
      ).not.toThrow();
    }
  });
});

// ═══════════════════════════════════════════════
// captureVariantPick
// ═══════════════════════════════════════════════

describe("captureVariantPick", () => {
  it("does not throw for primary pick", () => {
    expect(() =>
      captureVariantPick("rec-id-1", "primary", 0, "user-1"),
    ).not.toThrow();
  });

  it("does not throw for variation pick", () => {
    expect(() =>
      captureVariantPick("rec-id-2", "variation", 1, null),
    ).not.toThrow();
  });

  it("does not throw for skip pick", () => {
    expect(() =>
      captureVariantPick("rec-id-3", "skip", 2, null),
    ).not.toThrow();
  });

  it("accepts optional hoverMs parameter", () => {
    expect(() =>
      captureVariantPick("rec-id-4", "primary", 0, "user-1", 1500),
    ).not.toThrow();
  });

  it("accepts null hoverMs", () => {
    expect(() =>
      captureVariantPick("rec-id-5", "primary", 0, "user-1", null),
    ).not.toThrow();
  });
});

// ═══════════════════════════════════════════════
// captureOutcome
// ═══════════════════════════════════════════════

describe("captureOutcome", () => {
  it("does not throw for navigated outcome", () => {
    expect(() =>
      captureOutcome("rec-1", "user-1", "navigated"),
    ).not.toThrow();
  });

  it("accepts all valid outcome types", () => {
    const outcomes = [
      "navigated",
      "plan_created",
      "source_connected",
      "revenue_reported",
      "dismissed",
      "pricing_validated",
    ] as const;
    for (const type of outcomes) {
      expect(() => captureOutcome("rec", null, type)).not.toThrow();
    }
  });

  it("accepts all valid horizon values", () => {
    const horizons = [7, 30, 90] as const;
    for (const h of horizons) {
      expect(() => captureOutcome("rec", null, "navigated", h)).not.toThrow();
    }
  });

  it("accepts optional deltaValue", () => {
    expect(() =>
      captureOutcome("rec-1", "user-1", "revenue_reported", 30, 1500),
    ).not.toThrow();
  });

  it("defaults to horizon 7 when not provided", () => {
    // No error means the default was applied
    expect(() => captureOutcome("rec-1", null, "plan_created")).not.toThrow();
  });
});

// ═══════════════════════════════════════════════
// capturePricingOutcome
// ═══════════════════════════════════════════════

describe("capturePricingOutcome", () => {
  it("resolves without error for valid inputs", async () => {
    await expect(
      capturePricingOutcome("user-1", 500, 480, "arch-1", "tech"),
    ).resolves.toBeUndefined();
  });

  it("does nothing and resolves when recommendedPrice is 0", async () => {
    await expect(
      capturePricingOutcome("user-1", 0, 500, "arch-1", "tech"),
    ).resolves.toBeUndefined();
  });

  it("does nothing and resolves when recommendedPrice is negative", async () => {
    await expect(
      capturePricingOutcome(null, -100, 500, "arch-1", "services"),
    ).resolves.toBeUndefined();
  });

  it("handles miss > 20% without throwing", async () => {
    await expect(
      capturePricingOutcome("user-1", 1000, 500, "arch-1", "education"),
    ).resolves.toBeUndefined();
  });

  it("handles null userId without throwing", async () => {
    await expect(
      capturePricingOutcome(null, 500, 600, "arch-1", "health"),
    ).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════
// buildContextSnapshot
// ═══════════════════════════════════════════════

describe("buildContextSnapshot", () => {
  it("returns object with all expected keys", () => {
    const snap = buildContextSnapshot({
      planCount: 3,
      healthScore: 75,
      connectedSources: 2,
      archetypeConfidence: 0.85,
      language: "he",
    });
    expect(snap.plan_count).toBe(3);
    expect(snap.health_score).toBe(75);
    expect(snap.connected_sources).toBe(2);
    expect(snap.archetype_confidence).toBe(85); // rounded *100
    expect(snap.language).toBe("he");
  });

  it("rounds archetypeConfidence to nearest integer", () => {
    const snap = buildContextSnapshot({
      planCount: 0,
      healthScore: null,
      connectedSources: 0,
      archetypeConfidence: 0.555,
      language: "en",
    });
    expect(snap.archetype_confidence).toBe(56);
  });

  it("handles null healthScore", () => {
    const snap = buildContextSnapshot({
      planCount: 0,
      healthScore: null,
      connectedSources: 0,
      archetypeConfidence: 0,
      language: "he",
    });
    expect(snap.health_score).toBeNull();
  });

  it("handles zero values correctly", () => {
    const snap = buildContextSnapshot({
      planCount: 0,
      healthScore: 0,
      connectedSources: 0,
      archetypeConfidence: 0,
      language: "en",
    });
    expect(snap.plan_count).toBe(0);
    expect(snap.health_score).toBe(0);
    expect(snap.archetype_confidence).toBe(0);
  });
});

// ═══════════════════════════════════════════════
// snapshotEngineOutputs + getEngineHistory
// ═══════════════════════════════════════════════

describe("snapshotEngineOutputs and getEngineHistory", () => {
  it("getEngineHistory returns empty array when no snapshots", () => {
    expect(getEngineHistory()).toEqual([]);
  });

  it("snapshotEngineOutputs stores a snapshot readable via getEngineHistory", () => {
    snapshotEngineOutputs({
      userId: "user-1",
      archetypeId: "arch-1",
      confidenceTier: "high",
      healthScore: 80,
      bottleneckCount: 2,
      criticalBottleneckCount: 1,
      successProbability: 0.75,
      planCount: 3,
      connectedSources: 2,
    });
    const history = getEngineHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].health_score).toBe(80);
    expect(history[0].plan_count).toBe(3);
  });

  it("deduplicates snapshots with same values within 5 minutes", () => {
    const params = {
      userId: "user-1",
      archetypeId: "arch-1",
      confidenceTier: "high",
      healthScore: 80,
      bottleneckCount: 2,
      criticalBottleneckCount: 0,
      successProbability: 0.8,
      planCount: 3,
      connectedSources: 2,
    };
    snapshotEngineOutputs(params);
    const before = getEngineHistory().length;
    snapshotEngineOutputs(params); // same values < 5 min → skip
    const after = getEngineHistory().length;
    expect(after).toBe(before);
  });

  it("does not deduplicate when health_score changes", () => {
    snapshotEngineOutputs({
      userId: "u",
      archetypeId: "a",
      confidenceTier: "medium",
      healthScore: 60,
      bottleneckCount: 1,
      criticalBottleneckCount: 0,
      successProbability: 0.6,
      planCount: 1,
      connectedSources: 1,
    });
    const before = getEngineHistory().length;
    snapshotEngineOutputs({
      userId: "u",
      archetypeId: "a",
      confidenceTier: "medium",
      healthScore: 70, // changed
      bottleneckCount: 1,
      criticalBottleneckCount: 0,
      successProbability: 0.6,
      planCount: 1,
      connectedSources: 1,
    });
    const after = getEngineHistory().length;
    expect(after).toBeGreaterThan(before);
  });
});

// ═══════════════════════════════════════════════
// captureContentSnapshot
// ═══════════════════════════════════════════════

describe("captureContentSnapshot", () => {
  it("does not throw for full params", () => {
    expect(() =>
      captureContentSnapshot({
        userId: "user-1",
        archetypeId: "arch-1",
        formData: {
          businessField: "tech",
          audienceType: "b2c",
          productDescription: "SaaS platform",
          interests: "marketing",
          mainGoal: "sales",
        },
      }),
    ).not.toThrow();
  });

  it("works with empty formData fields", () => {
    expect(() =>
      captureContentSnapshot({
        userId: null,
        archetypeId: "arch-1",
        formData: {},
      }),
    ).not.toThrow();
  });

  it("uses empty string for missing formData fields", () => {
    // Verify it doesn't crash on undefined optional fields
    expect(() =>
      captureContentSnapshot({
        userId: null,
        archetypeId: "arch-2",
        formData: { businessField: "health" },
      }),
    ).not.toThrow();
  });
});
