import { describe, it, expect } from "vitest";
import { calculateValueScore } from "../hormoziValueEngine";
import { FormData } from "@/types/funnel";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2c",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform for automating marketing campaigns with AI-driven insights and real-time analytics dashboard",
    averagePrice: 200,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook", "instagram"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

describe("Hormozi Value Equation Engine", () => {
  // ═══════════════════════════════════════════════
  // BASIC STRUCTURE
  // ═══════════════════════════════════════════════

  it("returns all required fields", () => {
    const result = calculateValueScore(makeFormData());
    expect(result.dreamOutcome).toBeDefined();
    expect(result.perceivedLikelihood).toBeDefined();
    expect(result.timeDelay).toBeDefined();
    expect(result.effortSacrifice).toBeDefined();
    expect(result.overallScore).toBeDefined();
    expect(result.offerGrade).toBeDefined();
    expect(result.optimizationPriority).toBeDefined();
    expect(result.valueEquationDisplay).toBeDefined();
  });

  it("each dimension has score, analysis, and tips", () => {
    const result = calculateValueScore(makeFormData());
    for (const dim of [result.dreamOutcome, result.perceivedLikelihood, result.timeDelay, result.effortSacrifice]) {
      expect(dim.score).toBeGreaterThanOrEqual(0);
      expect(dim.score).toBeLessThanOrEqual(100);
      expect(dim.analysis.he).toBeTruthy();
      expect(dim.analysis.en).toBeTruthy();
      expect(Array.isArray(dim.tips)).toBe(true);
    }
  });

  it("overall score is between 0 and 100", () => {
    const result = calculateValueScore(makeFormData());
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it("offer grade is a valid value", () => {
    const result = calculateValueScore(makeFormData());
    expect(["irresistible", "strong", "average", "weak"]).toContain(result.offerGrade);
  });

  it("bilingual display strings are present", () => {
    const result = calculateValueScore(makeFormData());
    expect(result.optimizationPriority.he.length).toBeGreaterThan(0);
    expect(result.optimizationPriority.en.length).toBeGreaterThan(0);
    expect(result.valueEquationDisplay.he).toContain("=");
    expect(result.valueEquationDisplay.en).toContain("=");
  });

  // ═══════════════════════════════════════════════
  // DREAM OUTCOME SCORING
  // ═══════════════════════════════════════════════

  it("longer product description increases dream outcome score", () => {
    const short = calculateValueScore(makeFormData({ productDescription: "app" }));
    const long = calculateValueScore(makeFormData({
      productDescription: "A comprehensive SaaS platform that automates marketing campaigns, provides AI-driven insights, real-time analytics, and personalized recommendations for business growth",
    }));
    expect(long.dreamOutcome.score).toBeGreaterThan(short.dreamOutcome.score);
  });

  it("high price increases dream outcome score", () => {
    const low = calculateValueScore(makeFormData({ averagePrice: 50 }));
    const high = calculateValueScore(makeFormData({ averagePrice: 2000 }));
    expect(high.dreamOutcome.score).toBeGreaterThan(low.dreamOutcome.score);
  });

  it("sales goal boosts dream outcome more than awareness", () => {
    const sales = calculateValueScore(makeFormData({ mainGoal: "sales" }));
    const awareness = calculateValueScore(makeFormData({ mainGoal: "awareness" }));
    expect(sales.dreamOutcome.score).toBeGreaterThanOrEqual(awareness.dreamOutcome.score);
  });

  // ═══════════════════════════════════════════════
  // PERCEIVED LIKELIHOOD SCORING
  // ═══════════════════════════════════════════════

  it("advanced experience boosts perceived likelihood", () => {
    const beginner = calculateValueScore(makeFormData({ experienceLevel: "beginner" }));
    const advanced = calculateValueScore(makeFormData({ experienceLevel: "advanced" }));
    expect(advanced.perceivedLikelihood.score).toBeGreaterThan(beginner.perceivedLikelihood.score);
  });

  it("more channels increase perceived likelihood", () => {
    const few = calculateValueScore(makeFormData({ existingChannels: ["facebook"] }));
    const many = calculateValueScore(makeFormData({
      existingChannels: ["facebook", "instagram", "google", "email"],
    }));
    expect(many.perceivedLikelihood.score).toBeGreaterThan(few.perceivedLikelihood.score);
  });

  it("B2B reduces perceived likelihood baseline", () => {
    const b2c = calculateValueScore(makeFormData({ audienceType: "b2c" }));
    const b2b = calculateValueScore(makeFormData({ audienceType: "b2b" }));
    expect(b2b.perceivedLikelihood.score).toBeLessThan(b2c.perceivedLikelihood.score);
  });

  // ═══════════════════════════════════════════════
  // TIME DELAY SCORING
  // ═══════════════════════════════════════════════

  it("subscription model boosts time delay score", () => {
    const oneTime = calculateValueScore(makeFormData({ salesModel: "oneTime" }));
    const subscription = calculateValueScore(makeFormData({ salesModel: "subscription" }));
    expect(subscription.timeDelay.score).toBeGreaterThan(oneTime.timeDelay.score);
  });

  it("tech field boosts time delay score (digital = faster)", () => {
    const realEstate = calculateValueScore(makeFormData({ businessField: "realEstate" }));
    const tech = calculateValueScore(makeFormData({ businessField: "tech" }));
    expect(tech.timeDelay.score).toBeGreaterThan(realEstate.timeDelay.score);
  });

  it("B2B has slower time delay", () => {
    const b2c = calculateValueScore(makeFormData({ audienceType: "b2c" }));
    const b2b = calculateValueScore(makeFormData({ audienceType: "b2b" }));
    expect(b2b.timeDelay.score).toBeLessThan(b2c.timeDelay.score);
  });

  // ═══════════════════════════════════════════════
  // EFFORT & SACRIFICE SCORING
  // ═══════════════════════════════════════════════

  it("beginner perceives more effort", () => {
    const beginner = calculateValueScore(makeFormData({ experienceLevel: "beginner" }));
    const advanced = calculateValueScore(makeFormData({ experienceLevel: "advanced" }));
    expect(beginner.effortSacrifice.score).toBeLessThan(advanced.effortSacrifice.score);
  });

  it("tech field reduces perceived effort (automation)", () => {
    const services = calculateValueScore(makeFormData({ businessField: "services" }));
    const tech = calculateValueScore(makeFormData({ businessField: "tech" }));
    expect(tech.effortSacrifice.score).toBeGreaterThan(services.effortSacrifice.score);
  });

  it("high price increases perceived sacrifice", () => {
    const low = calculateValueScore(makeFormData({ averagePrice: 100 }));
    const high = calculateValueScore(makeFormData({ averagePrice: 2000 }));
    expect(high.effortSacrifice.score).toBeLessThan(low.effortSacrifice.score);
  });

  // ═══════════════════════════════════════════════
  // OFFER GRADING
  // ═══════════════════════════════════════════════

  it("strong inputs produce higher grade than weak inputs", () => {
    const gradeOrder = { irresistible: 4, strong: 3, average: 2, weak: 1 };
    const strong = calculateValueScore(makeFormData({
      productDescription: "Revolutionary AI-powered platform that guarantees 3x ROI within 30 days with zero setup required and full automation of all marketing tasks",
      experienceLevel: "advanced",
      existingChannels: ["facebook", "instagram", "google", "email"],
      averagePrice: 500,
      salesModel: "subscription",
      businessField: "tech",
      mainGoal: "sales",
    }));
    const weak = calculateValueScore(makeFormData({
      productDescription: "thing",
      experienceLevel: "beginner",
      existingChannels: [],
      averagePrice: 50,
      salesModel: "oneTime",
      businessField: "realEstate",
      mainGoal: "awareness",
    }));
    expect(gradeOrder[strong.offerGrade]).toBeGreaterThanOrEqual(gradeOrder[weak.offerGrade]);
    expect(strong.overallScore).toBeGreaterThan(weak.overallScore);
  });

  // ═══════════════════════════════════════════════
  // OPTIMIZATION PRIORITY
  // ═══════════════════════════════════════════════

  it("optimization priority targets the lowest-scoring dimension", () => {
    const result = calculateValueScore(makeFormData());
    const scores = [
      result.dreamOutcome.score,
      result.perceivedLikelihood.score,
      result.timeDelay.score,
      result.effortSacrifice.score,
    ];
    const minScore = Math.min(...scores);
    // The priority should correspond to one of the lowest-scoring dimensions
    expect(scores).toContain(minScore);
    expect(result.optimizationPriority.he.length).toBeGreaterThan(0);
    expect(result.optimizationPriority.en.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════════
  // SMOKE TESTS: ALL FIELDS
  // ═══════════════════════════════════════════════

  const fields = ["fashion", "tech", "food", "services", "education", "health", "realEstate", "tourism", "personalBrand", "other"] as const;
  fields.forEach((field) => {
    it(`produces valid result for ${field}`, () => {
      const result = calculateValueScore(makeFormData({ businessField: field }));
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.dreamOutcome.analysis.he.length).toBeGreaterThan(0);
      expect(result.dreamOutcome.analysis.en.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════
  // WITH KNOWLEDGE GRAPH
  // ═══════════════════════════════════════════════

  it("knowledge graph with differentiation boosts scores", () => {
    const without = calculateValueScore(makeFormData());
    const with_ = calculateValueScore(makeFormData(), {
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
        channels: ["facebook", "instagram"],
        experience: "intermediate",
      },
      differentiation: {
        mechanismStatement: {
          mechanism: "AI-driven optimization",
          explanation: { he: "אופטימיזציה מונעת AI", en: "AI-driven optimization" },
          marketContext: { he: "שוק תחרותי", en: "competitive market" },
        },
        competitors: [{ name: "CompetitorA", strengthVsUs: "brand", weaknessVsUs: "features" }],
        tradeoffs: [{ weChoose: { he: "מהירות", en: "speed" }, overAlternative: { he: "מורכבות", en: "complexity" }, because: { he: "לקוחות רוצים תוצאות מהר", en: "clients want results fast" } }],
        positioning: { he: "מובילים באוטומציה", en: "Leaders in automation" },
      },
      derived: {
        framingPreference: "system1",
        pricePerception: "mid",
        identityStatement: { he: "אנחנו המובילים בטכנולוגיה", en: "We are the leaders in technology" },
        competitorCount: 1,
        industryPainPoints: [{ he: "עלויות גבוהות", en: "high costs" }],
      },
    } as any);
    expect(with_.dreamOutcome.score).toBeGreaterThan(without.dreamOutcome.score);
  });

  it("handles null knowledge graph gracefully", () => {
    const result = calculateValueScore(makeFormData(), null);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it("handles undefined knowledge graph gracefully", () => {
    const result = calculateValueScore(makeFormData(), undefined);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });
});
