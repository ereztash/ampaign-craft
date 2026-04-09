import { describe, it, expect } from "vitest";
import { calculateRoi, calculateChannelROI, attributeConversions, comparePlans } from "../roiCalculator";
import type { ChannelMetrics, ConversionPath } from "../roiCalculator";
import { FormData } from "@/types/funnel";

function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech", audienceType: "b2c", ageRange: [25, 45],
    interests: "", productDescription: "test", averagePrice: 200,
    salesModel: "subscription", budgetRange: "medium", mainGoal: "sales",
    existingChannels: [], experienceLevel: "intermediate", ...overrides,
  };
}

const FIELDS = ["fashion", "tech", "food", "services", "education", "health", "realEstate", "tourism", "personalBrand", "other"];
const BUDGETS = ["low", "medium", "high", "veryHigh"];

describe("calculateRoi", () => {
  it("returns positive monthly impact", () => {
    const roi = calculateRoi(makeFormData());
    expect(roi.monthlyImpact).toBeGreaterThan(0);
    expect(roi.annualImpact).toBe(roi.monthlyImpact * 12);
  });

  FIELDS.forEach((field) => {
    it(`produces valid ROI for ${field}`, () => {
      const roi = calculateRoi(makeFormData({ businessField: field as FormData["businessField"] }));
      expect(roi.monthlyImpact).toBeGreaterThanOrEqual(0);
      expect(roi.potentialSaving.he).toContain("₪");
    });
  });

  BUDGETS.forEach((budget) => {
    it(`handles budget range "${budget}"`, () => {
      const roi = calculateRoi(makeFormData({ budgetRange: budget as FormData["budgetRange"] }));
      expect(roi.monthlyImpact).toBeGreaterThanOrEqual(0);
    });
  });

  it("beginner gets higher improvement % than advanced", () => {
    const beginner = calculateRoi(makeFormData({ experienceLevel: "beginner" }));
    const advanced = calculateRoi(makeFormData({ experienceLevel: "advanced" }));
    expect(beginner.improvementPercent).toBeGreaterThan(advanced.improvementPercent);
  });

  it("has bilingual strings", () => {
    const roi = calculateRoi(makeFormData());
    expect(roi.currentWaste.he).toBeTruthy();
    expect(roi.currentWaste.en).toBeTruthy();
    expect(roi.potentialSaving.he).toBeTruthy();
    expect(roi.potentialSaving.en).toBeTruthy();
  });
});

describe("calculateChannelROI", () => {
  it("calculates ROI per channel", () => {
    const channels: ChannelMetrics[] = [
      { channel: "Facebook", spend: 1000, conversions: 20, revenue: 3000 },
      { channel: "Google", spend: 2000, conversions: 10, revenue: 2500 },
    ];
    const result = calculateChannelROI(channels);

    expect(result.channelROIs).toHaveLength(2);
    expect(result.channelROIs[0].roi).toBe(2); // (3000-1000)/1000
    expect(result.channelROIs[1].roi).toBe(0.25); // (2500-2000)/2000
    expect(result.bestChannel).toBe("Facebook");
    expect(result.worstChannel).toBe("Google");
    expect(result.totalSpend).toBe(3000);
    expect(result.totalRevenue).toBe(5500);
  });

  it("handles zero spend gracefully", () => {
    const channels: ChannelMetrics[] = [
      { channel: "Organic", spend: 0, conversions: 50, revenue: 5000 },
    ];
    const result = calculateChannelROI(channels);
    expect(result.channelROIs[0].roi).toBe(0);
    expect(result.totalROI).toBe(0);
  });
});

describe("attributeConversions", () => {
  const paths: ConversionPath[] = [
    {
      touchpoints: [
        { channel: "Facebook", timestamp: 100 },
        { channel: "Google", timestamp: 200 },
        { channel: "Email", timestamp: 300 },
      ],
      conversionValue: 300,
    },
  ];

  it("first_touch attributes all to first channel", () => {
    const result = attributeConversions(paths, "first_touch");
    expect(result["Facebook"]).toBe(300);
    expect(result["Google"]).toBeUndefined();
  });

  it("last_touch attributes all to last channel", () => {
    const result = attributeConversions(paths, "last_touch");
    expect(result["Email"]).toBe(300);
    expect(result["Facebook"]).toBeUndefined();
  });

  it("linear distributes equally", () => {
    const result = attributeConversions(paths, "linear");
    expect(result["Facebook"]).toBe(100);
    expect(result["Google"]).toBe(100);
    expect(result["Email"]).toBe(100);
  });

  it("time_decay gives more credit to recent touchpoints", () => {
    const result = attributeConversions(paths, "time_decay");
    expect(result["Email"]).toBeGreaterThan(result["Google"]);
    expect(result["Google"]).toBeGreaterThan(result["Facebook"]);
    // Total should still equal conversion value
    const total = Object.values(result).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(300, 1);
  });
});

describe("comparePlans", () => {
  it("compares two plans correctly", () => {
    const result = comparePlans(
      { name: "Plan A", budget: 5000, stages: 5, channels: ["Facebook", "Google", "Email"] },
      { name: "Plan B", budget: 8000, stages: 4, channels: ["Facebook", "TikTok"] }
    );
    expect(result.budgetDiff).toBe(3000);
    expect(result.stageDiff).toBe(-1);
    expect(result.channelOverlap).toBeGreaterThan(0);
    expect(result.channelOverlap).toBeLessThan(1);
  });
});
