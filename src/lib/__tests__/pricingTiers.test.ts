import { describe, it, expect } from "vitest";
import { canAccess, getTierConfig, TIERS, PricingTier, Feature } from "../pricingTiers";

describe("canAccess", () => {
  it("free tier cannot access paid features", () => {
    expect(canAccess("free", "aiCoachMessages")).toBe(false);
    expect(canAccess("free", "pdfExport")).toBe(false);
    expect(canAccess("free", "whatsappTemplates")).toBe(false);
    expect(canAccess("free", "campaignCockpit")).toBe(false);
    expect(canAccess("free", "templatePublishing")).toBe(false);
  });

  it("pro tier can access pro features", () => {
    expect(canAccess("pro", "aiCoachMessages")).toBe(true);
    expect(canAccess("pro", "pdfExport")).toBe(true);
    expect(canAccess("pro", "maxFunnels")).toBe(true);
  });

  it("pro tier cannot access business features", () => {
    expect(canAccess("pro", "whatsappTemplates")).toBe(false);
    expect(canAccess("pro", "campaignCockpit")).toBe(false);
    expect(canAccess("pro", "templatePublishing")).toBe(false);
  });

  it("business tier can access all features", () => {
    const features: Feature[] = [
      "maxFunnels", "aiCoachMessages", "pdfExport",
      "whatsappTemplates", "campaignCockpit", "templatePublishing",
    ];
    for (const f of features) {
      expect(canAccess("business", f)).toBe(true);
    }
  });

  it("free tier can use limited funnels", () => {
    expect(canAccess("free", "maxFunnels")).toBe(true); // 3 > 0
  });
});

describe("getTierConfig", () => {
  it("returns correct tier", () => {
    expect(getTierConfig("pro").id).toBe("pro");
    expect(getTierConfig("business").priceMonthly).toBe(249);
  });

  it("falls back to free for unknown tier", () => {
    expect(getTierConfig("unknown" as PricingTier).id).toBe("free");
  });
});

describe("TIERS", () => {
  it("has exactly 3 tiers", () => {
    expect(TIERS).toHaveLength(3);
  });

  it("tiers are in ascending price order", () => {
    expect(TIERS[0].priceMonthly).toBeLessThan(TIERS[1].priceMonthly);
    expect(TIERS[1].priceMonthly).toBeLessThan(TIERS[2].priceMonthly);
  });

  it("each tier has bilingual name and price", () => {
    for (const tier of TIERS) {
      expect(tier.name.he).toBeTruthy();
      expect(tier.name.en).toBeTruthy();
      expect(tier.price.he).toBeTruthy();
      expect(tier.price.en).toBeTruthy();
    }
  });
});
