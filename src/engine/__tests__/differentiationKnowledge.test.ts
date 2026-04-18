import { describe, it, expect } from "vitest";
import {
  HIDDEN_VALUES,
  COMPETITOR_ARCHETYPES,
  BUYING_COMMITTEE_ROLES,
  FAKE_DIFFERENTIATION_SIGNALS,
  REAL_DIFFERENTIATION_SIGNALS,
  HYBRID_CATEGORIES,
  CONTRARY_METRICS,
  NORMALIZING_FRAMES,
  B2C_HIDDEN_VALUES,
  B2C_COMPETITOR_ARCHETYPES,
  INFLUENCE_NETWORK_ROLES,
  B2C_CONTRARY_METRICS,
  B2C_NORMALIZING_FRAMES,
  getHiddenValuesForMode,
  getCompetitorArchetypesForMode,
  getContraryMetricsForMode,
  type HiddenValueDef,
  type CompetitorArchetypeDef,
  type ContraryMetricDef,
} from "../differentiationKnowledge";

// ─────────────────────────────────────────────────────────────────────────
// HIDDEN_VALUES (B2B)
// ─────────────────────────────────────────────────────────────────────────

describe("HIDDEN_VALUES", () => {
  it("has 8 entries", () => {
    expect(HIDDEN_VALUES).toHaveLength(8);
  });

  it("each has id, he, en, probe, signals", () => {
    for (const v of HIDDEN_VALUES) {
      expect(v.id).toBeTruthy();
      expect(v.he).toBeTruthy();
      expect(v.en).toBeTruthy();
      expect(v.probe.he).toBeTruthy();
      expect(v.probe.en).toBeTruthy();
      expect(Array.isArray(v.signals)).toBe(true);
      expect(v.signals.length).toBeGreaterThan(0);
    }
  });

  it("contains known IDs", () => {
    const ids = HIDDEN_VALUES.map((v) => v.id);
    expect(ids).toContain("legitimacy");
    expect(ids).toContain("risk");
    expect(ids).toContain("identity");
    expect(ids).toContain("cognitive_ease");
    expect(ids).toContain("autonomy");
    expect(ids).toContain("status");
    expect(ids).toContain("empathy");
    expect(ids).toContain("narrative");
  });

  it("all IDs are unique", () => {
    const ids = HIDDEN_VALUES.map((v) => v.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// COMPETITOR_ARCHETYPES (B2B)
// ─────────────────────────────────────────────────────────────────────────

describe("COMPETITOR_ARCHETYPES", () => {
  it("has 5 entries", () => {
    expect(COMPETITOR_ARCHETYPES).toHaveLength(5);
  });

  it("each has id, he, en, description, dangerSign, counterStrategy", () => {
    for (const a of COMPETITOR_ARCHETYPES) {
      expect(a.id).toBeTruthy();
      expect(a.he).toBeTruthy();
      expect(a.en).toBeTruthy();
      expect(a.description.he).toBeTruthy();
      expect(a.description.en).toBeTruthy();
      expect(a.dangerSign).toBeTruthy();
      expect(a.counterStrategy).toBeTruthy();
    }
  });

  it("contains 'laser_focused' archetype", () => {
    expect(COMPETITOR_ARCHETYPES.find((a) => a.id === "laser_focused")).toBeDefined();
  });

  it("contains 'quiet_vendor' archetype", () => {
    expect(COMPETITOR_ARCHETYPES.find((a) => a.id === "quiet_vendor")).toBeDefined();
  });

  it("all IDs are unique", () => {
    const ids = COMPETITOR_ARCHETYPES.map((a) => a.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// BUYING_COMMITTEE_ROLES
// ─────────────────────────────────────────────────────────────────────────

describe("BUYING_COMMITTEE_ROLES", () => {
  it("has 7 entries", () => {
    expect(BUYING_COMMITTEE_ROLES).toHaveLength(7);
  });

  it("each has id, he, en, primaryConcern, informationNeed, signalType", () => {
    for (const r of BUYING_COMMITTEE_ROLES) {
      expect(r.id).toBeTruthy();
      expect(r.he).toBeTruthy();
      expect(r.en).toBeTruthy();
      expect(r.primaryConcern).toBeTruthy();
      expect(r.informationNeed).toBeTruthy();
      expect(["market_maker", "informed_trader", "noise_trader", "adversarial"]).toContain(r.signalType);
    }
  });

  it("contains 'champion' and 'saboteur' roles", () => {
    const ids = BUYING_COMMITTEE_ROLES.map((r) => r.id);
    expect(ids).toContain("champion");
    expect(ids).toContain("saboteur");
    expect(ids).toContain("economic_buyer");
    expect(ids).toContain("technical_evaluator");
    expect(ids).toContain("executive_sponsor");
  });

  it("saboteur has adversarial signal type", () => {
    const saboteur = BUYING_COMMITTEE_ROLES.find((r) => r.id === "saboteur");
    expect(saboteur?.signalType).toBe("adversarial");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Differentiation signals
// ─────────────────────────────────────────────────────────────────────────

describe("FAKE_DIFFERENTIATION_SIGNALS", () => {
  it("has at least 5 signals", () => {
    expect(FAKE_DIFFERENTIATION_SIGNALS.length).toBeGreaterThanOrEqual(5);
  });

  it("all are non-empty strings", () => {
    for (const s of FAKE_DIFFERENTIATION_SIGNALS) {
      expect(typeof s).toBe("string");
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

describe("REAL_DIFFERENTIATION_SIGNALS", () => {
  it("has at least 3 signals", () => {
    expect(REAL_DIFFERENTIATION_SIGNALS.length).toBeGreaterThanOrEqual(3);
  });

  it("all are non-empty strings", () => {
    for (const s of REAL_DIFFERENTIATION_SIGNALS) {
      expect(typeof s).toBe("string");
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// HYBRID_CATEGORIES
// ─────────────────────────────────────────────────────────────────────────

describe("HYBRID_CATEGORIES", () => {
  it("has 10 entries", () => {
    expect(HYBRID_CATEGORIES).toHaveLength(10);
  });

  it("each has bilingual name and description string", () => {
    for (const c of HYBRID_CATEGORIES) {
      expect(c.name.he).toBeTruthy();
      expect(c.name.en).toBeTruthy();
      expect(typeof c.description).toBe("string");
      expect(c.description.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CONTRARY_METRICS (B2B)
// ─────────────────────────────────────────────────────────────────────────

describe("CONTRARY_METRICS", () => {
  it("has 5 entries", () => {
    expect(CONTRARY_METRICS).toHaveLength(5);
  });

  it("each has name, description, target, whyContrary", () => {
    for (const m of CONTRARY_METRICS) {
      expect(m.name.he).toBeTruthy();
      expect(m.name.en).toBeTruthy();
      expect(m.description.he).toBeTruthy();
      expect(m.description.en).toBeTruthy();
      expect(m.target).toBeTruthy();
      expect(m.whyContrary).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// NORMALIZING_FRAMES
// ─────────────────────────────────────────────────────────────────────────

describe("NORMALIZING_FRAMES", () => {
  it("has process, knowledge, resource, comparison keys", () => {
    expect(NORMALIZING_FRAMES.process).toBeDefined();
    expect(NORMALIZING_FRAMES.knowledge).toBeDefined();
    expect(NORMALIZING_FRAMES.resource).toBeDefined();
    expect(NORMALIZING_FRAMES.comparison).toBeDefined();
  });

  it("each frame has bilingual text", () => {
    for (const [, frame] of Object.entries(NORMALIZING_FRAMES)) {
      expect(frame.he).toBeTruthy();
      expect(frame.en).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// B2C Knowledge
// ─────────────────────────────────────────────────────────────────────────

describe("B2C_HIDDEN_VALUES", () => {
  it("has 6 entries", () => {
    expect(B2C_HIDDEN_VALUES).toHaveLength(6);
  });

  it("contains convenience, aesthetic, belonging, self_expression, guilt_free, instant_gratification", () => {
    const ids = B2C_HIDDEN_VALUES.map((v) => v.id);
    expect(ids).toContain("convenience");
    expect(ids).toContain("aesthetic");
    expect(ids).toContain("belonging");
    expect(ids).toContain("self_expression");
    expect(ids).toContain("guilt_free");
    expect(ids).toContain("instant_gratification");
  });

  it("each has probe and signals", () => {
    for (const v of B2C_HIDDEN_VALUES) {
      expect(v.probe.he).toBeTruthy();
      expect(v.probe.en).toBeTruthy();
      expect(Array.isArray(v.signals)).toBe(true);
    }
  });
});

describe("B2C_COMPETITOR_ARCHETYPES", () => {
  it("has 5 entries", () => {
    expect(B2C_COMPETITOR_ARCHETYPES).toHaveLength(5);
  });

  it("contains category_king, price_anchor, lifestyle_brand, platform_aggregator, creator_led", () => {
    const ids = B2C_COMPETITOR_ARCHETYPES.map((a) => a.id);
    expect(ids).toContain("category_king");
    expect(ids).toContain("price_anchor");
    expect(ids).toContain("lifestyle_brand");
    expect(ids).toContain("platform_aggregator");
    expect(ids).toContain("creator_led");
  });
});

describe("INFLUENCE_NETWORK_ROLES", () => {
  it("has 6 entries", () => {
    expect(INFLUENCE_NETWORK_ROLES).toHaveLength(6);
  });

  it("each has id, he, en, primaryConcern, informationNeed", () => {
    for (const r of INFLUENCE_NETWORK_ROLES) {
      expect(r.id).toBeTruthy();
      expect(r.he).toBeTruthy();
      expect(r.en).toBeTruthy();
      expect(r.primaryConcern).toBeTruthy();
      expect(r.informationNeed).toBeTruthy();
    }
  });
});

describe("B2C_CONTRARY_METRICS", () => {
  it("has 5 entries", () => {
    expect(B2C_CONTRARY_METRICS).toHaveLength(5);
  });
});

describe("B2C_NORMALIZING_FRAMES", () => {
  it("has supply_chain, quality_gap, customer_disappointment, price_anxiety keys", () => {
    expect(B2C_NORMALIZING_FRAMES.supply_chain).toBeDefined();
    expect(B2C_NORMALIZING_FRAMES.quality_gap).toBeDefined();
    expect(B2C_NORMALIZING_FRAMES.customer_disappointment).toBeDefined();
    expect(B2C_NORMALIZING_FRAMES.price_anxiety).toBeDefined();
  });

  it("each frame has bilingual text", () => {
    for (const [, frame] of Object.entries(B2C_NORMALIZING_FRAMES)) {
      expect(frame.he).toBeTruthy();
      expect(frame.en).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Mode-filter functions
// ─────────────────────────────────────────────────────────────────────────

describe("getHiddenValuesForMode", () => {
  it("b2b mode returns values including autonomy and empathy", () => {
    const values = getHiddenValuesForMode("b2b");
    const ids = values.map((v) => v.id);
    expect(ids).toContain("autonomy");
    expect(ids).toContain("empathy");
    expect(ids).toContain("legitimacy");
  });

  it("b2c mode returns B2C values (convenience, aesthetic etc)", () => {
    const values = getHiddenValuesForMode("b2c");
    const ids = values.map((v) => v.id);
    expect(ids).toContain("convenience");
    expect(ids).toContain("aesthetic");
    // Should NOT contain autonomy/empathy
    expect(ids).not.toContain("autonomy");
    expect(ids).not.toContain("empathy");
  });

  it("hybrid mode returns all values (both B2B and B2C)", () => {
    const values = getHiddenValuesForMode("hybrid");
    const ids = values.map((v) => v.id);
    expect(ids).toContain("autonomy");
    expect(ids).toContain("empathy");
    expect(ids).toContain("convenience");
    expect(ids).toContain("aesthetic");
  });

  it("b2b mode does not include b2c-only values", () => {
    const values = getHiddenValuesForMode("b2b");
    const ids = values.map((v) => v.id);
    expect(ids).not.toContain("instant_gratification");
    expect(ids).not.toContain("guilt_free");
  });
});

describe("getCompetitorArchetypesForMode", () => {
  it("b2b mode returns only B2B archetypes", () => {
    const archetypes = getCompetitorArchetypesForMode("b2b");
    expect(archetypes).toHaveLength(COMPETITOR_ARCHETYPES.length);
    const ids = archetypes.map((a) => a.id);
    expect(ids).toContain("laser_focused");
    expect(ids).not.toContain("category_king");
  });

  it("b2c mode returns only B2C archetypes", () => {
    const archetypes = getCompetitorArchetypesForMode("b2c");
    expect(archetypes).toHaveLength(B2C_COMPETITOR_ARCHETYPES.length);
    const ids = archetypes.map((a) => a.id);
    expect(ids).toContain("category_king");
    expect(ids).not.toContain("laser_focused");
  });

  it("hybrid mode returns all archetypes", () => {
    const archetypes = getCompetitorArchetypesForMode("hybrid");
    expect(archetypes.length).toBe(COMPETITOR_ARCHETYPES.length + B2C_COMPETITOR_ARCHETYPES.length);
  });
});

describe("getContraryMetricsForMode", () => {
  it("b2b mode returns B2B contrary metrics", () => {
    const metrics = getContraryMetricsForMode("b2b");
    expect(metrics).toHaveLength(CONTRARY_METRICS.length);
  });

  it("b2c mode returns B2C contrary metrics", () => {
    const metrics = getContraryMetricsForMode("b2c");
    expect(metrics).toHaveLength(B2C_CONTRARY_METRICS.length);
  });

  it("hybrid mode returns 6 metrics (3 from each)", () => {
    const metrics = getContraryMetricsForMode("hybrid");
    expect(metrics).toHaveLength(6);
  });

  it("returns arrays in all modes", () => {
    for (const mode of ["b2b", "b2c", "hybrid"] as const) {
      expect(Array.isArray(getContraryMetricsForMode(mode))).toBe(true);
    }
  });
});
