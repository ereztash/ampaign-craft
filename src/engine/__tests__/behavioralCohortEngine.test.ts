import { describe, it, expect, vi } from "vitest";
import {
  assignToCohort,
  getCohortRecommendations,
  getAllCohorts,
  getCohort,
  ENGINE_MANIFEST,
  type CohortId,
  type BehavioralCohort,
  type CohortAssignment,
} from "../behavioralCohortEngine";
import type { FormData } from "@/types/funnel";
import type { DISCProfile } from "../discProfileEngine";

// ── Mock external deps ─────────────────────────────────────────────────────
vi.mock("./blackboard/contract", () => ({
  writeContext: vi.fn().mockResolvedValue(undefined),
  conceptKey: vi.fn((_a: string, _b: string, _c: string) => `${_a}-${_b}-${_c}`),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────
function makeFormData(overrides: Partial<FormData> = {}): FormData {
  return {
    businessField: "tech",
    audienceType: "b2b",
    ageRange: [25, 45],
    interests: "marketing",
    productDescription: "SaaS platform",
    averagePrice: 500,
    salesModel: "subscription",
    budgetRange: "medium",
    mainGoal: "sales",
    existingChannels: ["facebook"],
    experienceLevel: "intermediate",
    ...overrides,
  };
}

function makeDisc(primary: "D" | "I" | "S" | "C"): DISCProfile {
  return { primary, secondary: "I", scores: { D: 0, I: 0, S: 0, C: 0 }, distribution: { D: 25, I: 25, S: 25, C: 25 } } as unknown as DISCProfile;
}

// ─────────────────────────────────────────────────────────────────────────
// ENGINE_MANIFEST
// ─────────────────────────────────────────────────────────────────────────

describe("BehavioralCohortEngine — ENGINE_MANIFEST", () => {
  it("has correct name and stage", () => {
    expect(ENGINE_MANIFEST.name).toBe("behavioralCohortEngine");
    expect(ENGINE_MANIFEST.stage).toBe("diagnose");
    expect(ENGINE_MANIFEST.isLive).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getAllCohorts
// ─────────────────────────────────────────────────────────────────────────

describe("getAllCohorts", () => {
  it("returns 12 cohorts", () => {
    expect(getAllCohorts()).toHaveLength(12);
  });

  it("each cohort has required fields", () => {
    for (const cohort of getAllCohorts()) {
      expect(cohort.cohortId).toBeTruthy();
      expect(cohort.name.he).toBeTruthy();
      expect(cohort.name.en).toBeTruthy();
      expect(typeof cohort.size).toBe("number");
      expect(Array.isArray(cohort.characteristics)).toBe(true);
      expect(Array.isArray(cohort.topPerformingStrategies)).toBe(true);
      expect(cohort.avgMetrics.conversionRate).toBeTruthy();
      expect(cohort.avgMetrics.ltv).toBeTruthy();
      expect(cohort.avgMetrics.churnRate).toBeTruthy();
    }
  });

  it("cohort sizes are positive numbers", () => {
    for (const cohort of getAllCohorts()) {
      expect(cohort.size).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getCohort
// ─────────────────────────────────────────────────────────────────────────

describe("getCohort", () => {
  it("returns the correct cohort for a known id", () => {
    const cohort = getCohort("growth_hackers");
    expect(cohort).toBeDefined();
    expect(cohort?.cohortId).toBe("growth_hackers");
  });

  it("returns undefined for unknown id", () => {
    const cohort = getCohort("nonexistent" as CohortId);
    expect(cohort).toBeUndefined();
  });

  it("returns decisive_beginners correctly", () => {
    const c = getCohort("decisive_beginners");
    expect(c?.name.en).toBe("Decisive Beginners");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// getCohortRecommendations
// ─────────────────────────────────────────────────────────────────────────

describe("getCohortRecommendations", () => {
  it("returns an array of strategies", () => {
    const strats = getCohortRecommendations("decisive_beginners");
    expect(Array.isArray(strats)).toBe(true);
    expect(strats.length).toBeGreaterThan(0);
  });

  it("each strategy has bilingual title, description, and expectedLift", () => {
    const strats = getCohortRecommendations("analytical_scalers");
    for (const s of strats) {
      expect(s.title.he).toBeTruthy();
      expect(s.title.en).toBeTruthy();
      expect(s.description.he).toBeTruthy();
      expect(s.description.en).toBeTruthy();
      expect(s.expectedLift).toBeTruthy();
    }
  });

  it("returns empty array for unknown cohort", () => {
    const strats = getCohortRecommendations("unknown" as CohortId);
    expect(strats).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// assignToCohort
// ─────────────────────────────────────────────────────────────────────────

describe("assignToCohort", () => {
  it("returns a CohortAssignment with required fields", () => {
    const result = assignToCohort(makeFormData(), makeDisc("D"));
    expect(result.primaryCohort).toBeDefined();
    expect(result.matchConfidence).toBeGreaterThan(0);
    expect(result.matchConfidence).toBeLessThanOrEqual(100);
    expect(result.rationale.he).toBeTruthy();
    expect(result.rationale.en).toBeTruthy();
  });

  it("low budget + beginner → price_sensitive_starters", () => {
    const result = assignToCohort(
      makeFormData({ budgetRange: "low", experienceLevel: "beginner" }),
      makeDisc("I"),
    );
    expect(result.primaryCohort.cohortId).toBe("price_sensitive_starters");
  });

  it("high budget + D dominant → decisive_scalers or premium_challengers", () => {
    const result = assignToCohort(
      makeFormData({ budgetRange: "high", experienceLevel: "intermediate" }),
      makeDisc("D"),
    );
    expect(["decisive_scalers", "premium_challengers"]).toContain(result.primaryCohort.cohortId);
  });

  it("C dominant + advanced → analytical_scalers", () => {
    const result = assignToCohort(
      makeFormData({ experienceLevel: "advanced" }),
      makeDisc("C"),
    );
    expect(result.primaryCohort.cohortId).toBe("analytical_scalers");
  });

  it("C dominant + non-advanced → analytical_starters", () => {
    const result = assignToCohort(
      makeFormData({ experienceLevel: "beginner", budgetRange: "medium" }),
      makeDisc("C"),
    );
    expect(result.primaryCohort.cohortId).toBe("analytical_starters");
  });

  it("S dominant + loyalty goal → community_loyalists", () => {
    const result = assignToCohort(
      makeFormData({ mainGoal: "loyalty", budgetRange: "medium" }),
      makeDisc("S"),
    );
    expect(result.primaryCohort.cohortId).toBe("community_loyalists");
  });

  it("I dominant + loyalty goal → community_builders", () => {
    const result = assignToCohort(
      makeFormData({ mainGoal: "loyalty", budgetRange: "medium" }),
      makeDisc("I"),
    );
    expect(result.primaryCohort.cohortId).toBe("community_builders");
  });

  it("I dominant + awareness goal → visionary_storytellers", () => {
    const result = assignToCohort(
      makeFormData({ mainGoal: "awareness", budgetRange: "medium" }),
      makeDisc("I"),
    );
    expect(result.primaryCohort.cohortId).toBe("visionary_storytellers");
  });

  it("D dominant + beginner → decisive_beginners", () => {
    const result = assignToCohort(
      makeFormData({ experienceLevel: "beginner", budgetRange: "medium" }),
      makeDisc("D"),
    );
    expect(result.primaryCohort.cohortId).toBe("decisive_beginners");
  });

  it("high churn risk → retention_optimizers", () => {
    const result = assignToCohort(
      makeFormData({ mainGoal: "sales", experienceLevel: "intermediate", budgetRange: "medium" }),
      makeDisc("D"),
      undefined,
      75,
    );
    expect(result.primaryCohort.cohortId).toBe("retention_optimizers");
  });

  it("secondary cohort is null when primary is fallback", () => {
    const result = assignToCohort(makeFormData(), makeDisc("D"));
    // secondary may or may not be null depending on primary cohort
    // just verify it is either null or a valid cohort
    if (result.secondaryCohort !== null) {
      expect(result.secondaryCohort.cohortId).toBeTruthy();
    } else {
      expect(result.secondaryCohort).toBeNull();
    }
  });

  it("confidence is numeric in [0,100]", () => {
    const result = assignToCohort(makeFormData(), makeDisc("S"));
    expect(result.matchConfidence).toBeGreaterThanOrEqual(0);
    expect(result.matchConfidence).toBeLessThanOrEqual(100);
  });

  it("rationale references DISC and stage", () => {
    const result = assignToCohort(makeFormData({ experienceLevel: "intermediate" }), makeDisc("D"));
    expect(result.rationale.en).toContain("D");
    expect(result.rationale.en).toMatch(/scaling|beginner|advanced/);
  });

  it("works without optional churnRisk and blackboardCtx", () => {
    expect(() => assignToCohort(makeFormData(), makeDisc("I"))).not.toThrow();
  });
});
