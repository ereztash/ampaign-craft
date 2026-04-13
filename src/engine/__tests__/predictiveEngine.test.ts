import { describe, it, expect } from "vitest";
import { predictSuccess, predictBudgetNeeded } from "../predictiveEngine";
import { generateFunnel } from "../funnelEngine";
import { buildUserKnowledgeGraph } from "../userKnowledgeGraph";
import { CampaignBenchmark } from "../campaignAnalyticsEngine";
import { FormData } from "@/types/funnel";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "software",
    productDescription: "SaaS platform",
    averagePrice: 300,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "instagram"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeBenchmark(overrides: Partial<CampaignBenchmark> = {}): CampaignBenchmark {
  return {
    industry: "tech",
    audienceType: "all",
    metric: "avg_budget_nis",
    value: 6000,
    sampleSize: 20,
    confidence: 0.8,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("predictSuccess", () => {
  it("returns a PredictionResult with all required fields", () => {
    const formData = makeFormData();
    const funnel = generateFunnel(formData);
    const result = predictSuccess(formData, funnel, []);

    expect(result.successProbability).toBeGreaterThanOrEqual(10);
    expect(result.successProbability).toBeLessThanOrEqual(95);
    expect(result.budgetEfficiency).toBeDefined();
    expect(result.riskFactors).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.basedOnSamples).toBeGreaterThanOrEqual(0);
  });

  it("probability is clamped between 10 and 95", () => {
    const formData = makeFormData({ experienceLevel: "beginner", budgetRange: "low" });
    const funnel = generateFunnel(formData);
    const result = predictSuccess(formData, funnel, []);
    expect(result.successProbability).toBeGreaterThanOrEqual(10);
    expect(result.successProbability).toBeLessThanOrEqual(95);
  });

  it("beginner experience reduces probability vs advanced", () => {
    const beginner = makeFormData({ experienceLevel: "beginner" });
    const advanced = makeFormData({ experienceLevel: "advanced" });
    const benchmarks = [makeBenchmark()];

    const resBeginner = predictSuccess(beginner, generateFunnel(beginner), benchmarks);
    const resAdvanced = predictSuccess(advanced, generateFunnel(advanced), benchmarks);

    expect(resAdvanced.successProbability).toBeGreaterThan(resBeginner.successProbability);
  });

  it("beginner has a learning-curve risk factor", () => {
    const formData = makeFormData({ experienceLevel: "beginner" });
    const result = predictSuccess(formData, generateFunnel(formData), []);
    const hasBeginnerRisk = result.riskFactors.some((r) =>
      r.factor.en.toLowerCase().includes("beginner") ||
      r.factor.en.toLowerCase().includes("learning")
    );
    expect(hasBeginnerRisk).toBe(true);
  });

  it("under-budget verdict when budget << benchmark", () => {
    const formData = makeFormData({ budgetRange: "low" }); // 500-2000 NIS
    const funnel = generateFunnel(formData);
    const benchmarks = [
      makeBenchmark({ metric: "avg_budget_nis", value: 50000 }), // way above
    ];
    const result = predictSuccess(formData, funnel, benchmarks);
    expect(result.budgetEfficiency.verdict).toBe("under");
  });

  it("optimal budget verdict when budget matches benchmark", () => {
    const formData = makeFormData({ budgetRange: "medium" }); // avg ~6000 NIS
    const funnel = generateFunnel(formData);
    const benchmarks = [
      makeBenchmark({ metric: "avg_budget_nis", value: 6000 }),
    ];
    const result = predictSuccess(formData, funnel, benchmarks);
    expect(result.budgetEfficiency.verdict).toBe("optimal");
  });

  it("over-budget verdict when budget >> benchmark", () => {
    const formData = makeFormData({ budgetRange: "veryHigh" }); // avg ~125000 NIS
    const funnel = generateFunnel(formData);
    const benchmarks = [
      makeBenchmark({ metric: "avg_budget_nis", value: 1000 }), // way below
    ];
    const result = predictSuccess(formData, funnel, benchmarks);
    expect(result.budgetEfficiency.verdict).toBe("over");
  });

  it("single channel triggers risk factor", () => {
    // Force a funnel with minimal channels by using low budget + specific config
    const formData = makeFormData({ budgetRange: "low", audienceType: "b2b", existingChannels: [] });
    const funnel = generateFunnel(formData);

    // Manually override stages to have single channel (simulate edge case)
    const singleChannelFunnel = {
      ...funnel,
      stages: funnel.stages.map((s, i) => ({
        ...s,
        channels: i === 0 ? [s.channels[0] ?? { channel: "email", name: { he: "אימייל", en: "Email" }, budgetPercent: 100, kpis: [], tips: [] }] : [],
      })),
    };

    const result = predictSuccess(formData, singleChannelFunnel, []);
    // Probability should be affected by channel diversity penalty
    expect(result.successProbability).toBeLessThanOrEqual(75);
  });

  it("higher confidence with more benchmark samples", () => {
    const formData = makeFormData();
    const funnel = generateFunnel(formData);

    const fewSamples = [makeBenchmark({ sampleSize: 1, confidence: 0.3 })];
    const manySamples = [makeBenchmark({ sampleSize: 30, confidence: 0.9 })];

    const resLow = predictSuccess(formData, funnel, fewSamples);
    const resHigh = predictSuccess(formData, funnel, manySamples);

    expect(resHigh.confidence).toBeGreaterThanOrEqual(resLow.confidence);
  });

  it("real data with UKG improving trend boosts probability", () => {
    const formData = makeFormData();
    const funnel = generateFunnel(formData);

    const graphImproving = buildUserKnowledgeGraph(formData, null, null, undefined, undefined, {
      metaSignals: { connected: true, spend: 500, cpl: 10, ctr: 2.0, cvr: 3, trendDirection: "improving" },
    });
    const graphDeclining = buildUserKnowledgeGraph(formData, null, null, undefined, undefined, {
      metaSignals: { connected: true, spend: 500, cpl: 10, ctr: 2.0, cvr: 3, trendDirection: "declining" },
    });

    const resImproving = predictSuccess(formData, funnel, [], undefined, graphImproving);
    const resDeclining = predictSuccess(formData, funnel, [], undefined, graphDeclining);

    expect(resImproving.successProbability).toBeGreaterThan(resDeclining.successProbability);
  });

  it("all risk factors have valid impact levels", () => {
    const formData = makeFormData({ experienceLevel: "beginner", budgetRange: "low" });
    const result = predictSuccess(formData, generateFunnel(formData), [
      makeBenchmark({ metric: "avg_budget_nis", value: 50000 }),
    ]);
    for (const risk of result.riskFactors) {
      expect(risk.factor.he).toBeTruthy();
      expect(risk.factor.en).toBeTruthy();
      expect(typeof risk.mitigable).toBe("boolean");
    }
  });

  it("all recommendations have priority and expected improvement", () => {
    const formData = makeFormData({ mainGoal: "sales", experienceLevel: "beginner" });
    const result = predictSuccess(formData, generateFunnel(formData), [
      makeBenchmark({ metric: "avg_budget_nis", value: 50000 }),
    ]);
    for (const rec of result.recommendations) {
      expect(rec.text.he).toBeTruthy();
      expect(rec.text.en).toBeTruthy();
      expect(["high", "medium", "low"]).toContain(rec.priority);
      expect(rec.expectedImprovement).toBeTruthy();
    }
  });
});

describe("predictBudgetNeeded", () => {
  it("returns valid budget prediction with benchmarks", () => {
    const benchmarks = [makeBenchmark({ metric: "avg_budget_nis", value: 6000, industry: "tech" })];
    const result = predictBudgetNeeded("sales", "tech", "b2c", benchmarks);

    expect(result.recommendedBudget).toBeGreaterThan(0);
    expect(result.budgetRange.min).toBeLessThan(result.budgetRange.max);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.rationale.he).toBeTruthy();
    expect(result.rationale.en).toBeTruthy();
  });

  it("sales goal gets higher budget than awareness", () => {
    const benchmarks = [makeBenchmark({ metric: "avg_budget_nis", value: 6000, industry: "tech" })];
    const sales = predictBudgetNeeded("sales", "tech", "b2c", benchmarks);
    const awareness = predictBudgetNeeded("awareness", "tech", "b2c", benchmarks);
    expect(sales.recommendedBudget).toBeGreaterThan(awareness.recommendedBudget);
  });

  it("returns default fallback when no benchmarks match", () => {
    const result = predictBudgetNeeded("sales", "unknown_industry", "b2c", []);
    expect(result.recommendedBudget).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it("budget range min is less than recommended, max is greater", () => {
    const benchmarks = [makeBenchmark({ metric: "avg_budget_nis", value: 10000, industry: "fashion" })];
    const result = predictBudgetNeeded("leads", "fashion", "b2c", benchmarks);
    expect(result.budgetRange.min).toBeLessThan(result.recommendedBudget);
    expect(result.budgetRange.max).toBeGreaterThan(result.recommendedBudget);
  });
});
