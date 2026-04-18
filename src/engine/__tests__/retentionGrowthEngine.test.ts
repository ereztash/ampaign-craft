import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateRetentionStrategy, ENGINE_MANIFEST } from "../retentionGrowthEngine";
import type { FormData } from "@/types/funnel";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../blackboard/contract", () => ({
  writeContext: vi.fn(async () => {}),
  conceptKey: vi.fn((ns: string, type: string, id: string) => `${ns}-${type}-${id}`),
}));

vi.mock("../retentionKnowledge", async () => {
  const actual = await vi.importActual("../retentionKnowledge") as any;
  return actual;
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform for marketing automation",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "instagram"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeGraph(overrides: Partial<any> = {}): any {
  return {
    business: {
      field: "tech",
      audience: "b2c",
      ageRange: [25, 45],
      interests: ["marketing"],
      product: "SaaS platform",
      price: 200,
      salesModel: "subscription",
      budget: "medium",
      goal: "sales",
      channels: ["facebook"],
      experience: "intermediate",
      ...overrides,
    },
    differentiation: null,
    derived: {
      framingPreference: "system1",
      pricePerception: "mid",
      identityStatement: { he: "", en: "" },
      competitorCount: 0,
      industryPainPoints: [],
    },
  };
}

// ═══════════════════════════════════════════════
// ENGINE_MANIFEST
// ═══════════════════════════════════════════════

describe("ENGINE_MANIFEST", () => {
  it("has the correct engine name", () => {
    expect(ENGINE_MANIFEST.name).toBe("retentionGrowthEngine");
  });

  it("stage is design", () => {
    expect(ENGINE_MANIFEST.stage).toBe("design");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });
});

// ═══════════════════════════════════════════════
// generateRetentionStrategy — Structure
// ═══════════════════════════════════════════════

describe("generateRetentionStrategy — result structure", () => {
  it("returns all top-level fields", () => {
    const result = generateRetentionStrategy(makeFormData(), makeGraph());
    expect(result.onboarding).toBeDefined();
    expect(result.triggerMap).toBeDefined();
    expect(result.referralBlueprint).toBeDefined();
    expect(result.churnPlaybook).toBeDefined();
    expect(result.growthLoop).toBeDefined();
    expect(result.loyaltyStrategy).toBeDefined();
    expect(result.projectedImpact).toBeDefined();
  });

  it("onboarding has type, steps, ahaMetric, and timeToValue", () => {
    const result = generateRetentionStrategy(makeFormData(), makeGraph());
    expect(result.onboarding.type).toBeTruthy();
    expect(Array.isArray(result.onboarding.steps)).toBe(true);
    expect(result.onboarding.ahaMetric).toBeDefined();
    expect(result.onboarding.ahaMetric.he).toBeTruthy();
    expect(result.onboarding.ahaMetric.en).toBeTruthy();
    expect(result.onboarding.timeToValue).toBeTruthy();
  });

  it("triggerMap is a non-empty array", () => {
    const result = generateRetentionStrategy(makeFormData(), makeGraph());
    expect(Array.isArray(result.triggerMap)).toBe(true);
    expect(result.triggerMap.length).toBeGreaterThan(0);
  });

  it("churnPlaybook has signals, winbackSequence, and saveOffers", () => {
    const result = generateRetentionStrategy(makeFormData(), makeGraph());
    expect(Array.isArray(result.churnPlaybook.signals)).toBe(true);
    expect(Array.isArray(result.churnPlaybook.winbackSequence)).toBe(true);
    expect(Array.isArray(result.churnPlaybook.saveOffers)).toBe(true);
  });

  it("growthLoop has type, label, steps, and kFactor", () => {
    const result = generateRetentionStrategy(makeFormData(), makeGraph());
    expect(result.growthLoop.type).toBeTruthy();
    expect(result.growthLoop.label).toBeDefined();
    expect(Array.isArray(result.growthLoop.steps)).toBe(true);
    expect(result.growthLoop.kFactor).toBeTruthy();
  });

  it("projectedImpact has currentEstimatedChurn, projectedChurnReduction, ltvMultiplier, additionalRevenue", () => {
    const result = generateRetentionStrategy(makeFormData(), makeGraph());
    expect(typeof result.projectedImpact.currentEstimatedChurn).toBe("number");
    expect(typeof result.projectedImpact.projectedChurnReduction).toBe("number");
    expect(typeof result.projectedImpact.ltvMultiplier).toBe("number");
    expect(result.projectedImpact.additionalRevenue.he).toBeTruthy();
    expect(result.projectedImpact.additionalRevenue.en).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════
// Business type detection
// ═══════════════════════════════════════════════

describe("generateRetentionStrategy — business type detection", () => {
  it("SaaS subscription + tech → saas onboarding type", () => {
    const result = generateRetentionStrategy(
      makeFormData({ salesModel: "subscription", businessField: "tech" }),
      makeGraph(),
    );
    expect(result.onboarding.type).toBe("saas");
  });

  it("personalBrand → creator onboarding type", () => {
    const result = generateRetentionStrategy(
      makeFormData({ businessField: "personalBrand", salesModel: "oneTime" }),
      makeGraph(),
    );
    expect(result.onboarding.type).toBe("creator");
  });

  it("education field → creator onboarding type", () => {
    const result = generateRetentionStrategy(
      makeFormData({ businessField: "education", salesModel: "oneTime" }),
      makeGraph(),
    );
    expect(result.onboarding.type).toBe("creator");
  });

  it("b2b audience → services onboarding type", () => {
    const result = generateRetentionStrategy(
      makeFormData({ audienceType: "b2b", businessField: "services", salesModel: "oneTime" }),
      makeGraph(),
    );
    expect(result.onboarding.type).toBe("services");
  });

  it("b2c fashion → ecommerce onboarding type", () => {
    const result = generateRetentionStrategy(
      makeFormData({ audienceType: "b2c", businessField: "fashion", salesModel: "oneTime" }),
      makeGraph(),
    );
    expect(result.onboarding.type).toBe("ecommerce");
  });
});

// ═══════════════════════════════════════════════
// Growth loop selection
// ═══════════════════════════════════════════════

describe("generateRetentionStrategy — growth loop selection", () => {
  it("personalBrand → community loop", () => {
    const result = generateRetentionStrategy(makeFormData({ businessField: "personalBrand" }), makeGraph());
    expect(result.growthLoop.type).toBe("community");
  });

  it("education → community loop", () => {
    const result = generateRetentionStrategy(makeFormData({ businessField: "education" }), makeGraph());
    expect(result.growthLoop.type).toBe("community");
  });

  it("subscription model → content loop", () => {
    const result = generateRetentionStrategy(
      makeFormData({ salesModel: "subscription", businessField: "tech" }),
      makeGraph(),
    );
    expect(result.growthLoop.type).toBe("content");
  });

  it("b2c + medium budget → viral loop", () => {
    const result = generateRetentionStrategy(
      makeFormData({ audienceType: "b2c", budgetRange: "medium", businessField: "food", salesModel: "oneTime" }),
      makeGraph(),
    );
    expect(result.growthLoop.type).toBe("viral");
  });

  it("b2c + low budget → paid loop (fallback)", () => {
    const result = generateRetentionStrategy(
      makeFormData({ audienceType: "b2c", budgetRange: "low", businessField: "food", salesModel: "oneTime" }),
      makeGraph(),
    );
    expect(result.growthLoop.type).toBe("paid");
  });
});

// ═══════════════════════════════════════════════
// Loyalty strategy
// ═══════════════════════════════════════════════

describe("generateRetentionStrategy — loyalty strategy", () => {
  it("subscription model → tiered loyalty program", () => {
    const result = generateRetentionStrategy(makeFormData({ salesModel: "subscription" }), makeGraph());
    expect(result.loyaltyStrategy.type).toBe("tiers");
    expect(result.loyaltyStrategy.tiers).toBeDefined();
    expect(result.loyaltyStrategy.tiers!.length).toBeGreaterThan(0);
  });

  it("non-subscription → points loyalty program", () => {
    const result = generateRetentionStrategy(makeFormData({ salesModel: "oneTime" }), makeGraph());
    expect(result.loyaltyStrategy.type).toBe("points");
  });

  it("tiered loyalty has Silver, Gold, Platinum tiers", () => {
    const result = generateRetentionStrategy(makeFormData({ salesModel: "subscription" }), makeGraph());
    const tierNames = result.loyaltyStrategy.tiers!.map((t) => t.name.en);
    expect(tierNames).toContain("Silver");
    expect(tierNames).toContain("Gold");
    expect(tierNames).toContain("Platinum");
  });
});

// ═══════════════════════════════════════════════
// Churn playbook winback sequence
// ═══════════════════════════════════════════════

describe("generateRetentionStrategy — churn playbook", () => {
  it("winback sequence has 3 steps (day 0, 3, 7)", () => {
    const result = generateRetentionStrategy(makeFormData(), makeGraph());
    expect(result.churnPlaybook.winbackSequence).toHaveLength(3);
    const days = result.churnPlaybook.winbackSequence.map((s) => s.day);
    expect(days).toContain(0);
    expect(days).toContain(3);
    expect(days).toContain(7);
  });

  it("save offers are non-empty", () => {
    const result = generateRetentionStrategy(makeFormData(), makeGraph());
    expect(result.churnPlaybook.saveOffers.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════
// Projected impact
// ═══════════════════════════════════════════════

describe("generateRetentionStrategy — projected impact", () => {
  it("subscription has higher churn reduction than non-subscription", () => {
    const sub = generateRetentionStrategy(makeFormData({ salesModel: "subscription" }), makeGraph());
    const one = generateRetentionStrategy(makeFormData({ salesModel: "oneTime" }), makeGraph());
    expect(sub.projectedImpact.projectedChurnReduction).toBeGreaterThan(one.projectedImpact.projectedChurnReduction);
  });

  it("ltvMultiplier is a positive number", () => {
    const result = generateRetentionStrategy(makeFormData(), makeGraph());
    expect(result.projectedImpact.ltvMultiplier).toBeGreaterThan(0);
  });

  it("additionalRevenue contains price information in string", () => {
    const result = generateRetentionStrategy(makeFormData({ averagePrice: 500 }), makeGraph());
    expect(result.projectedImpact.additionalRevenue.he).toContain("₪");
  });
});

// ═══════════════════════════════════════════════
// Referral blueprint
// ═══════════════════════════════════════════════

describe("generateRetentionStrategy — referral blueprint", () => {
  it("has model, label, mechanics, reward, template, bestTiming", () => {
    const result = generateRetentionStrategy(makeFormData(), makeGraph());
    const rb = result.referralBlueprint;
    expect(["two_sided", "one_sided", "tiered"]).toContain(rb.model);
    expect(rb.label).toBeDefined();
    expect(rb.mechanics).toBeDefined();
    expect(rb.reward).toBeDefined();
    expect(rb.template).toBeDefined();
    expect(rb.bestTiming).toBeDefined();
  });

  it("subscription model → two_sided referral", () => {
    const result = generateRetentionStrategy(makeFormData({ salesModel: "subscription" }), makeGraph({ salesModel: "subscription" }));
    expect(result.referralBlueprint.model).toBe("two_sided");
  });
});
