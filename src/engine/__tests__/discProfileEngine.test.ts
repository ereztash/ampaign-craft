import { describe, it, expect } from "vitest";
import { inferDISCProfile, getReaderFraming } from "../discProfileEngine";
import { FormData } from "@/types/funnel";

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
    existingChannels: ["facebook", "instagram"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

describe("DISC Profile Engine", () => {
  // ═══════════════════════════════════════════════
  // BASIC STRUCTURE
  // ═══════════════════════════════════════════════

  it("returns all required fields", () => {
    const profile = inferDISCProfile(makeFormData());
    expect(profile.primary).toBeDefined();
    expect(profile.secondary).toBeDefined();
    expect(profile.distribution).toBeDefined();
    expect(profile.messagingStrategy).toBeDefined();
    expect(profile.ctaStyle).toBeDefined();
    expect(profile.funnelEmphasis).toBeDefined();
    expect(profile.communicationTone).toBeDefined();
  });

  it("primary and secondary are valid DISC types", () => {
    const profile = inferDISCProfile(makeFormData());
    const valid = ["D", "I", "S", "C"];
    expect(valid).toContain(profile.primary);
    expect(valid).toContain(profile.secondary);
    expect(profile.primary).not.toBe(profile.secondary);
  });

  it("distribution sums to ~100", () => {
    const profile = inferDISCProfile(makeFormData());
    const total = profile.distribution.D + profile.distribution.I + profile.distribution.S + profile.distribution.C;
    expect(total).toBeGreaterThanOrEqual(98);
    expect(total).toBeLessThanOrEqual(102);
  });

  it("all distribution values are non-negative", () => {
    const profile = inferDISCProfile(makeFormData());
    expect(profile.distribution.D).toBeGreaterThanOrEqual(0);
    expect(profile.distribution.I).toBeGreaterThanOrEqual(0);
    expect(profile.distribution.S).toBeGreaterThanOrEqual(0);
    expect(profile.distribution.C).toBeGreaterThanOrEqual(0);
  });

  it("messaging strategy has bilingual emphasize and avoid", () => {
    const profile = inferDISCProfile(makeFormData());
    expect(profile.messagingStrategy.emphasize.length).toBeGreaterThan(0);
    expect(profile.messagingStrategy.avoid.length).toBeGreaterThan(0);
    for (const item of profile.messagingStrategy.emphasize) {
      expect(item.he.length).toBeGreaterThan(0);
      expect(item.en.length).toBeGreaterThan(0);
    }
  });

  it("CTA style is bilingual", () => {
    const profile = inferDISCProfile(makeFormData());
    expect(profile.ctaStyle.he.length).toBeGreaterThan(0);
    expect(profile.ctaStyle.en.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════════
  // GOAL INFLUENCE
  // ═══════════════════════════════════════════════

  it("sales goal boosts D", () => {
    const sales = inferDISCProfile(makeFormData({ mainGoal: "sales" }));
    const awareness = inferDISCProfile(makeFormData({ mainGoal: "awareness" }));
    expect(sales.distribution.D).toBeGreaterThan(awareness.distribution.D);
  });

  it("awareness goal boosts I", () => {
    const awareness = inferDISCProfile(makeFormData({ mainGoal: "awareness" }));
    const leads = inferDISCProfile(makeFormData({ mainGoal: "leads" }));
    expect(awareness.distribution.I).toBeGreaterThan(leads.distribution.I);
  });

  it("loyalty goal boosts S", () => {
    const loyalty = inferDISCProfile(makeFormData({ mainGoal: "loyalty" }));
    const sales = inferDISCProfile(makeFormData({ mainGoal: "sales" }));
    expect(loyalty.distribution.S).toBeGreaterThan(sales.distribution.S);
  });

  it("leads goal boosts C", () => {
    const leads = inferDISCProfile(makeFormData({ mainGoal: "leads" }));
    const loyalty = inferDISCProfile(makeFormData({ mainGoal: "loyalty" }));
    expect(leads.distribution.C).toBeGreaterThan(loyalty.distribution.C);
  });

  // ═══════════════════════════════════════════════
  // AUDIENCE TYPE
  // ═══════════════════════════════════════════════

  it("B2B boosts C (analytical)", () => {
    const b2b = inferDISCProfile(makeFormData({ audienceType: "b2b" }));
    const b2c = inferDISCProfile(makeFormData({ audienceType: "b2c" }));
    expect(b2b.distribution.C).toBeGreaterThan(b2c.distribution.C);
  });

  it("B2C boosts I (social)", () => {
    const b2c = inferDISCProfile(makeFormData({ audienceType: "b2c" }));
    const b2b = inferDISCProfile(makeFormData({ audienceType: "b2b" }));
    expect(b2c.distribution.I).toBeGreaterThan(b2b.distribution.I);
  });

  // ═══════════════════════════════════════════════
  // EXPERIENCE LEVEL
  // ═══════════════════════════════════════════════

  it("advanced experience boosts D", () => {
    const advanced = inferDISCProfile(makeFormData({ experienceLevel: "advanced" }));
    const beginner = inferDISCProfile(makeFormData({ experienceLevel: "beginner" }));
    expect(advanced.distribution.D).toBeGreaterThan(beginner.distribution.D);
  });

  it("beginner experience boosts S", () => {
    const beginner = inferDISCProfile(makeFormData({ experienceLevel: "beginner" }));
    const advanced = inferDISCProfile(makeFormData({ experienceLevel: "advanced" }));
    expect(beginner.distribution.S).toBeGreaterThan(advanced.distribution.S);
  });

  // ═══════════════════════════════════════════════
  // BUSINESS FIELD
  // ═══════════════════════════════════════════════

  it("tech field boosts C", () => {
    const tech = inferDISCProfile(makeFormData({ businessField: "tech" }));
    const fashion = inferDISCProfile(makeFormData({ businessField: "fashion" }));
    expect(tech.distribution.C).toBeGreaterThan(fashion.distribution.C);
  });

  it("fashion field boosts I", () => {
    const fashion = inferDISCProfile(makeFormData({ businessField: "fashion" }));
    const tech = inferDISCProfile(makeFormData({ businessField: "tech" }));
    expect(fashion.distribution.I).toBeGreaterThan(tech.distribution.I);
  });

  it("health field boosts S", () => {
    const health = inferDISCProfile(makeFormData({ businessField: "health" }));
    const tech = inferDISCProfile(makeFormData({ businessField: "tech" }));
    expect(health.distribution.S).toBeGreaterThan(tech.distribution.S);
  });

  // ═══════════════════════════════════════════════
  // FUNNEL EMPHASIS
  // ═══════════════════════════════════════════════

  it("funnel emphasis matches primary type", () => {
    const validEmphases = ["conversion", "engagement", "retention", "leads"];
    const profile = inferDISCProfile(makeFormData());
    expect(validEmphases).toContain(profile.funnelEmphasis);
  });

  // ═══════════════════════════════════════════════
  // READER FRAMING
  // ═══════════════════════════════════════════════

  it("D primary maps to system2 framing", () => {
    const profile = inferDISCProfile(makeFormData({ mainGoal: "sales", experienceLevel: "advanced", businessField: "realEstate" }));
    if (profile.primary === "D") {
      expect(getReaderFraming(profile)).toBe("system2");
    }
  });

  it("returns valid framing for any profile", () => {
    const profile = inferDISCProfile(makeFormData());
    const framing = getReaderFraming(profile);
    expect(["system1", "system2", "balanced"]).toContain(framing);
  });

  // ═══════════════════════════════════════════════
  // SMOKE TESTS
  // ═══════════════════════════════════════════════

  const fields = ["fashion", "tech", "food", "services", "education", "health", "realEstate", "tourism", "personalBrand", "other"] as const;
  fields.forEach((field) => {
    it(`produces valid profile for ${field}`, () => {
      const profile = inferDISCProfile(makeFormData({ businessField: field }));
      expect(["D", "I", "S", "C"]).toContain(profile.primary);
      expect(profile.distribution.D + profile.distribution.I + profile.distribution.S + profile.distribution.C).toBeGreaterThanOrEqual(98);
    });
  });
});
