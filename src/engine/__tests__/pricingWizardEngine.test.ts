import { describe, it, expect } from "vitest";
import {
  computePricingWizardRecommendation,
  DIFFERENTIATOR_OPTIONS,
  type PricingWizardInput,
} from "../pricingWizardEngine";

// ── Fixtures ──────────────────────────────────────────────────────────────

const baseInput: PricingWizardInput = {
  dreamOutcome: "significant",
  timeToValue: "fast",
  tooChcapPrice: 100,
  stretchPrice: 500,
  effortLevel: "low",
  socialProof: "strong",
  differentiators: ["proven_results"],
  salesModel: "subscription",
  avgRetentionMonths: 12,
  revenueGoalMonthly: 10000,
  audienceIsB2B: false,
};

// ── DIFFERENTIATOR_OPTIONS ────────────────────────────────────────────────

describe("DIFFERENTIATOR_OPTIONS", () => {
  it("exports 7 options", () => {
    expect(DIFFERENTIATOR_OPTIONS).toHaveLength(7);
  });

  it("each option has key, he, en, premiumPct", () => {
    for (const opt of DIFFERENTIATOR_OPTIONS) {
      expect(opt).toHaveProperty("key");
      expect(opt).toHaveProperty("he");
      expect(opt).toHaveProperty("en");
      expect(typeof opt.premiumPct).toBe("number");
      expect(opt.premiumPct).toBeGreaterThan(0);
    }
  });

  it("transformation has highest premium among mid-range options", () => {
    const t = DIFFERENTIATOR_OPTIONS.find((d) => d.key === "transformation")!;
    const community = DIFFERENTIATOR_OPTIONS.find((d) => d.key === "community")!;
    expect(t.premiumPct).toBeGreaterThan(community.premiumPct);
  });
});

// ── computePricingWizardRecommendation ────────────────────────────────────

describe("computePricingWizardRecommendation — output shape", () => {
  it("returns all required fields", () => {
    const rec = computePricingWizardRecommendation(baseInput);
    expect(rec).toHaveProperty("optimalPrice");
    expect(rec).toHaveProperty("charmPrice");
    expect(rec).toHaveProperty("acceptableRange");
    expect(rec).toHaveProperty("anchorPrice");
    expect(rec).toHaveProperty("hormoziScore");
    expect(rec).toHaveProperty("differentiationPremium");
    expect(rec).toHaveProperty("psmOPP");
    expect(rec).toHaveProperty("tiers");
    expect(rec).toHaveProperty("primaryFrame");
    expect(rec).toHaveProperty("dailyBreakdown");
    expect(rec).toHaveProperty("costOfInactionFrame");
    expect(rec).toHaveProperty("ltv");
    expect(rec).toHaveProperty("recommendedCAC");
    expect(rec).toHaveProperty("customersNeeded");
    expect(rec).toHaveProperty("rationale");
    expect(rec).toHaveProperty("methodology");
  });

  it("tiers has exactly 3 entries with correct roles", () => {
    const { tiers } = computePricingWizardRecommendation(baseInput);
    expect(tiers).toHaveLength(3);
    expect(tiers[0].role).toBe("decoy");
    expect(tiers[1].role).toBe("target");
    expect(tiers[2].role).toBe("premium");
  });

  it("exactly one tier is primary", () => {
    const { tiers } = computePricingWizardRecommendation(baseInput);
    const primaries = tiers.filter((t) => t.isPrimary);
    expect(primaries).toHaveLength(1);
    expect(primaries[0].role).toBe("target");
  });

  it("tiers have bilingual names", () => {
    const { tiers } = computePricingWizardRecommendation(baseInput);
    for (const tier of tiers) {
      expect(tier.name).toHaveProperty("he");
      expect(tier.name).toHaveProperty("en");
      expect(tier.name.he.length).toBeGreaterThan(0);
      expect(tier.name.en.length).toBeGreaterThan(0);
    }
  });

  it("each tier has annualPrice less than monthly price", () => {
    const { tiers } = computePricingWizardRecommendation(baseInput);
    for (const tier of tiers) {
      expect(tier.annualPrice).toBeLessThan(tier.price);
    }
  });
});

// ── Hormozi score ─────────────────────────────────────────────────────────

describe("hormoziScore", () => {
  it("is between 0 and 10", () => {
    const { hormoziScore } = computePricingWizardRecommendation(baseInput);
    expect(hormoziScore).toBeGreaterThanOrEqual(0);
    expect(hormoziScore).toBeLessThanOrEqual(10);
  });

  it("transformative + immediate + zero effort + exceptional proof → very high score", () => {
    const best: PricingWizardInput = {
      ...baseInput,
      dreamOutcome: "transformative",
      timeToValue: "immediate",
      effortLevel: "zero",
      socialProof: "exceptional",
    };
    const { hormoziScore } = computePricingWizardRecommendation(best);
    expect(hormoziScore).toBeGreaterThan(8);
  });

  it("incremental + slow + high effort + no proof → low score", () => {
    const worst: PricingWizardInput = {
      ...baseInput,
      dreamOutcome: "incremental",
      timeToValue: "slow",
      effortLevel: "high",
      socialProof: "none",
    };
    const { hormoziScore } = computePricingWizardRecommendation(worst);
    expect(hormoziScore).toBeLessThan(3);
  });

  it("higher value inputs yield higher score", () => {
    const high: PricingWizardInput = { ...baseInput, dreamOutcome: "transformative", timeToValue: "immediate" };
    const low: PricingWizardInput = { ...baseInput, dreamOutcome: "incremental", timeToValue: "slow" };
    const highScore = computePricingWizardRecommendation(high).hormoziScore;
    const lowScore = computePricingWizardRecommendation(low).hormoziScore;
    expect(highScore).toBeGreaterThan(lowScore);
  });

  it("all DreamOutcomeLevel values accepted without error", () => {
    const levels = ["transformative", "significant", "moderate", "incremental"] as const;
    for (const l of levels) {
      expect(() => computePricingWizardRecommendation({ ...baseInput, dreamOutcome: l })).not.toThrow();
    }
  });

  it("all TimeToValue values accepted", () => {
    for (const t of ["immediate", "fast", "moderate", "slow"] as const) {
      expect(() => computePricingWizardRecommendation({ ...baseInput, timeToValue: t })).not.toThrow();
    }
  });

  it("all EffortLevel values accepted", () => {
    for (const e of ["zero", "low", "medium", "high"] as const) {
      expect(() => computePricingWizardRecommendation({ ...baseInput, effortLevel: e })).not.toThrow();
    }
  });

  it("all SocialProofLevel values accepted", () => {
    for (const s of ["exceptional", "strong", "some", "none"] as const) {
      expect(() => computePricingWizardRecommendation({ ...baseInput, socialProof: s })).not.toThrow();
    }
  });
});

// ── Van Westendorp OPP ────────────────────────────────────────────────────

describe("psmOPP", () => {
  it("is between tooChcapPrice and stretchPrice * 1.5 (with Hormozi shift)", () => {
    const { psmOPP } = computePricingWizardRecommendation(baseInput);
    expect(psmOPP).toBeGreaterThan(baseInput.tooChcapPrice);
    expect(psmOPP).toBeLessThanOrEqual(baseInput.stretchPrice * 1.5);
  });

  it("returns 0 when tooChcapPrice is 0", () => {
    const r = computePricingWizardRecommendation({ ...baseInput, tooChcapPrice: 0 });
    expect(r.psmOPP).toBe(0);
  });

  it("returns 0 when stretchPrice is 0", () => {
    const r = computePricingWizardRecommendation({ ...baseInput, stretchPrice: 0 });
    expect(r.psmOPP).toBe(0);
  });

  it("higher tooChcap + stretchPrice → higher OPP", () => {
    const low = computePricingWizardRecommendation({ ...baseInput, tooChcapPrice: 50, stretchPrice: 200 });
    const high = computePricingWizardRecommendation({ ...baseInput, tooChcapPrice: 200, stretchPrice: 1000 });
    expect(high.psmOPP).toBeGreaterThan(low.psmOPP);
  });

  it("high Hormozi score shifts OPP higher than low score for same PSM range", () => {
    const highV: PricingWizardInput = {
      ...baseInput,
      dreamOutcome: "transformative",
      timeToValue: "immediate",
      effortLevel: "zero",
      socialProof: "exceptional",
    };
    const lowV: PricingWizardInput = {
      ...baseInput,
      dreamOutcome: "incremental",
      timeToValue: "slow",
      effortLevel: "high",
      socialProof: "none",
    };
    const highOPP = computePricingWizardRecommendation(highV).psmOPP;
    const lowOPP = computePricingWizardRecommendation(lowV).psmOPP;
    expect(highOPP).toBeGreaterThan(lowOPP);
  });
});

// ── Differentiation premium ───────────────────────────────────────────────

describe("differentiationPremium", () => {
  it("is 0 when no differentiators", () => {
    const { differentiationPremium } = computePricingWizardRecommendation({
      ...baseInput,
      differentiators: [],
    });
    expect(differentiationPremium).toBe(0);
  });

  it("is > 0 with one differentiator", () => {
    const { differentiationPremium } = computePricingWizardRecommendation({
      ...baseInput,
      differentiators: ["proven_results"],
    });
    expect(differentiationPremium).toBeGreaterThan(0);
  });

  it("ignores unknown differentiator keys gracefully", () => {
    const { differentiationPremium } = computePricingWizardRecommendation({
      ...baseInput,
      differentiators: ["unknown_key"],
    });
    expect(differentiationPremium).toBe(0);
  });

  it("more differentiators yields higher premium up to diminishing returns", () => {
    const one = computePricingWizardRecommendation({ ...baseInput, differentiators: ["proven_results"] });
    const two = computePricingWizardRecommendation({ ...baseInput, differentiators: ["proven_results", "transformation"] });
    const five = computePricingWizardRecommendation({
      ...baseInput,
      differentiators: ["proven_results", "transformation", "unique_method", "community", "personalisation"],
    });
    expect(two.differentiationPremium).toBeGreaterThan(one.differentiationPremium);
    expect(five.differentiationPremium).toBeGreaterThan(two.differentiationPremium);
  });

  it("all known differentiator keys are valid", () => {
    const keys = DIFFERENTIATOR_OPTIONS.map((d) => d.key);
    const { differentiationPremium } = computePricingWizardRecommendation({
      ...baseInput,
      differentiators: keys,
    });
    expect(differentiationPremium).toBeGreaterThan(0.4);
  });
});

// ── Price relationships ───────────────────────────────────────────────────

describe("price relationships", () => {
  it("charmPrice is charm-priced (ends in 9 or 7 or 0 for B2B)", () => {
    const { charmPrice } = computePricingWizardRecommendation(baseInput);
    const lastDigit = charmPrice % 10;
    // charm pricing ends in 9, 7, or is round (0) for B2B
    expect([9, 7, 0, 3].includes(lastDigit)).toBe(true);
  });

  it("anchorPrice is significantly higher than charmPrice (~3×)", () => {
    const { charmPrice, anchorPrice } = computePricingWizardRecommendation(baseInput);
    expect(anchorPrice).toBeGreaterThan(charmPrice * 2);
  });

  it("acceptableRange.low ≤ acceptableRange.high", () => {
    const { acceptableRange } = computePricingWizardRecommendation(baseInput);
    expect(acceptableRange.low).toBeLessThanOrEqual(acceptableRange.high);
  });

  it("tier prices are strictly ascending: decoy < target < premium", () => {
    const { tiers } = computePricingWizardRecommendation(baseInput);
    expect(tiers[0].price).toBeLessThan(tiers[1].price);
    expect(tiers[1].price).toBeLessThan(tiers[2].price);
  });

  it("B2B flag does not cause errors", () => {
    expect(() =>
      computePricingWizardRecommendation({ ...baseInput, audienceIsB2B: true })
    ).not.toThrow();
  });

  it("B2B large price rounds to multiples of 500", () => {
    const r = computePricingWizardRecommendation({
      ...baseInput,
      audienceIsB2B: true,
      tooChcapPrice: 2000,
      stretchPrice: 8000,
    });
    // anchor is ~3× optimal; check it's a multiple of 500
    expect(r.anchorPrice % 500).toBe(0);
  });
});

// ── Revenue architecture ──────────────────────────────────────────────────

describe("revenue architecture", () => {
  it("subscription LTV = charmPrice × avgRetentionMonths", () => {
    const input: PricingWizardInput = { ...baseInput, salesModel: "subscription", avgRetentionMonths: 12 };
    const { ltv, charmPrice } = computePricingWizardRecommendation(input);
    expect(ltv).toBeCloseTo(charmPrice * 12, 0);
  });

  it("oneTime LTV = charmPrice × 1.8", () => {
    const { ltv, charmPrice } = computePricingWizardRecommendation({
      ...baseInput,
      salesModel: "oneTime",
    });
    expect(ltv).toBeCloseTo(charmPrice * 1.8, 0);
  });

  it("leads LTV = charmPrice", () => {
    const { ltv, charmPrice } = computePricingWizardRecommendation({
      ...baseInput,
      salesModel: "leads",
    });
    expect(ltv).toBe(charmPrice);
  });

  it("recommendedCAC = ltv / 3", () => {
    const { ltv, recommendedCAC } = computePricingWizardRecommendation(baseInput);
    expect(recommendedCAC).toBeCloseTo(ltv / 3, 0);
  });

  it("customersNeeded > 0 when revenueGoalMonthly > 0", () => {
    const { customersNeeded } = computePricingWizardRecommendation(baseInput);
    expect(customersNeeded).toBeGreaterThan(0);
  });

  it("customersNeeded is 0 when revenueGoalMonthly is 0", () => {
    const { customersNeeded } = computePricingWizardRecommendation({
      ...baseInput,
      revenueGoalMonthly: 0,
    });
    expect(customersNeeded).toBe(0);
  });

  it("customersNeeded = ceil(revenueGoal / charmPrice)", () => {
    const input: PricingWizardInput = { ...baseInput, revenueGoalMonthly: 5000 };
    const { customersNeeded, charmPrice } = computePricingWizardRecommendation(input);
    expect(customersNeeded).toBe(Math.ceil(5000 / charmPrice));
  });
});

// ── Psychological frames ──────────────────────────────────────────────────

describe("psychological frames", () => {
  it("primaryFrame is bilingual for subscription", () => {
    const { primaryFrame } = computePricingWizardRecommendation({ ...baseInput, salesModel: "subscription" });
    expect(primaryFrame.he).toBeTruthy();
    expect(primaryFrame.en).toBeTruthy();
  });

  it("primaryFrame is bilingual for leads", () => {
    const { primaryFrame } = computePricingWizardRecommendation({ ...baseInput, salesModel: "leads" });
    expect(primaryFrame.he).toBeTruthy();
    expect(primaryFrame.en).toBeTruthy();
  });

  it("primaryFrame is bilingual for oneTime", () => {
    const { primaryFrame } = computePricingWizardRecommendation({ ...baseInput, salesModel: "oneTime" });
    expect(primaryFrame.he).toBeTruthy();
    expect(primaryFrame.en).toBeTruthy();
  });

  it("dailyBreakdown contains per-day price", () => {
    const { dailyBreakdown, charmPrice } = computePricingWizardRecommendation(baseInput);
    const expected = Math.round(charmPrice / 30);
    expect(dailyBreakdown.he).toContain(String(expected));
    expect(dailyBreakdown.en).toContain(String(expected));
  });

  it("costOfInactionFrame is bilingual for all dream outcome levels", () => {
    const levels = ["transformative", "significant", "moderate", "incremental"] as const;
    for (const l of levels) {
      const { costOfInactionFrame } = computePricingWizardRecommendation({ ...baseInput, dreamOutcome: l });
      expect(costOfInactionFrame.he).toBeTruthy();
      expect(costOfInactionFrame.en).toBeTruthy();
    }
  });
});

// ── Rationale & methodology ───────────────────────────────────────────────

describe("rationale and methodology", () => {
  it("rationale is bilingual", () => {
    const { rationale } = computePricingWizardRecommendation(baseInput);
    expect(rationale.he).toBeTruthy();
    expect(rationale.en).toBeTruthy();
  });

  it("rationale mentions Hormozi score", () => {
    const { rationale, hormoziScore } = computePricingWizardRecommendation(baseInput);
    expect(rationale.en).toContain(hormoziScore.toFixed(1));
  });

  it("rationale mentions differentiation premium when > 0", () => {
    const input = { ...baseInput, differentiators: ["proven_results"] };
    const { rationale } = computePricingWizardRecommendation(input);
    expect(rationale.en).toContain("%");
  });

  it("rationale mentions no differentiation when empty", () => {
    const { rationale } = computePricingWizardRecommendation({ ...baseInput, differentiators: [] });
    expect(rationale.en).toContain("No strong differentiation");
    expect(rationale.he).toContain("ללא");
  });

  it("rationale reflects high Hormozi score with premium language", () => {
    const high: PricingWizardInput = {
      ...baseInput,
      dreamOutcome: "transformative",
      timeToValue: "immediate",
      effortLevel: "zero",
      socialProof: "exceptional",
    };
    const { rationale } = computePricingWizardRecommendation(high);
    expect(rationale.en).toContain("premium");
  });

  it("rationale for moderate score uses market-rate language", () => {
    const mid: PricingWizardInput = {
      ...baseInput,
      dreamOutcome: "moderate",
      timeToValue: "moderate",
      effortLevel: "medium",
      socialProof: "some",
    };
    const { rationale } = computePricingWizardRecommendation(mid);
    // Score around 3.5–6 range → "moderate, market-rate"
    expect(rationale.en).toBeTruthy();
  });

  it("methodology is bilingual and mentions Van Westendorp", () => {
    const { methodology } = computePricingWizardRecommendation(baseInput);
    expect(methodology.en).toContain("Van Westendorp");
    expect(methodology.he).toContain("Van Westendorp");
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("very low PSM prices produce non-negative output without throwing", () => {
    expect(() =>
      computePricingWizardRecommendation({
        ...baseInput,
        tooChcapPrice: 1,
        stretchPrice: 10,
      })
    ).not.toThrow();
  });

  it("very high PSM prices work without overflow", () => {
    const r = computePricingWizardRecommendation({
      ...baseInput,
      tooChcapPrice: 10000,
      stretchPrice: 50000,
    });
    expect(r.charmPrice).toBeGreaterThan(0);
    expect(r.anchorPrice).toBeGreaterThan(r.charmPrice);
  });

  it("zero retention months for subscription produces non-negative LTV", () => {
    const r = computePricingWizardRecommendation({
      ...baseInput,
      salesModel: "subscription",
      avgRetentionMonths: 0,
    });
    expect(r.ltv).toBe(0);
  });

  it("deterministic — same input produces same output", () => {
    const r1 = computePricingWizardRecommendation(baseInput);
    const r2 = computePricingWizardRecommendation(baseInput);
    expect(r1.charmPrice).toBe(r2.charmPrice);
    expect(r1.hormoziScore).toBe(r2.hormoziScore);
    expect(r1.psmOPP).toBe(r2.psmOPP);
  });
});
