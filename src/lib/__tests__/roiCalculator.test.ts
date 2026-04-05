import { describe, it, expect } from "vitest";
import { calculateRoi } from "../roiCalculator";
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
