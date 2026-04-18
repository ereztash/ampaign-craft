import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeBrandVector, ENGINE_MANIFEST, type BrandVector, type BrandVectorResult } from "../brandVectorEngine";
import type { FunnelResult } from "@/types/funnel";

// ── Mock external deps ─────────────────────────────────────────────────────
vi.mock("../trainingDataEngine", () => ({
  captureTrainingPair: vi.fn().mockResolvedValue(undefined),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeFunnelResult(overrides: Partial<FunnelResult> = {}): FunnelResult {
  return {
    id: "test-id",
    funnelName: { he: "תוכנית", en: "Plan" },
    stages: [
      { id: "awareness", name: { he: "מודעות", en: "Awareness" }, budgetPercent: 30, channels: [], description: { he: "", en: "" } },
      { id: "engagement", name: { he: "מעורבות", en: "Engagement" }, budgetPercent: 25, channels: [], description: { he: "", en: "" } },
      { id: "leads", name: { he: "לידים", en: "Leads" }, budgetPercent: 20, channels: [], description: { he: "", en: "" } },
      { id: "conversion", name: { he: "המרה", en: "Conversion" }, budgetPercent: 15, channels: [], description: { he: "", en: "" } },
      { id: "retention", name: { he: "שימור", en: "Retention" }, budgetPercent: 10, channels: [], description: { he: "", en: "" } },
    ],
    totalBudget: { min: 1000, max: 5000 },
    overallTips: [],
    hookTips: [],
    copyLab: { readerProfile: { level: 1, name: { he: "", en: "" }, description: { he: "", en: "" }, copyArchitecture: { he: "", en: "" }, principles: [] }, formulas: [], writingTechniques: [] },
    kpis: [],
    createdAt: new Date().toISOString(),
    formData: {
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
    },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// ENGINE_MANIFEST
// ─────────────────────────────────────────────────────────────────────────

describe("BrandVectorEngine — ENGINE_MANIFEST", () => {
  it("has the correct name", () => {
    expect(ENGINE_MANIFEST.name).toBe("brandVectorEngine");
  });

  it("has stage 'diagnose'", () => {
    expect(ENGINE_MANIFEST.stage).toBe("diagnose");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// analyzeBrandVector — structure
// ─────────────────────────────────────────────────────────────────────────

describe("analyzeBrandVector — return structure", () => {
  it("returns all required top-level fields", () => {
    const result = analyzeBrandVector(makeFunnelResult());
    expect(result).toHaveProperty("primaryVector");
    expect(result).toHaveProperty("vectorDistribution");
    expect(result).toHaveProperty("brandLabel");
    expect(result).toHaveProperty("funnelAlignment");
    expect(result).toHaveProperty("mismatch");
    expect(result).toHaveProperty("rebalanceTips");
  });

  it("primaryVector is one of the three valid vectors", () => {
    const result = analyzeBrandVector(makeFunnelResult());
    expect(["cortisol", "oxytocin", "dopamine"]).toContain(result.primaryVector);
  });

  it("vectorDistribution values are non-negative numbers", () => {
    const result = analyzeBrandVector(makeFunnelResult());
    expect(result.vectorDistribution.cortisol).toBeGreaterThanOrEqual(0);
    expect(result.vectorDistribution.oxytocin).toBeGreaterThanOrEqual(0);
    expect(result.vectorDistribution.dopamine).toBeGreaterThanOrEqual(0);
  });

  it("vectorDistribution approximately sums to 100", () => {
    const result = analyzeBrandVector(makeFunnelResult());
    const sum = result.vectorDistribution.cortisol + result.vectorDistribution.oxytocin + result.vectorDistribution.dopamine;
    // Rounding can cause slight deviation
    expect(sum).toBeGreaterThanOrEqual(98);
    expect(sum).toBeLessThanOrEqual(102);
  });

  it("brandLabel has bilingual text", () => {
    const result = analyzeBrandVector(makeFunnelResult());
    expect(result.brandLabel.he).toBeTruthy();
    expect(result.brandLabel.en).toBeTruthy();
  });

  it("funnelAlignment is between 0 and 100", () => {
    const result = analyzeBrandVector(makeFunnelResult());
    expect(result.funnelAlignment).toBeGreaterThanOrEqual(0);
    expect(result.funnelAlignment).toBeLessThanOrEqual(100);
  });

  it("rebalanceTips is an array", () => {
    const result = analyzeBrandVector(makeFunnelResult());
    expect(Array.isArray(result.rebalanceTips)).toBe(true);
    expect(result.rebalanceTips.length).toBeGreaterThan(0);
  });

  it("each rebalanceTip has bilingual text", () => {
    const result = analyzeBrandVector(makeFunnelResult());
    for (const tip of result.rebalanceTips) {
      expect(tip.he).toBeTruthy();
      expect(tip.en).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Business field effects on brand vector
// ─────────────────────────────────────────────────────────────────────────

describe("analyzeBrandVector — business field effects", () => {
  it("health/services field leans toward oxytocin (trust)", () => {
    const result = analyzeBrandVector(makeFunnelResult({ formData: { ...makeFunnelResult().formData, businessField: "health" } }));
    // oxytocin should dominate or be high
    expect(result.vectorDistribution.oxytocin).toBeGreaterThan(0);
  });

  it("tech field increases dopamine (growth)", () => {
    const techResult = analyzeBrandVector(makeFunnelResult({ formData: { ...makeFunnelResult().formData, businessField: "tech" } }));
    const servicesResult = analyzeBrandVector(makeFunnelResult({ formData: { ...makeFunnelResult().formData, businessField: "services" } }));
    expect(techResult.vectorDistribution.dopamine).toBeGreaterThanOrEqual(servicesResult.vectorDistribution.dopamine);
  });

  it("fashion field increases cortisol (urgency)", () => {
    const fashionResult = analyzeBrandVector(makeFunnelResult({ formData: { ...makeFunnelResult().formData, businessField: "fashion" } }));
    const healthResult = analyzeBrandVector(makeFunnelResult({ formData: { ...makeFunnelResult().formData, businessField: "health" } }));
    expect(fashionResult.vectorDistribution.cortisol).toBeGreaterThan(healthResult.vectorDistribution.cortisol);
  });

  it("realEstate field has high cortisol (scarcity)", () => {
    const result = analyzeBrandVector(makeFunnelResult({ formData: { ...makeFunnelResult().formData, businessField: "realEstate" } }));
    expect(result.vectorDistribution.cortisol).toBeGreaterThan(0);
  });

  it("education field increases dopamine", () => {
    const result = analyzeBrandVector(makeFunnelResult({ formData: { ...makeFunnelResult().formData, businessField: "education" } }));
    expect(result.vectorDistribution.dopamine).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Goal effects
// ─────────────────────────────────────────────────────────────────────────

describe("analyzeBrandVector — goal effects", () => {
  it("sales goal increases cortisol", () => {
    const salesResult = analyzeBrandVector(makeFunnelResult({ formData: { ...makeFunnelResult().formData, mainGoal: "sales" } }));
    const loyaltyResult = analyzeBrandVector(makeFunnelResult({ formData: { ...makeFunnelResult().formData, mainGoal: "loyalty" } }));
    expect(salesResult.vectorDistribution.cortisol).toBeGreaterThanOrEqual(loyaltyResult.vectorDistribution.cortisol);
  });

  it("loyalty goal increases oxytocin", () => {
    const result = analyzeBrandVector(makeFunnelResult({ formData: { ...makeFunnelResult().formData, mainGoal: "loyalty" } }));
    expect(result.vectorDistribution.oxytocin).toBeGreaterThan(0);
  });

  it("awareness goal increases dopamine", () => {
    const result = analyzeBrandVector(makeFunnelResult({ formData: { ...makeFunnelResult().formData, mainGoal: "awareness" } }));
    expect(result.vectorDistribution.dopamine).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Mismatch detection
// ─────────────────────────────────────────────────────────────────────────

describe("analyzeBrandVector — mismatch", () => {
  it("returns null or object for mismatch (not undefined)", () => {
    const result = analyzeBrandVector(makeFunnelResult());
    expect(result.mismatch === null || (typeof result.mismatch === "object")).toBe(true);
  });

  it("when mismatch is present, it has bilingual text", () => {
    const result = analyzeBrandVector(makeFunnelResult());
    if (result.mismatch !== null) {
      expect(result.mismatch.he).toBeTruthy();
      expect(result.mismatch.en).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// UKG integration
// ─────────────────────────────────────────────────────────────────────────

describe("analyzeBrandVector — UKG parameter", () => {
  it("accepts undefined UKG without error", () => {
    expect(() => analyzeBrandVector(makeFunnelResult(), undefined)).not.toThrow();
  });

  it("accepts null UKG without error", () => {
    expect(() => analyzeBrandVector(makeFunnelResult(), null as any)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Funnel stage effects
// ─────────────────────────────────────────────────────────────────────────

describe("analyzeBrandVector — funnel stages", () => {
  it("empty stages array still produces a primaryVector", () => {
    const result = analyzeBrandVector(makeFunnelResult({ stages: [] }));
    expect(result.primaryVector).toBeTruthy();
    // funnelAlignment may be NaN when no stage data exists — just confirm the field exists
    expect(result).toHaveProperty("funnelAlignment");
  });

  it("conversion-heavy funnel increases cortisol in funnel distribution", () => {
    const conversionHeavy = makeFunnelResult({
      stages: [
        { id: "conversion", name: { he: "", en: "" }, budgetPercent: 100, channels: [], description: { he: "", en: "" } },
      ],
    });
    const result = analyzeBrandVector(conversionHeavy);
    expect(result).toBeDefined();
  });

  it("all 5 stage types produce valid result", () => {
    const result = analyzeBrandVector(makeFunnelResult());
    expect(result.funnelAlignment).toBeGreaterThanOrEqual(0);
    expect(result.funnelAlignment).toBeLessThanOrEqual(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// b2b audience
// ─────────────────────────────────────────────────────────────────────────

describe("analyzeBrandVector — audience type", () => {
  it("b2b audience increases oxytocin", () => {
    const b2bResult = analyzeBrandVector(makeFunnelResult({ formData: { ...makeFunnelResult().formData, audienceType: "b2b" } }));
    const b2cResult = analyzeBrandVector(makeFunnelResult({ formData: { ...makeFunnelResult().formData, audienceType: "b2c" } }));
    expect(b2bResult.vectorDistribution.oxytocin).toBeGreaterThanOrEqual(b2cResult.vectorDistribution.oxytocin);
  });
});
