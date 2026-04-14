import { describe, it, expect } from "vitest";
import {
  canAccess,
  getTierConfig,
  getEffectivePrice,
  getLimitValue,
  isApproachingLimit,
  getAnnualSavings,
  TIERS,
  type PricingTier,
  type Feature,
} from "../pricingTiers";

describe("canAccess", () => {
  it("free tier cannot access paid boolean features", () => {
    expect(canAccess("free", "pdfExport")).toBe(false);
    expect(canAccess("free", "campaignCockpit")).toBe(false);
    expect(canAccess("free", "templatePublishing")).toBe(false);
    expect(canAccess("free", "brandedReports")).toBe(false);
    expect(canAccess("free", "prioritySupport")).toBe(false);
  });

  it("free tier cannot use AI coach (0 messages)", () => {
    expect(canAccess("free", "aiCoachMessages")).toBe(false);
  });

  it("free tier cannot use WhatsApp (0 templates)", () => {
    expect(canAccess("free", "whatsappTemplates")).toBe(false);
  });

  it("free tier can use limited funnels (3 > 0)", () => {
    expect(canAccess("free", "maxFunnels")).toBe(true);
  });

  it("pro tier can access core pro features", () => {
    expect(canAccess("pro", "aiCoachMessages")).toBe(true);
    expect(canAccess("pro", "pdfExport")).toBe(true);
    expect(canAccess("pro", "maxFunnels")).toBe(true);
    expect(canAccess("pro", "whatsappTemplates")).toBe(true); // 10/mo
  });

  it("pro tier cannot access business-only features", () => {
    expect(canAccess("pro", "campaignCockpit")).toBe(false);
    expect(canAccess("pro", "templatePublishing")).toBe(false);
    expect(canAccess("pro", "brandedReports")).toBe(false);
    expect(canAccess("pro", "prioritySupport")).toBe(false);
  });

  it("business tier can access all features", () => {
    const features: Feature[] = [
      "maxFunnels", "aiCoachMessages", "pdfExport",
      "whatsappTemplates", "campaignCockpit", "templatePublishing",
      "differentiationAgent", "brandedReports", "prioritySupport",
    ];
    for (const f of features) {
      expect(canAccess("business", f)).toBe(true);
    }
  });

  it("handles -1 (unlimited) as accessible", () => {
    expect(getTierConfig("business").limits.aiCoachMessages).toBe(-1);
    expect(canAccess("business", "aiCoachMessages")).toBe(true);

    expect(getTierConfig("business").limits.whatsappTemplates).toBe(-1);
    expect(canAccess("business", "whatsappTemplates")).toBe(true);
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

describe("getEffectivePrice", () => {
  it("returns priceMonthly for monthly cycle", () => {
    expect(getEffectivePrice("pro", "monthly")).toBe(99);
    expect(getEffectivePrice("business", "monthly")).toBe(249);
    expect(getEffectivePrice("free", "monthly")).toBe(0);
  });

  it("returns priceAnnualMonthly for annual cycle", () => {
    expect(getEffectivePrice("pro", "annual")).toBe(79);
    expect(getEffectivePrice("business", "annual")).toBe(199);
    expect(getEffectivePrice("free", "annual")).toBe(0);
  });

  it("annual price is lower than monthly for paid tiers", () => {
    for (const tier of ["pro", "business"] as PricingTier[]) {
      expect(getEffectivePrice(tier, "annual")).toBeLessThan(getEffectivePrice(tier, "monthly"));
    }
  });
});

describe("getLimitValue", () => {
  it("returns raw numeric limit", () => {
    expect(getLimitValue("free", "maxFunnels")).toBe(3);
    expect(getLimitValue("pro", "aiCoachMessages")).toBe(75);
    expect(getLimitValue("business", "aiCoachMessages")).toBe(-1);
  });

  it("returns boolean for boolean features", () => {
    expect(getLimitValue("free", "pdfExport")).toBe(false);
    expect(getLimitValue("pro", "pdfExport")).toBe(true);
  });
});

describe("isApproachingLimit", () => {
  it("returns true when usage >= 80% of limit", () => {
    expect(isApproachingLimit("pro", "aiCoachMessages", 60)).toBe(true);   // 60/75 = 80%
    expect(isApproachingLimit("pro", "aiCoachMessages", 75)).toBe(true);   // 100%
  });

  it("returns false when usage < 80% of limit", () => {
    expect(isApproachingLimit("pro", "aiCoachMessages", 59)).toBe(false);  // 59/75 = 78.7%
  });

  it("returns false for unlimited features (-1)", () => {
    expect(isApproachingLimit("business", "aiCoachMessages", 10000)).toBe(false);
  });

  it("returns false for boolean features", () => {
    expect(isApproachingLimit("pro", "pdfExport", 1)).toBe(false);
  });
});

describe("getAnnualSavings", () => {
  it("returns 0 for free tier", () => {
    expect(getAnnualSavings("free")).toBe(0);
  });

  it("returns positive savings for paid tiers", () => {
    expect(getAnnualSavings("pro")).toBe((99 - 79) * 12);      // ₪240
    expect(getAnnualSavings("business")).toBe((249 - 199) * 12); // ₪600
  });
});

describe("TIERS", () => {
  it("has exactly 3 tiers", () => {
    expect(TIERS).toHaveLength(3);
  });

  it("tiers are in ascending monthly price order", () => {
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

  it("annual total equals annualMonthly * 12", () => {
    for (const tier of TIERS) {
      expect(tier.priceAnnualTotal).toBe(tier.priceAnnualMonthly * 12);
    }
  });

  it("annual savings pct is correct (or 0 for free)", () => {
    for (const tier of TIERS) {
      if (tier.priceMonthly === 0) {
        expect(tier.annualSavingsPct).toBe(0);
      } else {
        const expected = Math.round((1 - tier.priceAnnualMonthly / tier.priceMonthly) * 100);
        expect(tier.annualSavingsPct).toBe(expected);
      }
    }
  });

  it("all tiers have trialDays defined", () => {
    for (const tier of TIERS) {
      expect(typeof tier.trialDays).toBe("number");
    }
  });

  it("paid tiers have trial days > 0", () => {
    for (const tier of TIERS.filter((t) => t.priceMonthly > 0)) {
      expect(tier.trialDays).toBeGreaterThan(0);
    }
  });
});
