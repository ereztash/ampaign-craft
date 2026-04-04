import { describe, it, expect } from "vitest";
import { generateFunnel } from "../funnelEngine";
import { FormData, BusinessField, MainGoal, ExperienceLevel } from "@/types/funnel";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "instagram"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

describe("generateFunnel", () => {
  it("returns a valid FunnelResult with all required fields", () => {
    const result = generateFunnel(makeFormData());
    expect(result.id).toBeTruthy();
    expect(result.funnelName.he).toBeTruthy();
    expect(result.funnelName.en).toBeTruthy();
    expect(result.stages.length).toBeGreaterThanOrEqual(3);
    expect(result.totalBudget.min).toBeLessThan(result.totalBudget.max);
    expect(result.overallTips.length).toBeGreaterThan(0);
    expect(result.hookTips.length).toBeGreaterThan(0);
    expect(result.copyLab).toBeDefined();
    expect(result.kpis.length).toBeGreaterThan(0);
    expect(result.formData).toEqual(makeFormData());
  });

  it("stage budgets sum to approximately 100", () => {
    const result = generateFunnel(makeFormData());
    const total = result.stages.reduce((sum, s) => sum + s.budgetPercent, 0);
    expect(total).toBeGreaterThanOrEqual(95);
    expect(total).toBeLessThanOrEqual(105);
  });

  it("channel budgets sum to ~100 per stage", () => {
    const result = generateFunnel(makeFormData());
    for (const stage of result.stages) {
      if (stage.channels.length === 0) continue;
      const total = stage.channels.reduce((sum, c) => sum + c.budgetPercent, 0);
      expect(total).toBeGreaterThanOrEqual(90);
      expect(total).toBeLessThanOrEqual(110);
    }
  });

  // Budget ranges
  const budgetRanges: [string, number, number][] = [
    ["low", 500, 2000],
    ["medium", 2000, 10000],
    ["high", 10000, 50000],
    ["veryHigh", 50000, 200000],
  ];
  budgetRanges.forEach(([range, expectedMin, expectedMax]) => {
    it(`budget range "${range}" produces min=${expectedMin}, max=${expectedMax}`, () => {
      const result = generateFunnel(makeFormData({ budgetRange: range as FormData["budgetRange"] }));
      expect(result.totalBudget.min).toBe(expectedMin);
      expect(result.totalBudget.max).toBe(expectedMax);
    });
  });

  // B2B vs B2C
  it("B2B funnel includes LinkedIn channel", () => {
    const result = generateFunnel(makeFormData({ audienceType: "b2b" }));
    const allChannels = result.stages.flatMap((s) => s.channels.map((c) => c.channel));
    expect(allChannels).toContain("linkedIn");
  });

  it("B2C funnel includes Instagram", () => {
    const result = generateFunnel(makeFormData({ audienceType: "b2c" }));
    const allChannels = result.stages.flatMap((s) => s.channels.map((c) => c.channel));
    expect(allChannels).toContain("instagram");
  });

  // WhatsApp for B2C
  it("B2C funnel includes WhatsApp channel", () => {
    const result = generateFunnel(makeFormData({ audienceType: "b2c" }));
    const allChannels = result.stages.flatMap((s) => s.channels.map((c) => c.channel));
    expect(allChannels).toContain("whatsapp");
  });

  // Personal brand
  it("personalBrand field triggers personalBrand data", () => {
    const result = generateFunnel(makeFormData({ businessField: "personalBrand" }));
    expect(result.personalBrand).toBeDefined();
    expect(result.personalBrand!.positioningTips.length).toBeGreaterThan(0);
  });

  it("non-personalBrand field has no personalBrand data", () => {
    const result = generateFunnel(makeFormData({ businessField: "tech" }));
    expect(result.personalBrand).toBeUndefined();
  });

  // Neuro-storytelling always present
  it("neuro-storytelling data always generated", () => {
    const result = generateFunnel(makeFormData());
    expect(result.neuroStorytelling).toBeDefined();
    expect(result.neuroStorytelling!.vectors).toHaveLength(3);
    expect(result.neuroStorytelling!.promptTemplates.length).toBeGreaterThan(0);
  });

  // CopyLab
  it("copyLab has at least 3 formulas", () => {
    const result = generateFunnel(makeFormData());
    expect(result.copyLab.formulas.length).toBeGreaterThanOrEqual(3);
  });

  it("copyLab reader profile has valid level", () => {
    const result = generateFunnel(makeFormData());
    expect([1, 2, 3]).toContain(result.copyLab.readerProfile.level);
  });

  // Smoke test: all business fields × all goals
  const fields: BusinessField[] = ["fashion", "tech", "food", "services", "education", "health", "realEstate", "tourism", "personalBrand", "other"];
  const goals: MainGoal[] = ["awareness", "leads", "sales", "loyalty"];

  fields.forEach((field) => {
    goals.forEach((goal) => {
      it(`generates valid funnel for ${field} × ${goal}`, () => {
        const result = generateFunnel(makeFormData({ businessField: field, mainGoal: goal }));
        expect(result.stages.length).toBeGreaterThanOrEqual(3);
        expect(result.kpis.length).toBeGreaterThan(0);
        expect(result.hookTips.length).toBeGreaterThan(0);
      });
    });
  });

  // Experience levels
  it("beginner gets fewer hooks than advanced", () => {
    const beginner = generateFunnel(makeFormData({ experienceLevel: "beginner" }));
    const advanced = generateFunnel(makeFormData({ experienceLevel: "advanced" }));
    expect(beginner.hookTips.length).toBeLessThanOrEqual(advanced.hookTips.length);
  });

  // Goal-specific KPIs
  it("sales goal includes CPA metric", () => {
    const result = generateFunnel(makeFormData({ mainGoal: "sales" }));
    const kpiNames = result.kpis.map((k) => k.name.en);
    expect(kpiNames).toContain("Cost per Acquisition (CPA)");
  });

  it("awareness goal includes CPM metric", () => {
    const result = generateFunnel(makeFormData({ mainGoal: "awareness" }));
    const kpiNames = result.kpis.map((k) => k.name.en);
    expect(kpiNames).toContain("Cost per 1000 Impressions (CPM)");
  });

  it("loyalty/subscription goal includes retention rate", () => {
    const result = generateFunnel(makeFormData({ mainGoal: "loyalty", salesModel: "subscription" }));
    const kpiNames = result.kpis.map((k) => k.name.en);
    expect(kpiNames).toContain("Retention Rate");
  });
});
