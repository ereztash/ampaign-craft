import { describe, it, expect } from "vitest";
import {
  CHARM_PRICES,
  applyCharmPricing,
  TIER_PATTERNS,
  PRICE_SENSITIVITY,
  LTV_CAC_BENCHMARKS,
  GUARANTEE_TYPES,
  ANNUAL_DISCOUNT,
  OFFER_BONUS_TEMPLATES,
  calculateJND,
  PRICE_FRAMING_TEMPLATES,
  type TierPattern,
  type PriceSensitivity,
} from "../pricingKnowledge";

// ═══════════════════════════════════════════════
// CHARM_PRICES
// ═══════════════════════════════════════════════

describe("CHARM_PRICES", () => {
  it("has all required tiers", () => {
    expect(CHARM_PRICES.micro).toBeDefined();
    expect(CHARM_PRICES.low).toBeDefined();
    expect(CHARM_PRICES.mid).toBeDefined();
    expect(CHARM_PRICES.high).toBeDefined();
    expect(CHARM_PRICES.premium).toBeDefined();
    expect(CHARM_PRICES.enterprise).toBeDefined();
  });

  it("micro tier contains 9 and 49", () => {
    expect(CHARM_PRICES.micro).toContain(9);
    expect(CHARM_PRICES.micro).toContain(49);
  });

  it("each tier is a non-empty array of positive numbers", () => {
    for (const [, prices] of Object.entries(CHARM_PRICES)) {
      expect(prices.length).toBeGreaterThan(0);
      for (const p of prices) {
        expect(p).toBeGreaterThan(0);
      }
    }
  });

  it("prices within each tier are in ascending order", () => {
    for (const [, prices] of Object.entries(CHARM_PRICES)) {
      for (let i = 1; i < prices.length; i++) {
        expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
      }
    }
  });
});

// ═══════════════════════════════════════════════
// applyCharmPricing
// ═══════════════════════════════════════════════

describe("applyCharmPricing", () => {
  it("B2B price > 1000 rounds to nearest 500", () => {
    expect(applyCharmPricing(1200, true)).toBe(1000);
    expect(applyCharmPricing(1800, true)).toBe(2000);
    expect(applyCharmPricing(2500, true)).toBe(2500);
  });

  it("price <= 50 B2C ends in 9 pattern", () => {
    // Math.round(30/10)*10 - 1 = 29
    expect(applyCharmPricing(30, false)).toBe(29);
    // Math.round(50/10)*10 - 1 = 49
    expect(applyCharmPricing(50, false)).toBe(49);
  });

  it("price <= 200 B2C ends in -1 pattern", () => {
    // Math.round(100/50)*50 - 1 = 99
    expect(applyCharmPricing(100, false)).toBe(99);
    // Math.round(150/50)*50 - 1 = 149
    expect(applyCharmPricing(150, false)).toBe(149);
  });

  it("price <= 1000 B2C ends in -3 pattern", () => {
    // Math.round(300/100)*100 - 3 = 297
    expect(applyCharmPricing(300, false)).toBe(297);
    // Math.round(500/100)*100 - 3 = 497
    expect(applyCharmPricing(500, false)).toBe(497);
  });

  it("price > 1000 B2C ends in -3 (thousands) pattern", () => {
    // Math.round(2000/1000)*1000 - 3 = 1997
    expect(applyCharmPricing(2000, false)).toBe(1997);
    // Math.round(3000/1000)*1000 - 3 = 2997
    expect(applyCharmPricing(3000, false)).toBe(2997);
  });

  it("B2B price <= 1000 uses regular charm (not B2B rounding)", () => {
    // isB2B && price > 1000 — price 800 does NOT trigger B2B rounding
    const result = applyCharmPricing(800, true);
    expect(result).toBe(797); // Math.round(800/100)*100 - 3 = 797
  });
});

// ═══════════════════════════════════════════════
// TIER_PATTERNS
// ═══════════════════════════════════════════════

describe("TIER_PATTERNS", () => {
  it("has exactly 3 patterns", () => {
    expect(TIER_PATTERNS).toHaveLength(3);
  });

  it("includes classic, premium, entry patterns", () => {
    const names = TIER_PATTERNS.map((p) => p.name);
    expect(names).toContain("classic");
    expect(names).toContain("premium");
    expect(names).toContain("entry");
  });

  it("each pattern has 3 ratio values", () => {
    for (const p of TIER_PATTERNS) {
      expect(p.ratios).toHaveLength(3);
    }
  });

  it("ratios are in ascending order low:mid:high", () => {
    for (const p of TIER_PATTERNS) {
      expect(p.ratios[0]).toBeLessThan(p.ratios[1]);
      expect(p.ratios[1]).toBeLessThan(p.ratios[2]);
    }
  });

  it("each pattern has bilingual description", () => {
    for (const p of TIER_PATTERNS) {
      expect(p.description.he.length).toBeGreaterThan(0);
      expect(p.description.en.length).toBeGreaterThan(0);
    }
  });

  it("each pattern has at least one bestFor field", () => {
    for (const p of TIER_PATTERNS) {
      expect(p.bestFor.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════
// PRICE_SENSITIVITY
// ═══════════════════════════════════════════════

describe("PRICE_SENSITIVITY", () => {
  const EXPECTED_FIELDS = [
    "fashion", "tech", "food", "services", "education",
    "health", "realEstate", "personalBrand", "tourism", "other",
  ];

  it("covers all expected business fields", () => {
    const fields = PRICE_SENSITIVITY.map((p) => p.field);
    for (const f of EXPECTED_FIELDS) {
      expect(fields).toContain(f);
    }
  });

  it("each entry has valid sensitivity value", () => {
    const valid = ["very_high", "high", "medium", "medium_low", "low"];
    for (const p of PRICE_SENSITIVITY) {
      expect(valid).toContain(p.sensitivity);
    }
  });

  it("each entry has a valid priceband", () => {
    const validBands = ["micro", "low", "mid", "high", "premium", "enterprise"];
    for (const p of PRICE_SENSITIVITY) {
      expect(validBands).toContain(p.priceband);
    }
  });

  it("each entry has bilingual notes and typicalRange", () => {
    for (const p of PRICE_SENSITIVITY) {
      expect(p.notes.he.length).toBeGreaterThan(0);
      expect(p.notes.en.length).toBeGreaterThan(0);
      expect(p.typicalRange.he.length).toBeGreaterThan(0);
      expect(p.typicalRange.en.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════
// LTV_CAC_BENCHMARKS
// ═══════════════════════════════════════════════

describe("LTV_CAC_BENCHMARKS", () => {
  it("has all expected business fields", () => {
    const fields = ["tech", "fashion", "food", "services", "education", "health", "realEstate", "personalBrand", "tourism", "other"];
    for (const f of fields) {
      expect(LTV_CAC_BENCHMARKS[f]).toBeDefined();
    }
  });

  it("each benchmark has ratio and paybackMonths", () => {
    for (const [, bench] of Object.entries(LTV_CAC_BENCHMARKS)) {
      expect(bench.ratio).toBeGreaterThan(0);
      expect(bench.paybackMonths).toBeGreaterThan(0);
    }
  });

  it("services and education have high LTV:CAC ratios", () => {
    expect(LTV_CAC_BENCHMARKS.services.ratio).toBeGreaterThan(5);
    expect(LTV_CAC_BENCHMARKS.education.ratio).toBeGreaterThan(5);
  });

  it("food has lowest ratio (high competition)", () => {
    expect(LTV_CAC_BENCHMARKS.food.ratio).toBeLessThan(LTV_CAC_BENCHMARKS.tech.ratio);
  });
});

// ═══════════════════════════════════════════════
// GUARANTEE_TYPES
// ═══════════════════════════════════════════════

describe("GUARANTEE_TYPES", () => {
  it("has at least 4 guarantee types", () => {
    expect(GUARANTEE_TYPES.length).toBeGreaterThanOrEqual(4);
  });

  it("includes unconditional, conditional, performance, try_before_buy", () => {
    const types = GUARANTEE_TYPES.map((g) => g.type);
    expect(types).toContain("unconditional");
    expect(types).toContain("conditional");
    expect(types).toContain("performance");
    expect(types).toContain("try_before_buy");
  });

  it("each guarantee has trustScore between 1 and 10", () => {
    for (const g of GUARANTEE_TYPES) {
      expect(g.trustScore).toBeGreaterThanOrEqual(1);
      expect(g.trustScore).toBeLessThanOrEqual(10);
    }
  });

  it("each guarantee has bilingual label and template", () => {
    for (const g of GUARANTEE_TYPES) {
      expect(g.label.he.length).toBeGreaterThan(0);
      expect(g.label.en.length).toBeGreaterThan(0);
      expect(g.template.he.length).toBeGreaterThan(0);
      expect(g.template.en.length).toBeGreaterThan(0);
    }
  });

  it("each guarantee has at least one bestFor field", () => {
    for (const g of GUARANTEE_TYPES) {
      expect(g.bestFor.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════
// ANNUAL_DISCOUNT
// ═══════════════════════════════════════════════

describe("ANNUAL_DISCOUNT", () => {
  it("recommended discount is between conservativeMin and aggressiveMax", () => {
    expect(ANNUAL_DISCOUNT.recommended).toBeGreaterThanOrEqual(ANNUAL_DISCOUNT.conservativeMin);
    expect(ANNUAL_DISCOUNT.recommended).toBeLessThanOrEqual(ANNUAL_DISCOUNT.aggressiveMax);
  });

  it("conversionRate is between 0 and 1", () => {
    expect(ANNUAL_DISCOUNT.conversionRate).toBeGreaterThan(0);
    expect(ANNUAL_DISCOUNT.conversionRate).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════
// OFFER_BONUS_TEMPLATES
// ═══════════════════════════════════════════════

describe("OFFER_BONUS_TEMPLATES", () => {
  it("has 5 bonus template types", () => {
    expect(OFFER_BONUS_TEMPLATES).toHaveLength(5);
  });

  it("includes all 5 types", () => {
    const types = OFFER_BONUS_TEMPLATES.map((t) => t.type);
    expect(types).toContain("speed");
    expect(types).toContain("ease");
    expect(types).toContain("proof");
    expect(types).toContain("exclusive");
    expect(types).toContain("community");
  });

  it("each template has positive valueMultiplier", () => {
    for (const t of OFFER_BONUS_TEMPLATES) {
      expect(t.valueMultiplier).toBeGreaterThan(0);
      expect(t.valueMultiplier).toBeLessThan(1);
    }
  });

  it("each template has bilingual name and description", () => {
    for (const t of OFFER_BONUS_TEMPLATES) {
      expect(t.name.he.length).toBeGreaterThan(0);
      expect(t.name.en.length).toBeGreaterThan(0);
      expect(t.description.he.length).toBeGreaterThan(0);
      expect(t.description.en.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════
// calculateJND (Weber-Fechner)
// ═══════════════════════════════════════════════

describe("calculateJND", () => {
  it("price <= 50 uses 17.5% JND", () => {
    expect(calculateJND(50)).toBeCloseTo(50 * 0.175, 5);
    expect(calculateJND(20)).toBeCloseTo(20 * 0.175, 5);
  });

  it("price <= 200 uses 12.5% JND", () => {
    expect(calculateJND(100)).toBeCloseTo(100 * 0.125, 5);
    expect(calculateJND(200)).toBeCloseTo(200 * 0.125, 5);
  });

  it("price <= 500 uses 10% JND", () => {
    expect(calculateJND(300)).toBeCloseTo(300 * 0.10, 5);
    expect(calculateJND(500)).toBeCloseTo(500 * 0.10, 5);
  });

  it("price <= 2000 uses 6.5% JND", () => {
    expect(calculateJND(1000)).toBeCloseTo(1000 * 0.065, 5);
    expect(calculateJND(2000)).toBeCloseTo(2000 * 0.065, 5);
  });

  it("price <= 10000 uses 4% JND", () => {
    expect(calculateJND(5000)).toBeCloseTo(5000 * 0.04, 5);
    expect(calculateJND(10000)).toBeCloseTo(10000 * 0.04, 5);
  });

  it("price > 10000 uses 2.5% JND", () => {
    expect(calculateJND(20000)).toBeCloseTo(20000 * 0.025, 5);
  });

  it("JND increases monotonically with price", () => {
    const prices = [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 50000];
    for (let i = 1; i < prices.length; i++) {
      expect(calculateJND(prices[i])).toBeGreaterThanOrEqual(calculateJND(prices[i - 1]));
    }
  });

  it("JND percentage decreases for higher prices (Weber-Fechner)", () => {
    // Lower threshold at higher prices
    const jnd50 = calculateJND(50) / 50;
    const jnd10000 = calculateJND(10000) / 10000;
    expect(jnd50).toBeGreaterThan(jnd10000);
  });
});

// ═══════════════════════════════════════════════
// PRICE_FRAMING_TEMPLATES
// ═══════════════════════════════════════════════

describe("PRICE_FRAMING_TEMPLATES", () => {
  it("has 5 context templates", () => {
    expect(PRICE_FRAMING_TEMPLATES).toHaveLength(5);
  });

  it("covers all expected contexts", () => {
    const contexts = PRICE_FRAMING_TEMPLATES.map((t) => t.context);
    expect(contexts).toContain("landing_page");
    expect(contexts).toContain("sales_call");
    expect(contexts).toContain("proposal");
    expect(contexts).toContain("whatsapp");
    expect(contexts).toContain("email");
  });

  it("each template has bilingual label, template, and principle", () => {
    for (const t of PRICE_FRAMING_TEMPLATES) {
      expect(t.label.he.length).toBeGreaterThan(0);
      expect(t.label.en.length).toBeGreaterThan(0);
      expect(t.template.he.length).toBeGreaterThan(0);
      expect(t.template.en.length).toBeGreaterThan(0);
      expect(t.principle.length).toBeGreaterThan(0);
    }
  });

  it("templates contain placeholder variables in curly braces", () => {
    for (const t of PRICE_FRAMING_TEMPLATES) {
      expect(t.template.en).toMatch(/\{[a-zA-Z]+\}/);
    }
  });
});
