import { describe, it, expect } from "vitest";
import { generatePricingIntelligence } from "../pricingIntelligenceEngine";
import { buildUserKnowledgeGraph } from "../userKnowledgeGraph";
import { FormData } from "@/types/funnel";
import type { DifferentiationResult } from "@/types/differentiation";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "software",
    productDescription: "SaaS analytics platform",
    averagePrice: 299,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

/** Minimal DifferentiationResult that satisfies buildUserKnowledgeGraph's field accesses */
function makeMinimalDiffResult(): DifferentiationResult {
  return {
    id: "test",
    createdAt: new Date().toISOString(),
    formData: {
      businessName: "Test Co",
      industry: "tech",
      targetMarket: "b2b",
      companySize: "2-10",
      currentPositioning: "We help B2B companies grow",
      topCompetitors: ["Competitor A", "Competitor B"],
      priceRange: "mid",
      claimExamples: [],
      customerQuote: "",
      lostDealReason: "",
      negativeReviewTheme: "",
      returnReason: "",
      competitorOverlap: "",
      ashamedPains: [],
      hiddenValues: [],
      internalFriction: "",
      competitorArchetypes: [],
      buyingCommitteeMap: [],
      influenceNetwork: [],
      decisionLatency: "weeks",
      decisionSpeed: "days",
      discoveryChannels: [],
      confirmedTradeoffs: [],
      selectedHybridCategory: "",
    },
    claimVerificationScore: 80,
    differentiationStrength: 75,
    verifiedClaims: [],
    gapAnalysis: [],
    hiddenValueProfile: [],
    ashamedPainInsights: [],
    competitorMap: [],
    committeeNarratives: [],
    mechanismStatement: {
      oneLiner: { he: "אנחנו מציעים ניתוח AI", en: "We offer AI-powered analysis" },
      mechanism: "AI-powered analysis",
      proof: "Case studies with 3x ROI",
      antiStatement: "Not a generic analytics tool",
      perRole: {},
    },
    tradeoffDeclarations: [],
    hybridCategory: { name: { he: "AI Analytics", en: "AI Analytics" }, whitespace: "Simplicity + Power", rationale: "test", description: { he: "", en: "" }, existingCategories: [] } as unknown as DifferentiationResult["hybridCategory"],
    contraryMetrics: [],
    executiveSummary: { he: "סיכום", en: "Summary" },
    nextSteps: [],
  } as unknown as DifferentiationResult;
}

function makeGraph(formData: FormData) {
  return buildUserKnowledgeGraph(formData);
}

function makeGraphWithDiff(formData: FormData) {
  return buildUserKnowledgeGraph(formData, makeMinimalDiffResult());
}

describe("generatePricingIntelligence", () => {
  it("returns a complete result with all required fields", () => {
    const formData = makeFormData();
    const graph = makeGraph(formData);
    const result = generatePricingIntelligence(formData, graph);

    expect(result.pricingModel).toBeDefined();
    expect(result.tierStructure).toBeDefined();
    expect(result.offerStack).toBeDefined();
    expect(result.guarantee).toBeDefined();
    expect(result.priceFramingScripts.length).toBeGreaterThan(0);
    expect(result.competitivePosition).toBeDefined();
    expect(result.nextSteps.length).toBeGreaterThan(0);
  });

  it("recommends freemium for B2C subscription product", () => {
    const formData = makeFormData({ audienceType: "b2c", salesModel: "subscription" });
    const result = generatePricingIntelligence(formData, makeGraph(formData));
    expect(result.pricingModel.model).toBe("freemium");
  });

  it("recommends value_based for B2B with high differentiation", () => {
    const formData = makeFormData({ audienceType: "b2b" });
    const graph = makeGraphWithDiff(formData);
    const result = generatePricingIntelligence(formData, graph);
    expect(result.pricingModel.model).toBe("value_based");
  });

  it("recommends premium for education industry", () => {
    const formData = makeFormData({ businessField: "education", salesModel: "oneTime" });
    const result = generatePricingIntelligence(formData, makeGraph(formData));
    expect(result.pricingModel.model).toBe("premium");
  });

  it("tier structure has exactly 3 tiers", () => {
    const formData = makeFormData();
    const result = generatePricingIntelligence(formData, makeGraph(formData));
    expect(result.tierStructure.tiers).toHaveLength(3);
  });

  it("middle tier is marked as primary (decoy pricing)", () => {
    const formData = makeFormData();
    const result = generatePricingIntelligence(formData, makeGraph(formData));
    const primary = result.tierStructure.tiers.find((t) => t.isPrimary);
    expect(primary).toBeDefined();
    expect(result.tierStructure.highlightedTierIndex).toBe(1);
  });

  it("first tier is marked as decoy", () => {
    const formData = makeFormData();
    const result = generatePricingIntelligence(formData, makeGraph(formData));
    expect(result.tierStructure.tiers[0].isDecoy).toBe(true);
    expect(result.tierStructure.decoyTierIndex).toBe(0);
  });

  it("each tier has bilingual name and features", () => {
    const formData = makeFormData();
    const result = generatePricingIntelligence(formData, makeGraph(formData));
    for (const tier of result.tierStructure.tiers) {
      expect(tier.name.he).toBeTruthy();
      expect(tier.name.en).toBeTruthy();
      expect(tier.features.length).toBeGreaterThan(0);
      expect(tier.price).toBeGreaterThan(0);
    }
  });

  it("higher tiers have more features than lower tiers", () => {
    const formData = makeFormData();
    const result = generatePricingIntelligence(formData, makeGraph(formData));
    const [basic, pro, business] = result.tierStructure.tiers;
    expect(pro.features.length).toBeGreaterThan(basic.features.length);
    expect(business.features.length).toBeGreaterThan(pro.features.length);
  });

  it("annual price is lower than monthly price", () => {
    const formData = makeFormData({ salesModel: "subscription" });
    const result = generatePricingIntelligence(formData, makeGraph(formData));
    for (const tier of result.tierStructure.tiers) {
      expect(tier.annualPrice).toBeLessThan(tier.price * 12);
    }
  });

  it("offer stack has positive value-to-price ratio", () => {
    const formData = makeFormData({ averagePrice: 500 });
    const result = generatePricingIntelligence(formData, makeGraph(formData));
    expect(result.offerStack.valueToPrice).toBeGreaterThan(1);
    expect(result.offerStack.totalPerceivedValue).toBeGreaterThan(result.offerStack.actualPrice);
  });

  it("offer stack hormozi equation has positive score", () => {
    const formData = makeFormData();
    const result = generatePricingIntelligence(formData, makeGraph(formData));
    expect(result.offerStack.valueEquation.totalScore).toBeGreaterThan(0);
    expect(result.offerStack.valueEquation.dreamOutcome).toBeGreaterThan(0);
    expect(result.offerStack.valueEquation.perceivedLikelihood).toBeGreaterThan(0);
  });

  it("guarantee has bilingual script and trust score", () => {
    const formData = makeFormData();
    const result = generatePricingIntelligence(formData, makeGraph(formData));
    expect(result.guarantee.script.he).toBeTruthy();
    expect(result.guarantee.script.en).toBeTruthy();
    expect(result.guarantee.trustScore).toBeGreaterThan(0);
  });

  it("subscription model returns subscription economics", () => {
    const formData = makeFormData({ salesModel: "subscription" });
    const result = generatePricingIntelligence(formData, makeGraph(formData));
    expect(result.subscriptionEconomics).not.toBeNull();
    expect(result.subscriptionEconomics!.projectedLTV).toBeGreaterThan(0);
    expect(result.subscriptionEconomics!.ltvCacRatio).toBeGreaterThan(0);
  });

  it("one-time model has no subscription economics", () => {
    const formData = makeFormData({ salesModel: "oneTime" });
    const result = generatePricingIntelligence(formData, makeGraph(formData));
    expect(result.subscriptionEconomics).toBeNull();
  });

  it("price framing scripts fill in template placeholders", () => {
    const formData = makeFormData({ averagePrice: 500 });
    const result = generatePricingIntelligence(formData, makeGraph(formData));
    for (const script of result.priceFramingScripts) {
      expect(script.script.he).not.toContain("{price}");
      expect(script.script.en).not.toContain("{price}");
    }
  });

  it("competitive position is premium for high differentiation B2B", () => {
    const formData = makeFormData({ audienceType: "b2b" });
    const graph = makeGraphWithDiff(formData);
    const result = generatePricingIntelligence(formData, graph);
    expect(result.competitivePosition.position).toBe("premium");
  });

  // Smoke test: all business fields
  const fields: FormData["businessField"][] = [
    "fashion", "tech", "food", "services", "education", "health", "realEstate", "tourism", "personalBrand", "other",
  ];
  fields.forEach((field) => {
    it(`generates valid result for ${field}`, () => {
      const formData = makeFormData({ businessField: field });
      const result = generatePricingIntelligence(formData, makeGraph(formData));
      expect(result.pricingModel.model).toBeTruthy();
      expect(result.tierStructure.tiers.length).toBeGreaterThan(0);
    });
  });
});
