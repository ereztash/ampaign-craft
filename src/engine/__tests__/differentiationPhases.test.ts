import { describe, it, expect, vi } from "vitest";
import {
  PHASES,
  getPhaseById,
  getQuestionsForPhase,
  ENGINE_MANIFEST,
} from "../differentiationPhases";
import type { DifferentiationFormData } from "@/types/differentiation";
import { initialDifferentiationFormData } from "@/types/differentiation";

// ── Mock external deps ─────────────────────────────────────────────────────
vi.mock("../blackboard/contract", () => ({
  writeContext: vi.fn().mockResolvedValue(undefined),
  conceptKey: vi.fn((_a: string, _b: string, _c: string) => `${_a}-${_b}-${_c}`),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeFormData(overrides: Partial<DifferentiationFormData> = {}): DifferentiationFormData {
  return {
    ...initialDifferentiationFormData,
    businessName: "Test Corp",
    industry: "tech",
    targetMarket: "b2b",
    companySize: "2-10",
    currentPositioning: "We are the best",
    topCompetitors: ["Competitor A"],
    priceRange: "mid",
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// ENGINE_MANIFEST
// ─────────────────────────────────────────────────────────────────────────

describe("DifferentiationPhases — ENGINE_MANIFEST", () => {
  it("has the correct name", () => {
    expect(ENGINE_MANIFEST.name).toBe("differentiationPhases");
  });

  it("has stage 'diagnose'", () => {
    expect(ENGINE_MANIFEST.stage).toBe("diagnose");
  });

  it("isLive is true", () => {
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// PHASES array
// ─────────────────────────────────────────────────────────────────────────

describe("PHASES", () => {
  it("has exactly 5 phases", () => {
    expect(PHASES).toHaveLength(5);
  });

  it("phase numbers are 1 through 5", () => {
    const numbers = PHASES.map((p) => p.number);
    expect(numbers).toEqual([1, 2, 3, 4, 5]);
  });

  it("phase IDs are the expected values", () => {
    const ids = PHASES.map((p) => p.id);
    expect(ids).toEqual(["surface", "contradiction", "hidden", "mapping", "synthesis"]);
  });

  it("each phase has bilingual title and description", () => {
    for (const phase of PHASES) {
      expect(phase.title.he).toBeTruthy();
      expect(phase.title.en).toBeTruthy();
      expect(phase.description.he).toBeTruthy();
      expect(phase.description.en).toBeTruthy();
    }
  });

  it("each phase has a color and icon", () => {
    for (const phase of PHASES) {
      expect(phase.color).toBeTruthy();
      expect(phase.icon).toBeTruthy();
    }
  });

  it("each phase has an aiEnrichment boolean", () => {
    for (const phase of PHASES) {
      expect(typeof phase.aiEnrichment).toBe("boolean");
    }
  });

  it("phase 1 (surface) has no AI enrichment", () => {
    const phase1 = PHASES[0];
    expect(phase1.id).toBe("surface");
    expect(phase1.aiEnrichment).toBe(false);
  });

  it("synthesis phase has empty questions array (AI-only)", () => {
    const synthesis = PHASES.find((p) => p.id === "synthesis");
    expect(synthesis?.questions).toHaveLength(0);
    expect(synthesis?.aiEnrichment).toBe(true);
  });

  it("surface phase has multiple questions", () => {
    const surface = PHASES.find((p) => p.id === "surface");
    expect(surface!.questions.length).toBeGreaterThanOrEqual(5);
  });

  it("each question has id, type, required, and label", () => {
    for (const phase of PHASES) {
      for (const q of phase.questions) {
        expect(q.id).toBeTruthy();
        expect(q.type).toBeTruthy();
        expect(typeof q.required).toBe("boolean");
        expect(q.label.he).toBeTruthy();
        expect(q.label.en).toBeTruthy();
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getPhaseById
// ─────────────────────────────────────────────────────────────────────────

describe("getPhaseById", () => {
  it("returns the correct phase for 'surface'", () => {
    const phase = getPhaseById("surface");
    expect(phase.id).toBe("surface");
    expect(phase.number).toBe(1);
  });

  it("returns the correct phase for 'contradiction'", () => {
    const phase = getPhaseById("contradiction");
    expect(phase.id).toBe("contradiction");
    expect(phase.number).toBe(2);
  });

  it("returns the correct phase for 'hidden'", () => {
    const phase = getPhaseById("hidden");
    expect(phase.id).toBe("hidden");
    expect(phase.number).toBe(3);
  });

  it("returns the correct phase for 'mapping'", () => {
    const phase = getPhaseById("mapping");
    expect(phase.id).toBe("mapping");
    expect(phase.number).toBe(4);
  });

  it("returns the correct phase for 'synthesis'", () => {
    const phase = getPhaseById("synthesis");
    expect(phase.id).toBe("synthesis");
    expect(phase.number).toBe(5);
  });

  it("falls back to PHASES[0] for unknown id", () => {
    const phase = getPhaseById("nonexistent" as any);
    expect(phase.id).toBe("surface");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getQuestionsForPhase
// ─────────────────────────────────────────────────────────────────────────

describe("getQuestionsForPhase — B2B mode", () => {
  const b2bFormData = makeFormData({ targetMarket: "b2b" });

  it("returns questions for 'surface' phase in b2b", () => {
    const questions = getQuestionsForPhase("surface", b2bFormData);
    expect(questions.length).toBeGreaterThan(0);
  });

  it("returns original questions for 'contradiction' phase in b2b", () => {
    const questions = getQuestionsForPhase("contradiction", b2bFormData);
    const ids = questions.map((q) => q.id);
    expect(ids).toContain("lostDealReason");
  });

  it("returns original questions for 'mapping' phase in b2b", () => {
    const questions = getQuestionsForPhase("mapping", b2bFormData);
    const ids = questions.map((q) => q.id);
    expect(ids).toContain("buyingCommittee");
    expect(ids).toContain("decisionLatency");
  });

  it("returns empty array for 'synthesis' phase (AI-only)", () => {
    const questions = getQuestionsForPhase("synthesis", b2bFormData);
    expect(questions).toHaveLength(0);
  });

  it("surface questions include 'businessName' and 'industry'", () => {
    const questions = getQuestionsForPhase("surface", b2bFormData);
    const ids = questions.map((q) => q.id);
    expect(ids).toContain("businessName");
    expect(ids).toContain("industry");
  });
});

describe("getQuestionsForPhase — B2C mode", () => {
  const b2cFormData = makeFormData({ targetMarket: "b2c" });

  it("swaps lostDealReason for negativeReviewTheme in contradiction phase", () => {
    const questions = getQuestionsForPhase("contradiction", b2cFormData);
    const ids = questions.map((q) => q.id);
    expect(ids).toContain("negativeReviewTheme");
    expect(ids).not.toContain("lostDealReason");
  });

  it("swaps buyingCommittee for influenceNetwork in mapping phase", () => {
    const questions = getQuestionsForPhase("mapping", b2cFormData);
    const ids = questions.map((q) => q.id);
    expect(ids).toContain("influenceNetwork");
    expect(ids).not.toContain("buyingCommittee");
  });

  it("swaps decisionLatency for decisionSpeed in mapping phase", () => {
    const questions = getQuestionsForPhase("mapping", b2cFormData);
    const ids = questions.map((q) => q.id);
    expect(ids).toContain("decisionSpeed");
    expect(ids).not.toContain("decisionLatency");
  });

  it("influenceNetwork options include self, peer_circle, digital_influencer", () => {
    const questions = getQuestionsForPhase("mapping", b2cFormData);
    const influence = questions.find((q) => q.id === "influenceNetwork");
    const optionValues = influence?.options?.map((o) => o.value);
    expect(optionValues).toContain("self");
    expect(optionValues).toContain("peer_circle");
    expect(optionValues).toContain("digital_influencer");
  });

  it("decisionSpeed options include impulse option", () => {
    const questions = getQuestionsForPhase("mapping", b2cFormData);
    const ds = questions.find((q) => q.id === "decisionSpeed");
    const values = ds?.options?.map((o) => o.value);
    expect(values).toContain("impulse");
  });

  it("surface phase is the same in b2c and b2b", () => {
    const b2b = getQuestionsForPhase("surface", makeFormData({ targetMarket: "b2b" }));
    const b2c = getQuestionsForPhase("surface", b2cFormData);
    expect(b2b.map((q) => q.id)).toEqual(b2c.map((q) => q.id));
  });
});

describe("getQuestionsForPhase — B2C via b2c_ecommerce", () => {
  it("b2c_ecommerce target swaps contradiction questions", () => {
    const formData = makeFormData({ targetMarket: "b2c_ecommerce" });
    const questions = getQuestionsForPhase("contradiction", formData);
    const ids = questions.map((q) => q.id);
    expect(ids).toContain("negativeReviewTheme");
  });
});

describe("getQuestionsForPhase — blackboardCtx", () => {
  it("works without blackboardCtx", () => {
    expect(() => getQuestionsForPhase("surface", makeFormData())).not.toThrow();
  });

  it("works with blackboardCtx", () => {
    expect(() =>
      getQuestionsForPhase("surface", makeFormData(), { userId: "u1", planId: "p1" }),
    ).not.toThrow();
  });
});

describe("getQuestionsForPhase — question structure", () => {
  it("select questions have options array", () => {
    const questions = getQuestionsForPhase("surface", makeFormData());
    const selectQuestions = questions.filter((q) => q.type === "select");
    for (const q of selectQuestions) {
      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options!.length).toBeGreaterThan(0);
    }
  });

  it("options have value and label", () => {
    const questions = getQuestionsForPhase("surface", makeFormData());
    const selectQuestions = questions.filter((q) => q.type === "select");
    for (const q of selectQuestions) {
      for (const opt of q.options!) {
        expect(opt.value).toBeTruthy();
        expect(opt.label.he).toBeTruthy();
        expect(opt.label.en).toBeTruthy();
      }
    }
  });

  it("hidden phase has slider question for hiddenValues", () => {
    const questions = getQuestionsForPhase("hidden", makeFormData());
    const slider = questions.find((q) => q.type === "slider");
    expect(slider).toBeDefined();
  });
});
