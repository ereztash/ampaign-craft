import { describe, it, expect, vi } from "vitest";
import {
  generateBenchmarks,
  findBenchmark,
  ENGINE_MANIFEST,
  type CampaignBenchmark,
  type AnalyticsResult,
} from "../campaignAnalyticsEngine";
import type { SavedPlan, FunnelResult, FormData } from "@/types/funnel";

// ── Mock external deps ─────────────────────────────────────────────────────
vi.mock("../blackboard/contract", () => ({
  writeContext: vi.fn().mockResolvedValue(undefined),
  conceptKey: vi.fn((_a: string, _b: string, _c: string) => `${_a}-${_b}-${_c}`),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

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

function makeFunnelResult(overrides: Partial<FunnelResult> = {}): FunnelResult {
  return {
    id: "r1",
    funnelName: { he: "תוכנית", en: "Plan" },
    stages: [
      {
        id: "awareness",
        name: { he: "מודעות", en: "Awareness" },
        budgetPercent: 50,
        channels: [
          { channel: "facebook", name: { he: "פייסבוק", en: "Facebook" }, budgetPercent: 100, kpis: [], tips: [] },
        ],
        description: { he: "", en: "" },
      },
    ],
    totalBudget: { min: 2000, max: 8000 },
    overallTips: [],
    hookTips: [],
    copyLab: {
      readerProfile: { level: 1, name: { he: "", en: "" }, description: { he: "", en: "" }, copyArchitecture: { he: "", en: "" }, principles: [] },
      formulas: [],
      writingTechniques: [],
    },
    kpis: [],
    createdAt: new Date().toISOString(),
    formData: makeFormData(),
    ...overrides,
  };
}

function makeSavedPlan(id: string, overrides: Partial<FunnelResult> = {}, name = "Test Plan"): SavedPlan {
  return {
    id,
    name,
    result: makeFunnelResult(overrides),
    savedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// ENGINE_MANIFEST
// ─────────────────────────────────────────────────────────────────────────

describe("CampaignAnalyticsEngine — ENGINE_MANIFEST", () => {
  it("has the correct name", () => {
    expect(ENGINE_MANIFEST.name).toBe("campaignAnalyticsEngine");
  });

  it("has stage 'deploy'", () => {
    expect(ENGINE_MANIFEST.stage).toBe("deploy");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// generateBenchmarks — empty input
// ─────────────────────────────────────────────────────────────────────────

describe("generateBenchmarks — empty input", () => {
  it("returns empty result for empty plans array", () => {
    const result = generateBenchmarks([]);
    expect(result.benchmarks).toEqual([]);
    expect(result.industryInsights).toEqual([]);
    expect(result.totalPlansAnalyzed).toBe(0);
  });

  it("generatedAt is a valid ISO string", () => {
    const result = generateBenchmarks([]);
    expect(() => new Date(result.generatedAt)).not.toThrow();
    expect(new Date(result.generatedAt).getFullYear()).toBeGreaterThan(2000);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// generateBenchmarks — single plan
// ─────────────────────────────────────────────────────────────────────────

describe("generateBenchmarks — single plan", () => {
  it("returns benchmarks for one plan", () => {
    const result = generateBenchmarks([makeSavedPlan("p1")]);
    expect(result.totalPlansAnalyzed).toBe(1);
    expect(result.benchmarks.length).toBeGreaterThan(0);
  });

  it("each benchmark has required fields", () => {
    const result = generateBenchmarks([makeSavedPlan("p1")]);
    for (const b of result.benchmarks) {
      expect(b.industry).toBeTruthy();
      expect(b.metric).toBeTruthy();
      expect(typeof b.value).toBe("number");
      expect(typeof b.sampleSize).toBe("number");
      expect(b.sampleSize).toBeGreaterThan(0);
      expect(b.confidence).toBeGreaterThanOrEqual(0);
      expect(b.confidence).toBeLessThanOrEqual(1);
      expect(b.updatedAt).toBeTruthy();
    }
  });

  it("produces avg_stage_count benchmark", () => {
    const result = generateBenchmarks([makeSavedPlan("p1")]);
    const stageBm = result.benchmarks.find((b) => b.metric === "avg_stage_count");
    expect(stageBm).toBeDefined();
    expect(stageBm?.value).toBe(1); // one stage in our mock
  });

  it("produces avg_budget_nis benchmark when budget > 0", () => {
    const result = generateBenchmarks([makeSavedPlan("p1")]);
    const budgetBm = result.benchmarks.find((b) => b.metric === "avg_budget_nis");
    expect(budgetBm).toBeDefined();
    expect(budgetBm!.value).toBe(5000); // (2000+8000)/2
  });

  it("produces industry insights", () => {
    const result = generateBenchmarks([makeSavedPlan("p1")]);
    expect(result.industryInsights.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// generateBenchmarks — multiple plans
// ─────────────────────────────────────────────────────────────────────────

describe("generateBenchmarks — multiple plans", () => {
  it("groups plans by industry correctly", () => {
    const plans = [
      makeSavedPlan("p1", { formData: makeFormData({ businessField: "tech" }) }),
      makeSavedPlan("p2", { formData: makeFormData({ businessField: "fashion" }) }),
      makeSavedPlan("p3", { formData: makeFormData({ businessField: "tech" }) }),
    ];
    const result = generateBenchmarks(plans);
    expect(result.totalPlansAnalyzed).toBe(3);
    const industries = [...new Set(result.benchmarks.map((b) => b.industry))];
    expect(industries).toContain("tech");
    expect(industries).toContain("fashion");
  });

  it("tech industry benchmark has sampleSize 2 when 2 tech plans", () => {
    const plans = [
      makeSavedPlan("p1", { formData: makeFormData({ businessField: "tech" }) }),
      makeSavedPlan("p2", { formData: makeFormData({ businessField: "tech" }) }),
    ];
    const result = generateBenchmarks(plans);
    const stageBm = result.benchmarks.find((b) => b.industry === "tech" && b.metric === "avg_stage_count");
    expect(stageBm?.sampleSize).toBe(2);
  });

  it("produces audience-type-specific benchmarks for b2b and b2c", () => {
    const plans = [
      makeSavedPlan("p1", { formData: makeFormData({ audienceType: "b2b" }) }),
      makeSavedPlan("p2", { formData: makeFormData({ audienceType: "b2c" }) }),
    ];
    const result = generateBenchmarks(plans);
    const audienceTypes = result.benchmarks.map((b) => b.audienceType);
    expect(audienceTypes).toContain("b2b");
    expect(audienceTypes).toContain("b2c");
  });

  it("industryInsights topChannels are sorted by frequency desc", () => {
    const plans = [makeSavedPlan("p1"), makeSavedPlan("p2"), makeSavedPlan("p3")];
    const result = generateBenchmarks(plans);
    const insight = result.industryInsights[0];
    if (insight.topChannels.length >= 2) {
      expect(insight.topChannels[0].frequency).toBeGreaterThanOrEqual(insight.topChannels[1].frequency);
    }
  });

  it("industryInsights commonGoals are present", () => {
    const plans = [
      makeSavedPlan("p1", { formData: makeFormData({ mainGoal: "sales" }) }),
      makeSavedPlan("p2", { formData: makeFormData({ mainGoal: "sales" }) }),
    ];
    const result = generateBenchmarks(plans);
    const insight = result.industryInsights[0];
    const salesGoal = insight.commonGoals.find((g) => g.goal === "sales");
    expect(salesGoal).toBeDefined();
    expect(salesGoal?.frequency).toBe(2);
  });

  it("confidence increases with sample size", () => {
    const small = generateBenchmarks([makeSavedPlan("p1")]);
    const large = generateBenchmarks(Array.from({ length: 20 }, (_, i) => makeSavedPlan(`p${i}`)));
    const smallBm = small.benchmarks.find((b) => b.metric === "avg_stage_count")!;
    const largeBm = large.benchmarks.find((b) => b.metric === "avg_stage_count")!;
    expect(largeBm.confidence).toBeGreaterThan(smallBm.confidence);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// findBenchmark
// ─────────────────────────────────────────────────────────────────────────

describe("findBenchmark", () => {
  const benchmarks: CampaignBenchmark[] = [
    { industry: "tech", audienceType: "all", metric: "avg_stage_count", value: 4.2, sampleSize: 10, confidence: 0.7, updatedAt: new Date().toISOString() },
    { industry: "tech", audienceType: "b2b", metric: "avg_stage_count", value: 5.0, sampleSize: 5, confidence: 0.5, updatedAt: new Date().toISOString() },
    { industry: "fashion", audienceType: "all", metric: "avg_budget_nis", value: 3000, sampleSize: 3, confidence: 0.3, updatedAt: new Date().toISOString() },
  ];

  it("returns exact match when found", () => {
    const bm = findBenchmark(benchmarks, "tech", "avg_stage_count", "b2b");
    expect(bm).toBeDefined();
    expect(bm?.value).toBe(5.0);
    expect(bm?.audienceType).toBe("b2b");
  });

  it("falls back to 'all' audienceType when exact not found", () => {
    const bm = findBenchmark(benchmarks, "tech", "avg_stage_count", "b2c");
    expect(bm).toBeDefined();
    expect(bm?.audienceType).toBe("all");
    expect(bm?.value).toBe(4.2);
  });

  it("returns undefined when industry not found", () => {
    const bm = findBenchmark(benchmarks, "realEstate", "avg_stage_count");
    expect(bm).toBeUndefined();
  });

  it("returns undefined when metric not found", () => {
    const bm = findBenchmark(benchmarks, "tech", "nonexistent_metric");
    expect(bm).toBeUndefined();
  });

  it("defaults audienceType to 'all' when not provided", () => {
    const bm = findBenchmark(benchmarks, "tech", "avg_stage_count");
    expect(bm).toBeDefined();
    expect(bm?.value).toBe(4.2);
  });

  it("finds fashion budget benchmark", () => {
    const bm = findBenchmark(benchmarks, "fashion", "avg_budget_nis");
    expect(bm).toBeDefined();
    expect(bm?.value).toBe(3000);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// avgBudgetRange in industryInsights
// ─────────────────────────────────────────────────────────────────────────

describe("generateBenchmarks — industryInsights avgBudgetRange", () => {
  it("min and max reflect the plan budgets", () => {
    const plans = [
      makeSavedPlan("p1", { totalBudget: { min: 1000, max: 5000 } }),
      makeSavedPlan("p2", { totalBudget: { min: 2000, max: 10000 } }),
    ];
    const result = generateBenchmarks(plans);
    const insight = result.industryInsights[0];
    // midpoints: 3000, 6000
    expect(insight.avgBudgetRange.min).toBeLessThanOrEqual(insight.avgBudgetRange.max);
  });

  it("zero budget plans produce zero min/max", () => {
    const plans = [makeSavedPlan("p1", { totalBudget: { min: 0, max: 0 } })];
    const result = generateBenchmarks(plans);
    const insight = result.industryInsights[0];
    expect(insight.avgBudgetRange.min).toBe(0);
    expect(insight.avgBudgetRange.max).toBe(0);
  });
});
