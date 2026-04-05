import { describe, it, expect } from "vitest";
import { generateSalesPipeline, getSalesTypeLabel } from "../salesPipelineEngine";
import { generateFunnel } from "../funnelEngine";
import { FormData } from "@/types/funnel";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech", audienceType: "b2c", ageRange: [25, 45],
    interests: "", productDescription: "SaaS platform", averagePrice: 200,
    salesModel: "subscription", budgetRange: "medium", mainGoal: "sales",
    existingChannels: ["facebook"], experienceLevel: "intermediate",
    ...overrides,
  };
}

describe("generateSalesPipeline", () => {
  it("detects transactional for B2C low price", () => {
    const result = generateFunnel(makeFormData({ audienceType: "b2c", averagePrice: 100 }));
    const pipeline = generateSalesPipeline(result);
    expect(pipeline.salesType).toBe("transactional");
  });

  it("detects consultative for B2B medium price", () => {
    const result = generateFunnel(makeFormData({ audienceType: "b2b", averagePrice: 800 }));
    const pipeline = generateSalesPipeline(result);
    expect(pipeline.salesType).toBe("consultative");
  });

  it("detects enterprise for B2B high price", () => {
    const result = generateFunnel(makeFormData({ audienceType: "b2b", averagePrice: 5000 }));
    const pipeline = generateSalesPipeline(result);
    expect(pipeline.salesType).toBe("enterprise");
  });

  it("has at least 3 pipeline stages", () => {
    const result = generateFunnel(makeFormData());
    const pipeline = generateSalesPipeline(result);
    expect(pipeline.stages.length).toBeGreaterThanOrEqual(3);
  });

  it("last stage is always closed_won", () => {
    const types: Array<Partial<FormData>> = [
      { audienceType: "b2c", averagePrice: 50 },
      { audienceType: "b2b", averagePrice: 800 },
      { audienceType: "b2b", averagePrice: 5000 },
    ];
    for (const t of types) {
      const result = generateFunnel(makeFormData(t));
      const pipeline = generateSalesPipeline(result);
      expect(pipeline.stages[pipeline.stages.length - 1].id).toBe("closed_won");
    }
  });

  it("each stage has bilingual name and actions", () => {
    const result = generateFunnel(makeFormData());
    const pipeline = generateSalesPipeline(result);
    for (const stage of pipeline.stages) {
      expect(stage.name.he).toBeTruthy();
      expect(stage.name.en).toBeTruthy();
      expect(stage.emoji).toBeTruthy();
      expect(stage.actions.length).toBeGreaterThan(0);
      for (const action of stage.actions) {
        expect(action.he).toBeTruthy();
        expect(action.en).toBeTruthy();
      }
    }
  });

  it("forecast has positive values", () => {
    const result = generateFunnel(makeFormData());
    const pipeline = generateSalesPipeline(result);
    expect(pipeline.forecast.monthlyDeals).toBeGreaterThan(0);
    expect(pipeline.forecast.avgDealSize).toBeGreaterThan(0);
    expect(pipeline.forecast.pipelineValue).toBeGreaterThan(0);
    expect(pipeline.forecast.expectedRevenue).toBeGreaterThan(0);
    expect(pipeline.forecast.cycleLength).toBeGreaterThan(0);
    expect(pipeline.forecast.winRate).toBeGreaterThan(0);
    expect(pipeline.forecast.winRate).toBeLessThanOrEqual(1);
  });

  it("higher budget = more monthly deals", () => {
    const low = generateSalesPipeline(generateFunnel(makeFormData({ budgetRange: "low" })));
    const high = generateSalesPipeline(generateFunnel(makeFormData({ budgetRange: "veryHigh" })));
    expect(high.forecast.monthlyDeals).toBeGreaterThan(low.forecast.monthlyDeals);
  });

  it("has at least 3 objection scripts", () => {
    const result = generateFunnel(makeFormData());
    const pipeline = generateSalesPipeline(result);
    expect(pipeline.objectionScripts.length).toBeGreaterThanOrEqual(3);
    for (const script of pipeline.objectionScripts) {
      expect(script.objection.he).toBeTruthy();
      expect(script.response.he).toBeTruthy();
      expect(script.technique).toBeTruthy();
    }
  });

  it("enterprise has extra objection about procurement", () => {
    const result = generateFunnel(makeFormData({ audienceType: "b2b", averagePrice: 5000 }));
    const pipeline = generateSalesPipeline(result);
    const hasProcurement = pipeline.objectionScripts.some((s) => s.technique === "Enable the champion");
    expect(hasProcurement).toBe(true);
  });

  it("has at least 3 automations", () => {
    const result = generateFunnel(makeFormData());
    const pipeline = generateSalesPipeline(result);
    expect(pipeline.automations.length).toBeGreaterThanOrEqual(3);
  });

  it("has closing tips", () => {
    const result = generateFunnel(makeFormData());
    const pipeline = generateSalesPipeline(result);
    expect(pipeline.closingTips.length).toBeGreaterThanOrEqual(3);
  });
});

describe("getSalesTypeLabel", () => {
  it("returns bilingual labels for all types", () => {
    for (const type of ["transactional", "consultative", "enterprise"] as const) {
      const label = getSalesTypeLabel(type);
      expect(label.he).toBeTruthy();
      expect(label.en).toBeTruthy();
    }
  });
});
