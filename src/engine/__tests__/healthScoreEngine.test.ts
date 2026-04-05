import { describe, it, expect } from "vitest";
import { calculateHealthScore, getHealthScoreColor } from "../healthScoreEngine";
import { generateFunnel } from "../funnelEngine";
import { FormData } from "@/types/funnel";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech", audienceType: "b2c", ageRange: [25, 45],
    interests: "marketing", productDescription: "SaaS platform", averagePrice: 200,
    salesModel: "subscription", budgetRange: "medium", mainGoal: "sales",
    existingChannels: ["facebook", "instagram", "email"], experienceLevel: "intermediate",
    ...overrides,
  };
}

describe("calculateHealthScore", () => {
  it("returns score between 0 and 100", () => {
    const result = generateFunnel(makeFormData());
    const score = calculateHealthScore(result);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it("has exactly 4 breakdown categories", () => {
    const result = generateFunnel(makeFormData());
    const score = calculateHealthScore(result);
    expect(score.breakdown).toHaveLength(4);
    const categories = score.breakdown.map((b) => b.category);
    expect(categories).toContain("strategy");
    expect(categories).toContain("channels");
    expect(categories).toContain("budget");
    expect(categories).toContain("funnel");
  });

  it("complete form data yields higher score than minimal", () => {
    const complete = generateFunnel(makeFormData());
    const minimal = generateFunnel(makeFormData({
      existingChannels: [], productDescription: "", averagePrice: 0, budgetRange: "low",
    }));
    const scoreComplete = calculateHealthScore(complete);
    const scoreMinimal = calculateHealthScore(minimal);
    expect(scoreComplete.total).toBeGreaterThan(scoreMinimal.total);
  });

  it("returns correct tier labels", () => {
    const result = generateFunnel(makeFormData());
    const score = calculateHealthScore(result);
    expect(["critical", "needs-work", "good", "excellent"]).toContain(score.tier);
  });

  it("each breakdown has bilingual label", () => {
    const result = generateFunnel(makeFormData());
    const score = calculateHealthScore(result);
    for (const b of score.breakdown) {
      expect(b.label.he).toBeTruthy();
      expect(b.label.en).toBeTruthy();
    }
  });

  it("breakdown scores sum to total", () => {
    const result = generateFunnel(makeFormData());
    const score = calculateHealthScore(result);
    const sum = score.breakdown.reduce((s, b) => s + b.score, 0);
    expect(sum).toBe(score.total);
  });
});

describe("getHealthScoreColor", () => {
  it("returns CSS variable string", () => {
    expect(getHealthScoreColor(90)).toContain("var(--");
    expect(getHealthScoreColor(50)).toContain("var(--");
    expect(getHealthScoreColor(20)).toContain("var(--");
  });
});
