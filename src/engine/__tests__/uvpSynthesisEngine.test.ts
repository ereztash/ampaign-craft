import { describe, it, expect } from "vitest";
import { synthesizeUVP } from "../uvpSynthesisEngine";
import { buildUserKnowledgeGraph } from "../userKnowledgeGraph";
import { FormData } from "@/types/funnel";
import type { DifferentiationResult } from "@/types/differentiation";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2b",
    ageRange: [25, 45],
    interests: "software",
    productDescription: "SaaS analytics platform",
    averagePrice: 299,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "email"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

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
      topCompetitors: ["Competitor A"],
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
      proof: "3x ROI in 90 days",
      antiStatement: "generic analytics",
      perRole: {},
    },
    tradeoffDeclarations: [],
    hybridCategory: {
      name: { he: "AI Analytics", en: "AI Analytics" },
      description: { he: "פתרון AI", en: "AI solution" },
      existingCategories: [],
      whitespace: "Simplicity + Power",
      rationale: "test",
    } as DifferentiationResult["hybridCategory"],
    contraryMetrics: [],
    executiveSummary: { he: "סיכום", en: "Summary" },
    nextSteps: [],
  } as unknown as DifferentiationResult;
}

describe("synthesizeUVP", () => {
  it("returns all 5 UVP formats", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = synthesizeUVP({ diffResult: null, copyLab: null, ukg });

    expect(result.oneLiner).toBeDefined();
    expect(result.linkedInBio).toBeDefined();
    expect(result.elevatorPitch).toBeDefined();
    expect(result.adHeadline).toBeDefined();
    expect(result.emailSubject).toBeDefined();
  });

  it("each variant has bilingual text", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = synthesizeUVP({ diffResult: null, copyLab: null, ukg });

    for (const variant of [result.oneLiner, result.linkedInBio, result.elevatorPitch, result.adHeadline, result.emailSubject]) {
      expect(variant.text.he).toBeTruthy();
      expect(variant.text.en).toBeTruthy();
    }
  });

  it("LinkedIn bio is clamped to 160 characters", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = synthesizeUVP({ diffResult: null, copyLab: null, ukg });

    expect(result.linkedInBio.text.he.length).toBeLessThanOrEqual(160);
    expect(result.linkedInBio.text.en.length).toBeLessThanOrEqual(160);
  });

  it("ad headline is clamped to 90 characters", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = synthesizeUVP({ diffResult: null, copyLab: null, ukg });

    expect(result.adHeadline.text.he.length).toBeLessThanOrEqual(90);
    expect(result.adHeadline.text.en.length).toBeLessThanOrEqual(90);
  });

  it("email subject is clamped to 78 characters", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = synthesizeUVP({ diffResult: null, copyLab: null, ukg });

    expect(result.emailSubject.text.he.length).toBeLessThanOrEqual(78);
    expect(result.emailSubject.text.en.length).toBeLessThanOrEqual(78);
  });

  it("uses mechanism from diffResult when available", () => {
    const formData = makeFormData();
    const diffResult = makeMinimalDiffResult();
    const ukg = buildUserKnowledgeGraph(formData, diffResult);
    const result = synthesizeUVP({ diffResult, copyLab: null, ukg });

    expect(result.mechanismAnchor).toBe("AI-powered analysis");
    expect(result.differentiationScore).toBeGreaterThan(50);
  });

  it("returns lower differentiationScore without diffResult", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = synthesizeUVP({ diffResult: null, copyLab: null, ukg });

    expect(result.differentiationScore).toBeLessThan(50);
  });

  it("each variant has channelFit array", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = synthesizeUVP({ diffResult: null, copyLab: null, ukg });

    for (const variant of [result.oneLiner, result.linkedInBio, result.elevatorPitch, result.adHeadline, result.emailSubject]) {
      expect(variant.channelFit.length).toBeGreaterThan(0);
    }
  });

  it("each variant has a strengthScore 0-100", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = synthesizeUVP({ diffResult: null, copyLab: null, ukg });

    for (const variant of [result.oneLiner, result.linkedInBio, result.elevatorPitch, result.adHeadline, result.emailSubject]) {
      expect(variant.strengthScore).toBeGreaterThanOrEqual(0);
      expect(variant.strengthScore).toBeLessThanOrEqual(100);
    }
  });

  it("provides improvement tips when diffResult is missing", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = synthesizeUVP({ diffResult: null, copyLab: null, ukg });

    expect(result.improvementTips.length).toBeGreaterThan(0);
    expect(result.improvementTips[0].he).toBeTruthy();
    expect(result.improvementTips[0].en).toBeTruthy();
  });

  it("charCount matches actual text length", () => {
    const formData = makeFormData();
    const ukg = buildUserKnowledgeGraph(formData);
    const result = synthesizeUVP({ diffResult: null, copyLab: null, ukg });

    expect(result.oneLiner.charCount.he).toBe(result.oneLiner.text.he.length);
    expect(result.oneLiner.charCount.en).toBe(result.oneLiner.text.en.length);
  });

  // Smoke test across all business fields
  const fields: FormData["businessField"][] = [
    "fashion", "tech", "food", "services", "education", "health", "realEstate", "tourism", "personalBrand", "other",
  ];
  fields.forEach((field) => {
    it(`generates valid UVP for ${field}`, () => {
      const formData = makeFormData({ businessField: field });
      const ukg = buildUserKnowledgeGraph(formData);
      const result = synthesizeUVP({ diffResult: null, copyLab: null, ukg });

      expect(result.oneLiner.text.he).toBeTruthy();
      expect(result.adHeadline.text.en).toBeTruthy();
    });
  });
});
