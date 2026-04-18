import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateInsights, type BusinessInsight } from "../insightsEngine";
import type { SavedPlan, FunnelResult, FormData } from "@/types/funnel";

// ── Mock external deps ─────────────────────────────────────────────────────
// insightsEngine uses safeStorage and calculateHealthScore internally.
// We mock safeStorage so we can control what plans/differentiation data exist.

const mockPlansStore: Record<string, string> = {};

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn((key: string, defaultVal: unknown) => {
      const val = mockPlansStore[key];
      if (val !== undefined) {
        try { return JSON.parse(val); } catch { return defaultVal; }
      }
      return defaultVal;
    }),
    getString: vi.fn((key: string, defaultVal: string) => {
      return mockPlansStore[key] ?? defaultVal;
    }),
    setJSON: vi.fn((key: string, val: unknown) => {
      mockPlansStore[key] = JSON.stringify(val);
    }),
    setString: vi.fn((key: string, val: string) => {
      mockPlansStore[key] = val;
    }),
    remove: vi.fn((key: string) => {
      delete mockPlansStore[key];
    }),
  },
}));

vi.mock("../healthScoreEngine", () => ({
  calculateHealthScore: vi.fn((result: FunnelResult) => {
    // Simple scoring based on number of stages
    const total = result.stages.length >= 3 ? 75 : 35;
    return { total };
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2b",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform",
    averagePrice: 500,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "instagram"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeStage(id: string) {
  return { id, name: { he: "", en: "" }, budgetPercent: 20, channels: [], description: { he: "", en: "" } };
}

function makeFunnelResult(stageCount = 4, formDataOverrides: Partial<FormData> = {}): FunnelResult {
  return {
    id: "r1",
    funnelName: { he: "תוכנית", en: "Plan" },
    stages: Array.from({ length: stageCount }, (_, i) => makeStage(`stage${i}`)),
    totalBudget: { min: 1000, max: 5000 },
    overallTips: [],
    hookTips: [],
    copyLab: {
      readerProfile: { level: 1, name: { he: "", en: "" }, description: { he: "", en: "" }, copyArchitecture: { he: "", en: "" }, principles: [] },
      formulas: [],
      writingTechniques: [],
    },
    kpis: [],
    createdAt: new Date().toISOString(),
    formData: makeFormData(formDataOverrides),
  };
}

function makeSavedPlan(id: string, options: { stageCount?: number; savedAt?: string; name?: string; formDataOverrides?: Partial<FormData> } = {}): SavedPlan {
  return {
    id,
    name: options.name ?? `Plan ${id}`,
    result: makeFunnelResult(options.stageCount ?? 4, options.formDataOverrides ?? {}),
    savedAt: options.savedAt ?? new Date().toISOString(),
  };
}

function setPlans(plans: SavedPlan[]) {
  mockPlansStore["funnelforge-plans"] = JSON.stringify(plans);
}

function clearStorage() {
  for (const key of Object.keys(mockPlansStore)) {
    delete mockPlansStore[key];
  }
}

// ─────────────────────────────────────────────────────────────────────────
// generateInsights — no plans
// ─────────────────────────────────────────────────────────────────────────

describe("generateInsights — no plans", () => {
  beforeEach(() => clearStorage());

  it("returns empty array when no plans exist", () => {
    const insights = generateInsights();
    expect(insights).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// generateInsights — structure
// ─────────────────────────────────────────────────────────────────────────

describe("generateInsights — return structure", () => {
  beforeEach(() => {
    clearStorage();
    setPlans([makeSavedPlan("p1")]);
  });

  it("returns an array", () => {
    expect(Array.isArray(generateInsights())).toBe(true);
  });

  it("each insight has required fields", () => {
    const insights = generateInsights();
    for (const insight of insights) {
      expect(insight.id).toBeTruthy();
      expect(["win", "pattern", "risk", "tip"]).toContain(insight.type);
      expect(insight.title.he).toBeTruthy();
      expect(insight.title.en).toBeTruthy();
      expect(insight.body.he).toBeTruthy();
      expect(insight.body.en).toBeTruthy();
      expect(insight.confidence).toBeGreaterThan(0);
      expect(insight.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("returns at most 5 insights", () => {
    const insights = generateInsights();
    expect(insights.length).toBeLessThanOrEqual(5);
  });

  it("insights are sorted by confidence descending", () => {
    const insights = generateInsights();
    for (let i = 0; i < insights.length - 1; i++) {
      expect(insights[i].confidence).toBeGreaterThanOrEqual(insights[i + 1].confidence);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// generateInsights — win: high health score
// ─────────────────────────────────────────────────────────────────────────

describe("generateInsights — win insight (high health)", () => {
  beforeEach(() => {
    clearStorage();
    // stageCount=4 → mocked calculateHealthScore returns 75
    setPlans([makeSavedPlan("p1", { stageCount: 4, name: "My Plan" })]);
  });

  it("produces a win insight for high health score", () => {
    const insights = generateInsights();
    const win = insights.find((i) => i.id === "win-health");
    expect(win).toBeDefined();
    expect(win?.type).toBe("win");
  });

  it("win insight references the plan name", () => {
    const insights = generateInsights();
    const win = insights.find((i) => i.id === "win-health");
    expect(win?.body.en).toContain("My Plan");
  });

  it("win insight has confidence 0.95", () => {
    const insights = generateInsights();
    const win = insights.find((i) => i.id === "win-health");
    expect(win?.confidence).toBe(0.95);
  });

  it("win insight includes metric with score", () => {
    const insights = generateInsights();
    const win = insights.find((i) => i.id === "win-health");
    expect(win?.metric).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// generateInsights — tip: low health score
// ─────────────────────────────────────────────────────────────────────────

describe("generateInsights — tip insight (low health)", () => {
  beforeEach(() => {
    clearStorage();
    // stageCount=1 → mocked calculateHealthScore returns 35
    setPlans([makeSavedPlan("p1", { stageCount: 1 })]);
  });

  it("produces a tip insight for low health score", () => {
    const insights = generateInsights();
    const tip = insights.find((i) => i.id === "tip-health");
    expect(tip).toBeDefined();
    expect(tip?.type).toBe("tip");
  });

  it("tip insight has confidence 0.85", () => {
    const insights = generateInsights();
    const tip = insights.find((i) => i.id === "tip-health");
    expect(tip?.confidence).toBe(0.85);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// generateInsights — pattern: multiple plans
// ─────────────────────────────────────────────────────────────────────────

describe("generateInsights — pattern insight (multiple plans)", () => {
  beforeEach(() => {
    clearStorage();
    setPlans([
      makeSavedPlan("p1", { savedAt: new Date("2025-01-01").toISOString() }),
      makeSavedPlan("p2", { savedAt: new Date("2025-01-02").toISOString() }),
    ]);
  });

  it("produces a pattern insight for multiple plans", () => {
    const insights = generateInsights();
    const pattern = insights.find((i) => i.id === "pattern-plans");
    expect(pattern).toBeDefined();
    expect(pattern?.type).toBe("pattern");
  });

  it("pattern insight body mentions average score", () => {
    const insights = generateInsights();
    const pattern = insights.find((i) => i.id === "pattern-plans");
    expect(pattern?.body.en).toContain("Average health score");
  });

  it("pattern insight has confidence 0.8", () => {
    const insights = generateInsights();
    const pattern = insights.find((i) => i.id === "pattern-plans");
    expect(pattern?.confidence).toBe(0.8);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// generateInsights — risk: stale plan
// ─────────────────────────────────────────────────────────────────────────

describe("generateInsights — risk insight (stale plan)", () => {
  beforeEach(() => {
    clearStorage();
    // 40 days ago
    const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    setPlans([makeSavedPlan("p1", { savedAt: oldDate, stageCount: 4 })]);
  });

  it("produces a risk insight for stale plan", () => {
    const insights = generateInsights();
    const risk = insights.find((i) => i.id === "risk-stale");
    expect(risk).toBeDefined();
    expect(risk?.type).toBe("risk");
  });

  it("risk insight has confidence 0.75", () => {
    const insights = generateInsights();
    const risk = insights.find((i) => i.id === "risk-stale");
    expect(risk?.confidence).toBe(0.75);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// generateInsights — differentiation pattern
// ─────────────────────────────────────────────────────────────────────────

describe("generateInsights — differentiation complete", () => {
  beforeEach(() => {
    clearStorage();
    setPlans([makeSavedPlan("p1")]);
    mockPlansStore["funnelforge-differentiation-result"] = JSON.stringify({ some: "data" });
  });

  it("produces a pattern-diff insight when differentiation is complete", () => {
    const insights = generateInsights();
    const diff = insights.find((i) => i.id === "pattern-diff");
    expect(diff).toBeDefined();
    expect(diff?.type).toBe("win");
  });

  it("diff insight has confidence 0.9", () => {
    const insights = generateInsights();
    const diff = insights.find((i) => i.id === "pattern-diff");
    expect(diff?.confidence).toBe(0.9);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// generateInsights — channel tip
// ─────────────────────────────────────────────────────────────────────────

describe("generateInsights — channel tip", () => {
  beforeEach(() => {
    clearStorage();
    setPlans([
      makeSavedPlan("p1", { formDataOverrides: { existingChannels: ["facebook", "instagram"] } }),
      makeSavedPlan("p2", { formDataOverrides: { existingChannels: ["facebook"] } }),
    ]);
  });

  it("produces a tip-channel insight", () => {
    const insights = generateInsights();
    const channelTip = insights.find((i) => i.id === "tip-channel");
    expect(channelTip).toBeDefined();
    expect(channelTip?.type).toBe("tip");
  });

  it("channel tip mentions the top channel", () => {
    const insights = generateInsights();
    const channelTip = insights.find((i) => i.id === "tip-channel");
    expect(channelTip?.metric).toBe("facebook"); // facebook appears in both plans
  });
});

// ─────────────────────────────────────────────────────────────────────────
// generateInsights — pricing tip
// ─────────────────────────────────────────────────────────────────────────

describe("generateInsights — pricing tip", () => {
  beforeEach(() => {
    clearStorage();
    setPlans([makeSavedPlan("p1", { formDataOverrides: { averagePrice: 400 } })]);
  });

  it("produces a tip-pricing insight when averagePrice > 0", () => {
    const insights = generateInsights();
    const pricingTip = insights.find((i) => i.id === "tip-pricing");
    expect(pricingTip).toBeDefined();
    expect(pricingTip?.type).toBe("tip");
    expect(pricingTip?.confidence).toBe(0.65);
  });

  it("pricing tip body mentions a higher price suggestion", () => {
    const insights = generateInsights();
    const pricingTip = insights.find((i) => i.id === "tip-pricing");
    expect(pricingTip?.body.en).toContain("+15%");
  });
});
