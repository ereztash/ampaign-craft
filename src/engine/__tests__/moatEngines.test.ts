import { describe, it, expect } from "vitest";
import { generateFunnel } from "../funnelEngine";
import { getNeuroClosingFrameworks, detectBuyerPersonality, BUYER_PERSONALITIES } from "../salesPipelineEngine";
import { calculateCostOfInaction } from "../costOfInactionEngine";
import { analyzeCopy } from "../copyQAEngine";
import { generateCLGStrategy } from "../clgEngine";
import { analyzeBrandVector } from "../brandVectorEngine";
import { generateRetentionFlywheel } from "../retentionFlywheelEngine";
import { FormData } from "@/types/funnel";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech", audienceType: "b2c", ageRange: [25, 45],
    interests: "", productDescription: "SaaS platform", averagePrice: 200,
    salesModel: "subscription", budgetRange: "medium", mainGoal: "sales",
    existingChannels: ["facebook"], experienceLevel: "intermediate", ...overrides,
  };
}

// ═══ MOAT 1: Neuro-Closing ═══
describe("getNeuroClosingFrameworks", () => {
  it("returns at least 5 frameworks", () => {
    const frameworks = getNeuroClosingFrameworks("consultative", "b2b");
    expect(frameworks.length).toBeGreaterThanOrEqual(5);
  });

  it("enterprise gets Champion framework", () => {
    const frameworks = getNeuroClosingFrameworks("enterprise", "b2b");
    expect(frameworks.some((f) => f.name.en.includes("Champion"))).toBe(true);
  });

  it("each framework has neuro-vector", () => {
    for (const f of getNeuroClosingFrameworks("consultative", "b2b")) {
      expect(["cortisol", "oxytocin", "dopamine"]).toContain(f.vector);
      expect(f.script.he).toBeTruthy();
      expect(f.script.en).toBeTruthy();
      expect(f.psychology.he).toBeTruthy();
    }
  });
});

// ═══ MOAT 9: Buyer Personality ═══
describe("detectBuyerPersonality", () => {
  it("b2b tech → analytical", () => {
    expect(detectBuyerPersonality("b2b", "tech")).toBe("analytical");
  });

  it("personalBrand → expressive", () => {
    expect(detectBuyerPersonality("b2c", "personalBrand")).toBe("expressive");
  });

  it("b2b services → amiable", () => {
    expect(detectBuyerPersonality("b2b", "services")).toBe("amiable");
  });

  it("BUYER_PERSONALITIES has 4 types", () => {
    expect(BUYER_PERSONALITIES).toHaveLength(4);
    for (const p of BUYER_PERSONALITIES) {
      expect(p.name.he).toBeTruthy();
      expect(p.sellTo.he).toBeTruthy();
      expect(p.avoid.he).toBeTruthy();
    }
  });
});

// ═══ MOAT 4: Cost of Inaction ═══
describe("calculateCostOfInaction", () => {
  it("returns positive waste values", () => {
    const result = generateFunnel(makeFormData());
    const coi = calculateCostOfInaction(result);
    expect(coi.monthlyWaste).toBeGreaterThan(0);
    expect(coi.annualWaste).toBe(coi.monthlyWaste * 12);
  });

  it("higher budget = higher waste", () => {
    const low = calculateCostOfInaction(generateFunnel(makeFormData({ budgetRange: "low" })));
    const high = calculateCostOfInaction(generateFunnel(makeFormData({ budgetRange: "veryHigh" })));
    expect(high.monthlyWaste).toBeGreaterThan(low.monthlyWaste);
  });

  it("has bilingual loss-framed messages", () => {
    const coi = calculateCostOfInaction(generateFunnel(makeFormData()));
    expect(coi.lossFramedMessage.he).toContain("₪");
    expect(coi.lossFramedMessage.en).toContain("₪");
    expect(coi.urgencyMessage.he).toBeTruthy();
  });

  it("beginner gets higher improvement %", () => {
    const beginner = calculateCostOfInaction(generateFunnel(makeFormData({ experienceLevel: "beginner" })));
    const advanced = calculateCostOfInaction(generateFunnel(makeFormData({ experienceLevel: "advanced" })));
    expect(beginner.improvementPercent).toBeGreaterThan(advanced.improvementPercent);
  });
});

// ═══ MOAT 2: Copy QA ═══
describe("analyzeCopy", () => {
  it("good copy scores higher than bad copy", () => {
    const good = analyzeCopy("הצטרפו ל-2,400 לקוחות מרוצים שכבר חוסכים ₪5,000 בחודש. התחילו עכשיו — נשארו 12 מקומות.");
    const bad = analyzeCopy("test");
    expect(good.score).toBeGreaterThan(bad.score);
  });

  it("empty copy scores low", () => {
    const result = analyzeCopy("test");
    expect(result.score).toBeLessThan(60);
  });

  it("too many exclamations triggers reactance", () => {
    const result = analyzeCopy("קנו עכשיו!!!! מהרו!!!! אחרון!!!!");
    expect(result.risks.some((r) => r.type === "reactance")).toBe(true);
  });

  it("no CTA triggers weak_cta risk", () => {
    const result = analyzeCopy("המוצר שלנו הוא המוצר הכי טוב בשוק. יש לנו הרבה לקוחות מרוצים.");
    expect(result.risks.some((r) => r.type === "weak_cta")).toBe(true);
  });

  it("returns risks and suggestions arrays", () => {
    const result = analyzeCopy("some text");
    expect(Array.isArray(result.risks)).toBe(true);
    expect(Array.isArray(result.suggestions)).toBe(true);
  });
});

// ═══ MOAT 6: CLG ═══
describe("generateCLGStrategy", () => {
  it("subscription model is CLG-suitable", () => {
    const result = generateCLGStrategy(makeFormData({ salesModel: "subscription", audienceType: "b2b" }));
    expect(result.suitable).toBe(true);
    expect(result.suitabilityScore).toBeGreaterThanOrEqual(40);
  });

  it("has 4-week roadmap", () => {
    const result = generateCLGStrategy(makeFormData());
    expect(result.roadmap.length).toBeGreaterThanOrEqual(4);
    for (const week of result.roadmap) {
      expect(week.title.he).toBeTruthy();
      expect(week.actions.length).toBeGreaterThan(0);
    }
  });

  it("predicts LTV impact", () => {
    const result = generateCLGStrategy(makeFormData());
    expect(result.ltvImpact.projected).toBeGreaterThan(result.ltvImpact.current);
    expect(result.ltvImpact.multiplier).toBeGreaterThan(1);
  });

  it("has community metrics", () => {
    const result = generateCLGStrategy(makeFormData());
    expect(result.metrics.length).toBeGreaterThanOrEqual(3);
  });
});

// ═══ MOAT 7: Brand-Neuro Matching ═══
describe("analyzeBrandVector", () => {
  it("returns vector distribution summing to ~100", () => {
    const result = analyzeBrandVector(generateFunnel(makeFormData()));
    const sum = result.vectorDistribution.cortisol + result.vectorDistribution.oxytocin + result.vectorDistribution.dopamine;
    expect(sum).toBeGreaterThanOrEqual(98);
    expect(sum).toBeLessThanOrEqual(102);
  });

  it("health → oxytocin-forward", () => {
    const result = analyzeBrandVector(generateFunnel(makeFormData({ businessField: "health" })));
    expect(result.vectorDistribution.oxytocin).toBeGreaterThan(result.vectorDistribution.cortisol);
  });

  it("has alignment score 0-100", () => {
    const result = analyzeBrandVector(generateFunnel(makeFormData()));
    expect(result.funnelAlignment).toBeGreaterThanOrEqual(0);
    expect(result.funnelAlignment).toBeLessThanOrEqual(100);
  });

  it("has rebalance tips", () => {
    const result = analyzeBrandVector(generateFunnel(makeFormData()));
    expect(result.rebalanceTips.length).toBeGreaterThan(0);
    expect(result.rebalanceTips[0].he).toBeTruthy();
  });
});

// ═══ MOAT 10: Retention Flywheel ═══
describe("generateRetentionFlywheel", () => {
  it("subscription → subscription flywheel", () => {
    const result = generateRetentionFlywheel(makeFormData({ salesModel: "subscription" }));
    expect(result.type).toBe("subscription");
  });

  it("oneTime b2c → transactional flywheel", () => {
    const result = generateRetentionFlywheel(makeFormData({ salesModel: "oneTime", audienceType: "b2c", businessField: "fashion" }));
    expect(result.type).toBe("transactional");
  });

  it("has 4 flywheel steps", () => {
    const result = generateRetentionFlywheel(makeFormData());
    expect(result.steps).toHaveLength(4);
    const phases = result.steps.map((s) => s.phase);
    expect(phases).toContain("trigger");
    expect(phases).toContain("action");
    expect(phases).toContain("reward");
    expect(phases).toContain("investment");
  });

  it("has churn reduction estimate", () => {
    const result = generateRetentionFlywheel(makeFormData());
    expect(result.churnReduction).toBeGreaterThan(0);
    expect(result.churnReduction).toBeLessThanOrEqual(50);
  });

  it("each step has bilingual content", () => {
    const result = generateRetentionFlywheel(makeFormData());
    for (const step of result.steps) {
      expect(step.name.he).toBeTruthy();
      expect(step.name.en).toBeTruthy();
      expect(step.description.he).toBeTruthy();
      expect(step.emoji).toBeTruthy();
    }
  });
});
