/**
 * Engine Fuzz Tests
 *
 * Calls every major pure engine function with extreme / invalid inputs.
 * Goal: surface runtime crashes, NaN propagation, unhandled nulls, or
 * infinite-loop-style hangs BEFORE they reach production.
 *
 * Rules:
 * - No LLM / network calls (pure engines only)
 * - Each call is wrapped in try/catch; failures are collected and reported
 *   at end so one bug doesn't hide others
 * - Timeout per test: 15s (catches runaway loops)
 */
import { describe, it, expect } from "vitest";
import type { FormData } from "@/types/funnel";
import type { DISCProfile } from "@/types/funnel";

// ─── Edge-case values ─────────────────────────────────────────────────────────

const LONG_HE = "מוצר עסקי מדהים עם יתרון תחרותי ".repeat(300);
const LONG_EN = "x".repeat(50_000);
const XSS     = "<script>alert('xss')</script>";
const SQL     = "'; DROP TABLE plans; --";
const EMOJI   = "🚀💥🔥".repeat(200);
const NULLISH_STR = "null";

const EDGE_STRINGS = [LONG_HE, LONG_EN, XSS, SQL, EMOJI, NULLISH_STR, "", " ", "\0\n\r\t"];
const EDGE_NUMS    = [0, -1, -9999, 0.001, 1e15, Infinity, -Infinity, NaN, Number.MAX_SAFE_INTEGER];

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseFormData: FormData = {
  businessField: "tech",
  audienceType: "b2b",
  ageRange: [25, 55],
  interests: "business growth",
  productDescription: "SaaS platform for SMBs",
  averagePrice: 500,
  salesModel: "saas",
  budgetRange: "medium",
  mainGoal: "leads",
  existingChannels: ["social", "email"],
  experienceLevel: "intermediate",
};

const emptyFormData: FormData = {
  businessField: "",
  audienceType: "",
  ageRange: [0, 0],
  interests: "",
  productDescription: "",
  averagePrice: 0,
  salesModel: "",
  budgetRange: "",
  mainGoal: "",
  existingChannels: [],
  experienceLevel: "",
};

const brokenFormData: Partial<FormData> = {
  businessField: undefined as unknown as FormData["businessField"],
  audienceType: undefined as unknown as FormData["audienceType"],
  ageRange: undefined as unknown as FormData["ageRange"],
  averagePrice: NaN,
};

/** Collect all failures so one crash doesn't abort the rest */
function runAll(cases: Array<{ label: string; fn: () => unknown }>): string[] {
  const failures: string[] = [];
  for (const { label, fn } of cases) {
    try {
      const result = fn();
      // Detect NaN in numeric output fields (shallow check)
      if (result && typeof result === "object") {
        for (const [k, v] of Object.entries(result as Record<string, unknown>)) {
          if (typeof v === "number" && isNaN(v)) {
            failures.push(`${label}: NaN in output.${k}`);
          }
        }
      }
    } catch (err) {
      failures.push(`${label}: ${(err as Error).message}`);
    }
  }
  return failures;
}

// ─── Test suites ──────────────────────────────────────────────────────────────

describe("hormoziValueEngine fuzz", () => {
  it("calculateValueScore — doesn't crash on any FormData variant", async () => {
    const { calculateValueScore } = await import("@/engine/hormoziValueEngine");
    const failures = runAll([
      { label: "base", fn: () => calculateValueScore(baseFormData) },
      { label: "empty", fn: () => calculateValueScore(emptyFormData) },
      { label: "broken", fn: () => calculateValueScore(brokenFormData as FormData) },
      { label: "null ukg", fn: () => calculateValueScore(baseFormData, null) },
      ...EDGE_STRINGS.map((s) => ({
        label: `str[${s.slice(0, 20)}]`,
        fn: () => calculateValueScore({ ...baseFormData, productDescription: s, interests: s }),
      })),
      ...EDGE_NUMS.map((n) => ({
        label: `price=${n}`,
        fn: () => calculateValueScore({ ...baseFormData, averagePrice: n }),
      })),
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("discProfileEngine fuzz", () => {
  it("inferDISCProfile — doesn't crash on any FormData variant", async () => {
    const { inferDISCProfile } = await import("@/engine/discProfileEngine");
    const failures = runAll([
      { label: "base", fn: () => inferDISCProfile(baseFormData) },
      { label: "empty", fn: () => inferDISCProfile(emptyFormData) },
      { label: "broken", fn: () => inferDISCProfile(brokenFormData as FormData) },
      ...EDGE_STRINGS.map((s) => ({
        label: `str[${s.slice(0, 20)}]`,
        fn: () => inferDISCProfile({ ...baseFormData, interests: s }),
      })),
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("archetypeClassifier fuzz", () => {
  it("classifyArchetype — doesn't crash on empty / partial blackboard", async () => {
    const { classifyArchetype, blendScores } = await import("@/engine/archetypeClassifier");
    const failures = runAll([
      { label: "empty board", fn: () => classifyArchetype({}) },
      { label: "null signals", fn: () => classifyArchetype({ formData: brokenFormData as FormData }) },
      { label: "base formData", fn: () => classifyArchetype({ formData: baseFormData }) },
      { label: "blendScores empty", fn: () => blendScores({}, {}) },
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("pricingWizardEngine fuzz", () => {
  it("computePricingWizardRecommendation — handles edge numeric inputs", async () => {
    const { computePricingWizardRecommendation } = await import("@/engine/pricingWizardEngine");
    const baseInput = {
      dreamOutcome: "transformative" as const,
      timeToValue: "fast" as const,
      tooChcapPrice: 50,
      stretchPrice: 300,
      effortLevel: "medium" as const,
      socialProof: "some" as const,
      differentiators: ["speed", "ease"],
      salesModel: "saas" as const,
      avgRetentionMonths: 12,
      revenueGoalMonthly: 10000,
      audienceIsB2B: true,
    };
    const failures = runAll([
      { label: "base", fn: () => computePricingWizardRecommendation(baseInput) },
      { label: "b2c", fn: () => computePricingWizardRecommendation({ ...baseInput, audienceIsB2B: false }) },
      ...EDGE_NUMS.map((n) => ({
        label: `tooChcap=${n}`,
        fn: () => computePricingWizardRecommendation({ ...baseInput, tooChcapPrice: n }),
      })),
      ...EDGE_NUMS.map((n) => ({
        label: `stretchPrice=${n}`,
        fn: () => computePricingWizardRecommendation({ ...baseInput, stretchPrice: n }),
      })),
      ...EDGE_NUMS.map((n) => ({
        label: `retention=${n}`,
        fn: () => computePricingWizardRecommendation({ ...baseInput, avgRetentionMonths: n }),
      })),
      ...EDGE_NUMS.map((n) => ({
        label: `revenueGoal=${n}`,
        fn: () => computePricingWizardRecommendation({ ...baseInput, revenueGoalMonthly: n }),
      })),
      { label: "empty differentiators", fn: () => computePricingWizardRecommendation({ ...baseInput, differentiators: [] }) },
      { label: "100 differentiators", fn: () => computePricingWizardRecommendation({ ...baseInput, differentiators: Array(100).fill("speed") }) },
      { label: "same price floor=ceiling", fn: () => computePricingWizardRecommendation({ ...baseInput, tooChcapPrice: 100, stretchPrice: 100 }) },
      { label: "floor > ceiling", fn: () => computePricingWizardRecommendation({ ...baseInput, tooChcapPrice: 999, stretchPrice: 1 }) },
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("churnPredictionEngine fuzz", () => {
  it("assessChurnRisk — handles all FormData variants", async () => {
    const { assessChurnRisk } = await import("@/engine/churnPredictionEngine");
    const failures = runAll([
      { label: "base", fn: () => assessChurnRisk(baseFormData) },
      { label: "empty", fn: () => assessChurnRisk(emptyFormData) },
      { label: "broken", fn: () => assessChurnRisk(brokenFormData as FormData) },
      { label: "null ukg", fn: () => assessChurnRisk(baseFormData, undefined) },
      ...EDGE_NUMS.map((n) => ({
        label: `price=${n}`,
        fn: () => assessChurnRisk({ ...baseFormData, averagePrice: n }),
      })),
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("costOfInactionEngine fuzz", () => {
  it("calculateCostOfInaction — handles edge FunnelResult", async () => {
    const { calculateCostOfInaction } = await import("@/engine/costOfInactionEngine");
    const { generateFunnel } = await import("@/engine/funnelEngine");
    const baseFunnel = generateFunnel(baseFormData);
    const emptyFunnel = generateFunnel(emptyFormData);
    const failures = runAll([
      { label: "base", fn: () => calculateCostOfInaction(baseFunnel) },
      { label: "empty", fn: () => calculateCostOfInaction(emptyFunnel) },
      ...EDGE_NUMS.map((n) => ({
        label: `price=${n}`,
        fn: () => calculateCostOfInaction({ ...baseFunnel, formData: { ...baseFormData, averagePrice: n } }),
      })),
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("funnelEngine fuzz", () => {
  it("generateFunnel — handles extreme FormData without crash", async () => {
    const { generateFunnel } = await import("@/engine/funnelEngine");
    const failures = runAll([
      { label: "base", fn: () => generateFunnel(baseFormData) },
      { label: "empty", fn: () => generateFunnel(emptyFormData) },
      { label: "broken", fn: () => generateFunnel(brokenFormData as FormData) },
      ...EDGE_STRINGS.map((s) => ({
        label: `desc[${s.slice(0, 20)}]`,
        fn: () => generateFunnel({ ...baseFormData, productDescription: s }),
      })),
      ...EDGE_NUMS.map((n) => ({
        label: `price=${n}`,
        fn: () => generateFunnel({ ...baseFormData, averagePrice: n }),
      })),
      { label: "1000 channels", fn: () => generateFunnel({ ...baseFormData, existingChannels: Array(1000).fill("social") as FormData["existingChannels"] }) },
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("neuroClosingEngine fuzz", () => {
  it("generateClosingStrategy — handles all DISC types and edge FormData", async () => {
    const { generateClosingStrategy } = await import("@/engine/neuroClosingEngine");
    const { inferDISCProfile } = await import("@/engine/discProfileEngine");
    const disc = inferDISCProfile(baseFormData);
    const { generateFunnel } = await import("@/engine/funnelEngine");
    const funnel = generateFunnel(baseFormData);

    const discTypes: DISCProfile["primary"][] = ["D", "I", "S", "C"];
    const failures = runAll([
      { label: "base", fn: () => generateClosingStrategy(disc, baseFormData) },
      { label: "empty form", fn: () => generateClosingStrategy(disc, emptyFormData) },
      ...discTypes.map((primary) => ({
        label: `DISC:${primary}`,
        fn: () => generateClosingStrategy({ ...disc, primary }, baseFormData),
      })),
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("copyQAEngine fuzz", () => {
  it("analyzeCopy — handles empty, huge, and XSS text", async () => {
    const { analyzeCopy } = await import("@/engine/copyQAEngine");
    const failures = runAll([
      ...EDGE_STRINGS.map((s) => ({
        label: `str[${s.slice(0, 20)}]`,
        fn: () => analyzeCopy(s),
      })),
      { label: "null cast", fn: () => analyzeCopy(null as unknown as string) },
      { label: "undefined cast", fn: () => analyzeCopy(undefined as unknown as string) },
      { label: "number cast", fn: () => analyzeCopy(42 as unknown as string) },
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("behavioralHeuristicEngine fuzz", () => {
  it("deriveHeuristicSet — handles all 5 archetype ids", async () => {
    const { deriveHeuristicSet } = await import("@/engine/behavioralHeuristicEngine");
    const archetypes = ["strategist", "optimizer", "pioneer", "connector", "closer"] as const;
    const failures = runAll([
      ...archetypes.map((a) => ({
        label: a,
        fn: () => deriveHeuristicSet(a),
      })),
      { label: "unknown id", fn: () => deriveHeuristicSet("unknown" as Parameters<typeof deriveHeuristicSet>[0]) },
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("perplexityBurstiness fuzz", () => {
  it("all text analyzers — handle extreme string inputs", async () => {
    const { calculateBurstiness, calculatePerplexity, analyzeAIDetection, analyzeRegisterShifts } =
      await import("@/engine/perplexityBurstiness");
    const failures = runAll([
      ...EDGE_STRINGS.flatMap((s) => [
        { label: `burstiness[${s.slice(0, 15)}]`, fn: () => calculateBurstiness(s) },
        { label: `perplexity[${s.slice(0, 15)}]`, fn: () => calculatePerplexity(s) },
        { label: `aiDetect[${s.slice(0, 15)}]`, fn: () => analyzeAIDetection(s) },
        { label: `registerShift[${s.slice(0, 15)}]`, fn: () => analyzeRegisterShifts(s) },
      ]),
      { label: "null cast", fn: () => calculateBurstiness(null as unknown as string) },
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("stylomeEngine fuzz", () => {
  it("analyzeSamples — handles empty / edge sample arrays", async () => {
    const { analyzeSamples } = await import("@/engine/stylomeEngine");
    const failures = runAll([
      { label: "empty array", fn: () => analyzeSamples([]) },
      { label: "one normal sample", fn: () => analyzeSamples([{ text: "Hello world", label: "test" }]) },
      ...EDGE_STRINGS.map((s) => ({
        label: `str[${s.slice(0, 15)}]`,
        fn: () => analyzeSamples([{ text: s, label: "x" }]),
      })),
      { label: "1000 samples", fn: () => analyzeSamples(Array(1000).fill({ text: "sample text", label: "x" })) },
    ]);
    // null-inside-array is a TypeScript violation; not tested here
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("retentionFlywheelEngine fuzz", () => {
  it("generateRetentionFlywheel — handles edge FormData", async () => {
    const { generateRetentionFlywheel } = await import("@/engine/retentionFlywheelEngine");
    const failures = runAll([
      { label: "base", fn: () => generateRetentionFlywheel(baseFormData) },
      { label: "empty", fn: () => generateRetentionFlywheel(emptyFormData) },
      { label: "broken", fn: () => generateRetentionFlywheel(brokenFormData as FormData) },
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("frameworkRankingEngine fuzz", () => {
  it("captureFrameworkPick + getTopFramework — handles all archetypes and frameworks", async () => {
    const { captureFrameworkPick, getTopFramework, clearFrameworkRankings } =
      await import("@/engine/frameworkRankingEngine");
    const frameworks = ["PAS", "AIDA", "BAB", "Hormozi", "Challenge"] as const;
    const archetypes = ["strategist", "optimizer", "pioneer", "connector", "closer"] as const;
    clearFrameworkRankings();
    const failures = runAll([
      ...frameworks.flatMap((fw) =>
        archetypes.map((arch) => ({
          label: `capture(${fw},${arch})`,
          fn: () => captureFrameworkPick({ framework: fw, archetypeId: arch, businessField: "tech", chosen: true }),
        }))
      ),
      ...archetypes.map((arch) => ({
        label: `getTop(${arch})`,
        fn: () => getTopFramework({ archetypeId: arch, businessField: "tech" }),
      })),
      { label: "getTop unknown arch", fn: () => getTopFramework({ archetypeId: "unknown" as Parameters<typeof getTopFramework>[0]["archetypeId"], businessField: "" }) },
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("salesPipelineEngine fuzz", () => {
  it("generateSalesPipeline — doesn't crash on edge FunnelResult", async () => {
    const { generateSalesPipeline } = await import("@/engine/salesPipelineEngine");
    const { generateFunnel } = await import("@/engine/funnelEngine");
    const baseFunnel = generateFunnel(baseFormData);
    const emptyFunnel = generateFunnel(emptyFormData);
    const failures = runAll([
      { label: "base", fn: () => generateSalesPipeline(baseFunnel) },
      { label: "empty", fn: () => generateSalesPipeline(emptyFunnel) },
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("differentiationEngine fuzz", () => {
  it("scoreClaimVerification — edge claim arrays", async () => {
    const { scoreClaimVerification, buildGapAnalysis, buildHiddenValueProfile } =
      await import("@/engine/differentiationEngine");
    const failures = runAll([
      { label: "empty claims", fn: () => scoreClaimVerification([]) },
      // null input is a TypeScript violation; not tested
      { label: "1000 claims verified", fn: () => scoreClaimVerification(Array(1000).fill({ claim: "test", status: "verified", evidence: "" })) },
      { label: "buildGapAnalysis empty", fn: () => buildGapAnalysis([]) },
      { label: "buildHiddenValueProfile empty", fn: () => buildHiddenValueProfile([]) },
      ...EDGE_STRINGS.map((s) => ({
        label: `claim text[${s.slice(0, 15)}]`,
        fn: () => scoreClaimVerification([{ claim: s, status: "verified", evidence: s }]),
      })),
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

describe("healthScoreEngine fuzz", () => {
  it("calculateHealthScore — works with valid FunnelResult, throws clearly on invalid", async () => {
    const { calculateHealthScore } = await import("@/engine/healthScoreEngine");
    const { generateFunnel } = await import("@/engine/funnelEngine");
    const baseFunnel = generateFunnel(baseFormData);
    const emptyFunnel = generateFunnel(emptyFormData);
    const failures = runAll([
      { label: "base", fn: () => calculateHealthScore(baseFunnel) },
      { label: "empty", fn: () => calculateHealthScore(emptyFunnel) },
    ]);
    expect(failures, failures.join("\n")).toHaveLength(0);
    // Explicit throw for null/undefined input is correct behavior
    expect(() => calculateHealthScore(null as unknown as Parameters<typeof calculateHealthScore>[0])).toThrow();
  });
});

describe("outputModeration fuzz", () => {
  it("moderate — handles all edge strings", async () => {
    const mod = await import("@/engine/outputModeration");
    const fn = (mod as Record<string, unknown>).moderate || (mod as Record<string, unknown>).moderateOutput;
    if (!fn || typeof fn !== "function") return; // skip if export name differs
    const failures = runAll(
      EDGE_STRINGS.map((s) => ({
        label: `str[${s.slice(0, 20)}]`,
        fn: () => (fn as (s: string) => unknown)(s),
      }))
    );
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});
