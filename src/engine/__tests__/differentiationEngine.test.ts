import { describe, it, expect } from "vitest";
import {
  scoreClaimVerification, buildGapAnalysis, buildHiddenValueProfile,
  getTopHiddenValues, calculateDifferentiationStrength, selectContraryMetrics,
  suggestHybridCategory, generateDifferentiation,
} from "../differentiationEngine";
import { PHASES, getPhaseById, getQuestionsForPhase } from "../differentiationPhases";
import { HIDDEN_VALUES, COMPETITOR_ARCHETYPES, BUYING_COMMITTEE_ROLES, FAKE_DIFFERENTIATION_SIGNALS, REAL_DIFFERENTIATION_SIGNALS, HYBRID_CATEGORIES, CONTRARY_METRICS, NORMALIZING_FRAMES, B2C_COMPETITOR_ARCHETYPES, B2C_HIDDEN_VALUES, B2C_CONTRARY_METRICS, INFLUENCE_NETWORK_ROLES, getHiddenValuesForMode, getCompetitorArchetypesForMode, getContraryMetricsForMode } from "../differentiationKnowledge";
import { ClaimExample, HiddenValueScore, DifferentiationFormData, initialDifferentiationFormData, detectMarketMode } from "@/types/differentiation";

function makeFormData(overrides: Partial<DifferentiationFormData> = {}): DifferentiationFormData {
  return { ...initialDifferentiationFormData, businessName: "TestCo", industry: "SaaS", currentPositioning: "We are the best", ...overrides };
}

// === Claim Verification ===
describe("scoreClaimVerification", () => {
  it("returns 0 for empty claims", () => {
    expect(scoreClaimVerification([])).toBe(0);
  });

  it("returns 100 for all verified", () => {
    const claims: ClaimExample[] = [
      { claim: "Fast", evidence: "Client X saw 2x speed", verified: true, gap: "" },
      { claim: "Cheap", evidence: "30% below market", verified: true, gap: "" },
    ];
    expect(scoreClaimVerification(claims)).toBe(100);
  });

  it("scores weak claims at 40%", () => {
    const claims: ClaimExample[] = [
      { claim: "Good", evidence: "some evidence", verified: false, gap: "vague" },
    ];
    expect(scoreClaimVerification(claims)).toBe(40);
  });

  it("scores empty claims at 0%", () => {
    const claims: ClaimExample[] = [
      { claim: "Best", evidence: "", verified: false, gap: "no evidence" },
    ];
    expect(scoreClaimVerification(claims)).toBe(0);
  });
});

// === Gap Analysis ===
describe("buildGapAnalysis", () => {
  it("classifies verified/weak/empty", () => {
    const claims: ClaimExample[] = [
      { claim: "Fast", evidence: "2x", verified: true, gap: "" },
      { claim: "Good", evidence: "maybe", verified: false, gap: "" },
      { claim: "Best", evidence: "", verified: false, gap: "" },
    ];
    const gaps = buildGapAnalysis(claims);
    expect(gaps[0].status).toBe("verified");
    expect(gaps[1].status).toBe("weak");
    expect(gaps[2].status).toBe("empty");
  });

  it("has bilingual recommendations", () => {
    const gaps = buildGapAnalysis([{ claim: "X", evidence: "", verified: false, gap: "" }]);
    expect(gaps[0].recommendation.he).toBeTruthy();
    expect(gaps[0].recommendation.en).toBeTruthy();
  });
});

// === Hidden Values ===
describe("buildHiddenValueProfile", () => {
  it("sorts by score descending", () => {
    const scores: HiddenValueScore[] = [
      { valueId: "risk", score: 2, signal: "" },
      { valueId: "status", score: 5, signal: "" },
      { valueId: "empathy", score: 3, signal: "" },
    ];
    const sorted = buildHiddenValueProfile(scores);
    expect(sorted[0].valueId).toBe("status");
    expect(sorted[2].valueId).toBe("risk");
  });
});

describe("getTopHiddenValues", () => {
  it("returns top 3 by default", () => {
    const scores: HiddenValueScore[] = [
      { valueId: "risk", score: 5, signal: "" },
      { valueId: "status", score: 4, signal: "" },
      { valueId: "empathy", score: 3, signal: "" },
      { valueId: "narrative", score: 2, signal: "" },
    ];
    expect(getTopHiddenValues(scores)).toHaveLength(3);
    expect(getTopHiddenValues(scores)[0].score).toBe(5);
  });
});

// === Differentiation Strength ===
describe("calculateDifferentiationStrength", () => {
  it("scores 0-100", () => {
    const score = calculateDifferentiationStrength(50, [], false, false);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("mechanism + tradeoffs boost score", () => {
    const withMech = calculateDifferentiationStrength(80, [{ valueId: "status", score: 5, signal: "" }], true, true);
    const without = calculateDifferentiationStrength(80, [{ valueId: "status", score: 5, signal: "" }], false, false);
    expect(withMech).toBeGreaterThan(without);
  });
});

// === Contrary Metrics ===
describe("selectContraryMetrics", () => {
  it("returns up to 3 metrics", () => {
    const metrics = selectContraryMetrics(makeFormData({ priceRange: "premium", topCompetitors: ["A", "B", "C"] }));
    expect(metrics.length).toBeGreaterThanOrEqual(2);
    expect(metrics.length).toBeLessThanOrEqual(3);
  });

  it("each has bilingual name", () => {
    for (const m of selectContraryMetrics(makeFormData())) {
      expect(m.name.he).toBeTruthy();
      expect(m.name.en).toBeTruthy();
    }
  });
});

// === Hybrid Category ===
describe("suggestHybridCategory", () => {
  it("returns category for SaaS", () => {
    const cat = suggestHybridCategory(makeFormData({ industry: "SaaS tech" }));
    expect(cat.name.he).toBeTruthy();
    expect(cat.name.en).toBeTruthy();
  });

  it("returns consulting category for consultants", () => {
    const cat = suggestHybridCategory(makeFormData({ industry: "Management Consulting" }));
    expect(cat.name.en).toBe("Consultant-Product");
  });
});

// === Main Generator ===
describe("generateDifferentiation", () => {
  it("returns complete result", () => {
    const result = generateDifferentiation(makeFormData({
      claimExamples: [{ claim: "Fast", evidence: "2x speed", verified: true, gap: "" }],
      hiddenValues: [{ valueId: "status", score: 4, signal: "x" }],
    }));
    expect(result.id).toBeTruthy();
    expect(result.createdAt).toBeTruthy();
    expect(result.differentiationStrength).toBeGreaterThanOrEqual(0);
    expect(result.claimVerificationScore).toBeGreaterThanOrEqual(0);
    expect(result.executiveSummary.he).toBeTruthy();
    expect(result.nextSteps.length).toBeGreaterThan(0);
  });
});

// === Knowledge Base Completeness ===
describe("Knowledge Base", () => {
  it("has 8 hidden values with bilingual probes", () => {
    expect(HIDDEN_VALUES).toHaveLength(8);
    for (const hv of HIDDEN_VALUES) {
      expect(hv.probe.he).toBeTruthy();
      expect(hv.probe.en).toBeTruthy();
      expect(hv.signals.length).toBeGreaterThan(0);
    }
  });

  it("has 5 competitor archetypes", () => {
    expect(COMPETITOR_ARCHETYPES).toHaveLength(5);
    for (const a of COMPETITOR_ARCHETYPES) {
      expect(a.description.he).toBeTruthy();
      expect(a.counterStrategy).toBeTruthy();
    }
  });

  it("has 7 buying committee roles", () => {
    expect(BUYING_COMMITTEE_ROLES).toHaveLength(7);
  });

  it("has 10 fake + 5 real signals", () => {
    expect(FAKE_DIFFERENTIATION_SIGNALS).toHaveLength(10);
    expect(REAL_DIFFERENTIATION_SIGNALS).toHaveLength(5);
  });

  it("has 10 hybrid categories", () => {
    expect(HYBRID_CATEGORIES).toHaveLength(10);
    for (const h of HYBRID_CATEGORIES) {
      expect(h.name.he).toBeTruthy();
      expect(h.name.en).toBeTruthy();
    }
  });

  it("has 5 contrary metrics bilingual", () => {
    expect(CONTRARY_METRICS).toHaveLength(5);
    for (const m of CONTRARY_METRICS) {
      expect(m.name.he).toBeTruthy();
      expect(m.description.en).toBeTruthy();
    }
  });

  it("has 4 normalizing frames", () => {
    expect(Object.keys(NORMALIZING_FRAMES)).toHaveLength(4);
    for (const frame of Object.values(NORMALIZING_FRAMES)) {
      expect(frame.he).toBeTruthy();
      expect(frame.en).toBeTruthy();
    }
  });
});

// === Phases ===
describe("PHASES config", () => {
  it("has 5 phases", () => {
    expect(PHASES).toHaveLength(5);
  });

  it("each phase has bilingual title + description", () => {
    for (const p of PHASES) {
      expect(p.title.he).toBeTruthy();
      expect(p.title.en).toBeTruthy();
      expect(p.description.he).toBeTruthy();
    }
  });

  it("getPhaseById returns correct phase", () => {
    expect(getPhaseById("hidden").number).toBe(3);
    expect(getPhaseById("synthesis").number).toBe(5);
  });

  it("phase 1 has no AI enrichment", () => {
    expect(PHASES[0].aiEnrichment).toBe(false);
  });

  it("phases 2-5 have AI enrichment", () => {
    expect(PHASES[1].aiEnrichment).toBe(true);
    expect(PHASES[2].aiEnrichment).toBe(true);
    expect(PHASES[3].aiEnrichment).toBe(true);
    expect(PHASES[4].aiEnrichment).toBe(true);
  });
});

// === B2C UNIFIED FRAMEWORK ===

describe("detectMarketMode", () => {
  it("detects B2B", () => {
    expect(detectMarketMode("b2b")).toBe("b2b");
    expect(detectMarketMode("b2b_enterprise")).toBe("b2b");
    expect(detectMarketMode("b2b_smb")).toBe("b2b");
    expect(detectMarketMode("b2b_gov")).toBe("b2b");
  });

  it("detects B2C", () => {
    expect(detectMarketMode("b2c")).toBe("b2c");
    expect(detectMarketMode("b2c_ecommerce")).toBe("b2c");
    expect(detectMarketMode("b2c_service")).toBe("b2c");
    expect(detectMarketMode("b2c_creator")).toBe("b2c");
  });

  it("detects hybrid", () => {
    expect(detectMarketMode("both")).toBe("hybrid");
    expect(detectMarketMode("b2b2c")).toBe("hybrid");
  });
});

describe("getHiddenValuesForMode", () => {
  it("B2B returns 8 values", () => {
    expect(getHiddenValuesForMode("b2b")).toHaveLength(8);
  });

  it("B2C returns 12 values (6 universal + 6 B2C)", () => {
    expect(getHiddenValuesForMode("b2c")).toHaveLength(12);
  });

  it("hybrid returns 14 values (all)", () => {
    expect(getHiddenValuesForMode("hybrid")).toHaveLength(14);
  });

  it("B2C values include convenience and aesthetic", () => {
    const b2c = getHiddenValuesForMode("b2c");
    expect(b2c.some((v) => v.id === "convenience")).toBe(true);
    expect(b2c.some((v) => v.id === "aesthetic")).toBe(true);
  });

  it("B2B values include autonomy and empathy", () => {
    const b2b = getHiddenValuesForMode("b2b");
    expect(b2b.some((v) => v.id === "autonomy")).toBe(true);
    expect(b2b.some((v) => v.id === "empathy")).toBe(true);
  });
});

describe("getCompetitorArchetypesForMode", () => {
  it("B2B returns 5 archetypes", () => {
    expect(getCompetitorArchetypesForMode("b2b")).toHaveLength(5);
  });

  it("B2C returns 5 archetypes", () => {
    expect(getCompetitorArchetypesForMode("b2c")).toHaveLength(5);
  });

  it("hybrid returns 10 archetypes", () => {
    expect(getCompetitorArchetypesForMode("hybrid")).toHaveLength(10);
  });
});

describe("getContraryMetricsForMode", () => {
  it("B2B returns 5 metrics", () => {
    expect(getContraryMetricsForMode("b2b")).toHaveLength(5);
  });

  it("B2C returns 5 metrics", () => {
    const b2c = getContraryMetricsForMode("b2c");
    expect(b2c).toHaveLength(5);
    expect(b2c.some((m) => m.name.en.includes("Repeat"))).toBe(true);
  });
});

describe("B2C Knowledge Base completeness", () => {
  it("B2C has 5 competitor archetypes with bilingual content", () => {
    expect(B2C_COMPETITOR_ARCHETYPES).toHaveLength(5);
    for (const a of B2C_COMPETITOR_ARCHETYPES) {
      expect(a.description.he).toBeTruthy();
      expect(a.description.en).toBeTruthy();
      expect(a.counterStrategy).toBeTruthy();
    }
  });

  it("B2C has 6 hidden values with bilingual probes", () => {
    expect(B2C_HIDDEN_VALUES).toHaveLength(6);
    for (const v of B2C_HIDDEN_VALUES) {
      expect(v.probe.he).toBeTruthy();
      expect(v.probe.en).toBeTruthy();
    }
  });

  it("B2C has 5 contrary metrics bilingual", () => {
    expect(B2C_CONTRARY_METRICS).toHaveLength(5);
    for (const m of B2C_CONTRARY_METRICS) {
      expect(m.name.he).toBeTruthy();
      expect(m.description.en).toBeTruthy();
    }
  });

  it("influence network has 6 roles", () => {
    expect(INFLUENCE_NETWORK_ROLES).toHaveLength(6);
  });
});

describe("Phase questions adapt to B2C", () => {
  it("Phase 2 swaps lostDealReason for negativeReviewTheme in B2C", () => {
    const b2cForm = { ...makeFormData(), targetMarket: "b2c" as const };
    const questions = getQuestionsForPhase("contradiction", b2cForm);
    expect(questions.some((q) => q.id === "negativeReviewTheme")).toBe(true);
    expect(questions.some((q) => q.id === "lostDealReason")).toBe(false);
  });

  it("Phase 4 swaps buyingCommittee for influenceNetwork in B2C", () => {
    const b2cForm = { ...makeFormData(), targetMarket: "b2c_ecommerce" as const };
    const questions = getQuestionsForPhase("mapping", b2cForm);
    expect(questions.some((q) => q.id === "influenceNetwork")).toBe(true);
    expect(questions.some((q) => q.id === "buyingCommittee")).toBe(false);
  });

  it("Phase 4 keeps buyingCommittee for B2B", () => {
    const b2bForm = makeFormData();
    const questions = getQuestionsForPhase("mapping", b2bForm);
    expect(questions.some((q) => q.id === "buyingCommittee")).toBe(true);
  });

  it("B2C contrary metrics use B2C set", () => {
    const b2cForm = { ...makeFormData(), targetMarket: "b2c" as const };
    const metrics = selectContraryMetrics(b2cForm);
    expect(metrics.length).toBeGreaterThanOrEqual(2);
    // Should not include B2B-only metrics
    expect(metrics.some((m) => m.name.en.includes("Budget Expansion"))).toBe(false);
  });
});
