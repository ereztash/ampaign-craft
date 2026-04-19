import { describe, it, expect } from "vitest";
import { getSmartDefaults } from "../smartDefaults";
import type { BusinessField, MainGoal } from "@/types/funnel";

const ALL_FIELDS: BusinessField[] = [
  "fashion", "tech", "food", "services", "education",
  "health", "realEstate", "tourism", "personalBrand", "other",
];

describe("smartDefaults", () => {
  describe("getSmartDefaults", () => {
    it("returns a FormData object with businessField matching input", () => {
      const result = getSmartDefaults("tech", "leads");
      expect(result.businessField).toBe("tech");
    });

    it("returns a FormData object with mainGoal matching input", () => {
      const result = getSmartDefaults("food", "sales");
      expect(result.mainGoal).toBe("sales");
    });

    it("always sets experienceLevel to beginner", () => {
      for (const field of ALL_FIELDS) {
        const result = getSmartDefaults(field, "awareness");
        expect(result.experienceLevel).toBe("beginner");
      }
    });

    it("returns valid audienceType (b2b or b2c) for each industry", () => {
      for (const field of ALL_FIELDS) {
        const result = getSmartDefaults(field, "awareness");
        expect(["b2b", "b2c"]).toContain(result.audienceType);
      }
    });

    it("returns valid ageRange tuple [min, max] with min < max", () => {
      for (const field of ALL_FIELDS) {
        const result = getSmartDefaults(field, "awareness");
        expect(Array.isArray(result.ageRange)).toBe(true);
        expect(result.ageRange).toHaveLength(2);
        expect(result.ageRange[0]).toBeLessThan(result.ageRange[1]);
        expect(result.ageRange[0]).toBeGreaterThanOrEqual(18);
        expect(result.ageRange[1]).toBeLessThanOrEqual(70);
      }
    });

    it("returns valid salesModel for each industry", () => {
      const validModels = ["oneTime", "subscription", "leads", "recurring"];
      for (const field of ALL_FIELDS) {
        const result = getSmartDefaults(field, "awareness");
        expect(validModels).toContain(result.salesModel);
      }
    });

    it("returns valid budgetRange for each industry", () => {
      const validRanges = ["low", "medium", "high"];
      for (const field of ALL_FIELDS) {
        const result = getSmartDefaults(field, "awareness");
        expect(validRanges).toContain(result.budgetRange);
      }
    });

    it("returns at least one channel for each industry", () => {
      for (const field of ALL_FIELDS) {
        const result = getSmartDefaults(field, "awareness");
        expect(Array.isArray(result.existingChannels)).toBe(true);
        expect(result.existingChannels.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("returns empty productDescription", () => {
      for (const field of ALL_FIELDS) {
        const result = getSmartDefaults(field, "awareness");
        expect(result.productDescription).toBe("");
      }
    });

    it("returns averagePrice as 0", () => {
      const result = getSmartDefaults("tech", "leads");
      expect(result.averagePrice).toBe(0);
    });

    it("returns empty interests string", () => {
      const result = getSmartDefaults("fashion", "brand");
      expect(result.interests).toBe("");
    });

    // ── Industry-specific spot checks ────────────────────────────────────

    it("tech defaults to b2b audienceType", () => {
      expect(getSmartDefaults("tech", "leads").audienceType).toBe("b2b");
    });

    it("fashion defaults to b2c audienceType", () => {
      expect(getSmartDefaults("fashion", "sales").audienceType).toBe("b2c");
    });

    it("tech defaults to subscription salesModel", () => {
      expect(getSmartDefaults("tech", "leads").salesModel).toBe("subscription");
    });

    it("realEstate defaults to leads salesModel", () => {
      expect(getSmartDefaults("realEstate", "leads").salesModel).toBe("leads");
    });

    it("personalBrand defaults to low budgetRange", () => {
      expect(getSmartDefaults("personalBrand", "brand").budgetRange).toBe("low");
    });

    it("tech includes linkedIn in channels", () => {
      const result = getSmartDefaults("tech", "leads");
      expect(result.existingChannels).toContain("linkedIn");
    });

    it("fashion includes instagram in channels", () => {
      const result = getSmartDefaults("fashion", "sales");
      expect(result.existingChannels).toContain("instagram");
    });
  });
});
