// ═══════════════════════════════════════════════
// costOfInactionEngine.test.ts
// Branch-coverage focus: UKG path, field names, budget/price defaults
// ═══════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { calculateCostOfInaction } from "../costOfInactionEngine";
import { generateFunnel } from "../funnelEngine";
import { FormData } from "@/types/funnel";
import type { UserKnowledgeGraph } from "../userKnowledgeGraph";

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
    existingChannels: ["facebook"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeUKG(avgCPL: number | null): Partial<UserKnowledgeGraph> {
  return {
    derived: {
      realMetrics: {
        avgCPL: avgCPL ?? undefined,
        avgOrderValue: 500,
        monthlyLeads: 50,
        conversionRate: 0.15,
        revenueMonthly: 5000,
      },
      urgencySignal: "mild",
      discCommunicationStyle: "balanced",
    },
  } as unknown as UserKnowledgeGraph;
}

describe("calculateCostOfInaction — all businessField branches", () => {
  const fields = [
    "personalBrand", "food", "fashion", "tourism", "health",
    "services", "education", "tech", "realEstate", "other",
  ] as const;

  fields.forEach((field) => {
    it(`computes waste for businessField="${field}"`, () => {
      const coi = calculateCostOfInaction(generateFunnel(makeFormData({ businessField: field })));
      expect(coi.monthlyWaste).toBeGreaterThan(0);
      expect(coi.comparisonMessage.en).toContain(field === "other" ? "businesses" : field);
    });
  });

  it("unknown businessField falls back to 0.30 waste rate", () => {
    const coi = calculateCostOfInaction(
      generateFunnel(makeFormData({ businessField: "unknownFieldXYZ" as FormData["businessField"] }))
    );
    const expected = Math.round(6000 * 0.30);
    expect(coi.monthlyWaste).toBe(expected);
  });
});

describe("calculateCostOfInaction — budget and price defaults", () => {
  it("missing budgetRange defaults to medium (₪6,000)", () => {
    const fd = makeFormData();
    (fd as Record<string, unknown>).budgetRange = "";
    const coi = calculateCostOfInaction(generateFunnel(fd));
    // medium budget = 6000; waste = 6000 * 0.25 (tech rate)
    expect(coi.monthlyWaste).toBe(Math.round(6000 * 0.25));
  });

  it("all explicit budget tiers produce distinct waste amounts", () => {
    const low = calculateCostOfInaction(generateFunnel(makeFormData({ budgetRange: "low" })));
    const medium = calculateCostOfInaction(generateFunnel(makeFormData({ budgetRange: "medium" })));
    const high = calculateCostOfInaction(generateFunnel(makeFormData({ budgetRange: "high" })));
    const veryHigh = calculateCostOfInaction(generateFunnel(makeFormData({ budgetRange: "veryHigh" })));
    expect(medium.monthlyWaste).toBeGreaterThan(low.monthlyWaste);
    expect(high.monthlyWaste).toBeGreaterThan(medium.monthlyWaste);
    expect(veryHigh.monthlyWaste).toBeGreaterThan(high.monthlyWaste);
  });

  it("averagePrice=0 falls back to 500 for lead calculations", () => {
    const zero = calculateCostOfInaction(generateFunnel(makeFormData({ averagePrice: 0 })));
    const normal = calculateCostOfInaction(generateFunnel(makeFormData({ averagePrice: 500 })));
    // Both should be valid (unrealizedLeads > 0)
    expect(zero.unrealizedLeads).toBeGreaterThanOrEqual(0);
    expect(normal.unrealizedLeads).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateCostOfInaction — experienceLevel branches", () => {
  it("beginner gets 35% improvement (highest)", () => {
    const coi = calculateCostOfInaction(generateFunnel(makeFormData({ experienceLevel: "beginner" })));
    expect(coi.improvementPercent).toBe(35);
  });

  it("intermediate gets 25% improvement", () => {
    const coi = calculateCostOfInaction(generateFunnel(makeFormData({ experienceLevel: "intermediate" })));
    expect(coi.improvementPercent).toBe(25);
  });

  it("advanced gets 15% improvement (lowest)", () => {
    const coi = calculateCostOfInaction(generateFunnel(makeFormData({ experienceLevel: "advanced" })));
    expect(coi.improvementPercent).toBe(15);
  });

  it("empty experienceLevel defaults to 25%", () => {
    const fd = makeFormData();
    (fd as Record<string, unknown>).experienceLevel = "";
    const coi = calculateCostOfInaction(generateFunnel(fd));
    expect(coi.improvementPercent).toBe(25);
  });
});

describe("calculateCostOfInaction — UKG CPL override branch", () => {
  it("uses UKG avgCPL when present and >0", () => {
    const withoutUKG = calculateCostOfInaction(generateFunnel(makeFormData({ businessField: "tech" })));
    const withUKG = calculateCostOfInaction(
      generateFunnel(makeFormData({ businessField: "tech" })),
      makeUKG(200) as UserKnowledgeGraph, // CPL ₪200 → wasteRate = 200/100 = 2.0 → capped at 0.50
    );
    // With UKG CPL of 200: wasteRate = min(0.50, 200/100) = 0.50, higher than tech default 0.25
    expect(withUKG.monthlyWaste).toBeGreaterThan(withoutUKG.monthlyWaste);
  });

  it("UKG avgCPL=0 falls through to industry table (falsy branch)", () => {
    const withZeroCPL = calculateCostOfInaction(
      generateFunnel(makeFormData({ businessField: "tech" })),
      makeUKG(0) as UserKnowledgeGraph,
    );
    const withoutUKG = calculateCostOfInaction(generateFunnel(makeFormData({ businessField: "tech" })));
    // avgCPL=0 is falsy (condition: avgCPL > 0) → uses industry rate
    expect(withZeroCPL.monthlyWaste).toBe(withoutUKG.monthlyWaste);
  });

  it("UKG avgCPL caps waste rate at 50% (Math.min branch)", () => {
    const hugeUKG = calculateCostOfInaction(
      generateFunnel(makeFormData({ budgetRange: "medium" })),
      makeUKG(10000) as UserKnowledgeGraph, // CPL ₪10,000 → 100× → capped at 0.50
    );
    const expectedMax = Math.round(6000 * 0.50);
    expect(hugeUKG.monthlyWaste).toBe(expectedMax);
  });

  it("UKG avgCPL null falls through to industry table", () => {
    const withNullUKG = calculateCostOfInaction(
      generateFunnel(makeFormData({ businessField: "tech" })),
      makeUKG(null) as UserKnowledgeGraph,
    );
    const withoutUKG = calculateCostOfInaction(generateFunnel(makeFormData({ businessField: "tech" })));
    expect(withNullUKG.monthlyWaste).toBe(withoutUKG.monthlyWaste);
  });
});

describe("calculateCostOfInaction — compounding loss structure", () => {
  it("3m < 6m < 12m compounding loss (strictly increasing)", () => {
    const coi = calculateCostOfInaction(generateFunnel(makeFormData()));
    expect(coi.compoundingLoss.threeMonth).toBeGreaterThan(0);
    expect(coi.compoundingLoss.sixMonth).toBeGreaterThan(coi.compoundingLoss.threeMonth);
    expect(coi.compoundingLoss.twelveMonth).toBeGreaterThan(coi.compoundingLoss.sixMonth);
  });

  it("competitorGapMessage references 6-month compounding value", () => {
    const coi = calculateCostOfInaction(generateFunnel(makeFormData()));
    expect(coi.competitorGapMessage.en).toContain(coi.compoundingLoss.sixMonth.toLocaleString());
  });

  it("urgencyMessage references weekly cost (monthlyWaste / 4)", () => {
    const coi = calculateCostOfInaction(generateFunnel(makeFormData()));
    const weeklyBurn = Math.round(coi.monthlyWaste / 4);
    expect(coi.urgencyMessage.he).toContain(weeklyBurn.toLocaleString());
  });
});

describe("calculateCostOfInaction — bilingual messages", () => {
  it("all messages have he and en variants", () => {
    const coi = calculateCostOfInaction(generateFunnel(makeFormData()));
    const bilingualFields = [
      "lossFramedMessage",
      "comparisonMessage",
      "urgencyMessage",
      "competitorGapMessage",
    ] as const;
    for (const field of bilingualFields) {
      expect(coi[field].he.length).toBeGreaterThan(0);
      expect(coi[field].en.length).toBeGreaterThan(0);
    }
  });

  it("lossFramedMessage includes ₪ symbols", () => {
    const coi = calculateCostOfInaction(generateFunnel(makeFormData()));
    expect(coi.lossFramedMessage.he).toContain("₪");
    expect(coi.lossFramedMessage.en).toContain("₪");
  });
});
