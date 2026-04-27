// ═══════════════════════════════════════════════
// Behavioral Consistency Manifest
//
// Declares every behavioral claim that the README/CHOICES make about
// the system's runtime logic. Each claim binds a documentation quote to:
//   1. A specific implementation file + symbol (the SOT in code)
//   2. One or more numeric thresholds — expressed as RegExp patterns
//      that MUST appear in the implementation file.
//   3. A testability classification:
//       static-only  — edge functions / Deno runtime; not Vitest-testable
//       static+test  — pure TS function; both static check AND coverage required
//       test-only    — threshold is a tier/enum string, no numeric literal needed
//
// Usage:
//   scripts/consistency/audit-behavioral.ts    — checks literals exist in code
//   scripts/consistency/audit-behavioral-coverage.ts — checks tests lock thresholds
// ═══════════════════════════════════════════════

export interface BehavioralThreshold {
  /** Short identifier for this threshold (used in violation messages). */
  name: string;
  /** Human-readable value for reports. */
  value: number | string;
  /** At least one pattern must match somewhere in the implementation file. */
  acceptedLiterals: RegExp[];
}

export interface BehavioralClaim {
  id: string;
  description: string;
  source: { file: string; quote: string };
  implementation: { file: string; symbol: string };
  thresholds: BehavioralThreshold[];
  testability: "static-only" | "static+test" | "test-only";
}

export const BEHAVIORAL_CLAIMS: BehavioralClaim[] = [
  // ── Loop 1: Pricing Validation ─────────────────────────────────────────
  {
    id: "pricing-miss-threshold",
    description: "Pricing miss >20% triggers a negative training pair",
    source: {
      file: "README.md",
      quote: "If miss > 20% → negative training pair → prompt patch",
    },
    implementation: {
      file: "src/engine/outcomeLoopEngine.ts",
      symbol: "capturePricingOutcome",
    },
    thresholds: [
      {
        name: "miss_ratio",
        value: 0.20,
        acceptedLiterals: [/\b0\.20?\b/, /\b0\.20\b/],
      },
    ],
    testability: "static+test",
  },
  {
    id: "pricing-horizon-days",
    description: "Pricing outcome is evaluated on a 30-day horizon",
    source: {
      file: "README.md",
      quote: "Recommended price vs actual user revenue (30d horizon)",
    },
    implementation: {
      file: "src/engine/outcomeLoopEngine.ts",
      symbol: "capturePricingOutcome",
    },
    thresholds: [
      {
        name: "horizon_days",
        value: 30,
        acceptedLiterals: [/horizon_days:\s*30\b/, /OutcomeHorizon\b[\s\S]{0,200}30/],
      },
    ],
    testability: "static+test",
  },

  // ── Loop 2: Archetype Behavioral Correction ────────────────────────────
  {
    id: "archetype-pick-min",
    description: "At least 10 variant picks required before behavioral correction fires",
    source: {
      file: "README.md",
      quote: "After 10+ picks, divergence ≥ 25% → lower confidence tier",
    },
    implementation: {
      file: "src/contexts/ArchetypeContext.tsx",
      symbol: "recordVariantPick",
    },
    thresholds: [
      {
        name: "min_picks",
        value: 10,
        acceptedLiterals: [/VARIANT_PICK_THRESHOLD\s*=\s*10/],
      },
    ],
    testability: "static+test",
  },
  {
    id: "archetype-divergence-threshold",
    description: "Divergence ≥25% from expected primary rate lowers confidence tier",
    source: {
      file: "README.md",
      quote: "After 10+ picks, divergence ≥ 25% → lower confidence tier",
    },
    implementation: {
      file: "src/contexts/ArchetypeContext.tsx",
      symbol: "recordVariantPick",
    },
    thresholds: [
      {
        name: "divergence_ratio",
        value: 0.25,
        acceptedLiterals: [/DIVERGENCE_THRESHOLD\s*=\s*0\.25/],
      },
    ],
    testability: "static+test",
  },

  // ── Loop 3: Framework Effectiveness Ranking ────────────────────────────
  {
    id: "framework-min-picks",
    description: "At least 5 picks required before best framework becomes default",
    source: {
      file: "README.md",
      quote: "After 5+ picks, best-scoring framework becomes default",
    },
    implementation: {
      file: "src/engine/frameworkRankingEngine.ts",
      symbol: "getTopFramework",
    },
    thresholds: [
      {
        name: "min_picks",
        value: 5,
        acceptedLiterals: [/totalPicks\s*<\s*5/, /if\s*\(.*<\s*5\)/],
      },
    ],
    testability: "static+test",
  },

  // ── Loop 4: Churn Prediction Self-Calibration ──────────────────────────
  {
    id: "churn-blend-min-n",
    description: "N≥10 observations required before blending starts",
    source: {
      file: "README.md",
      quote: "Weighted blend at N ≥ 10, full weight at N ≥ 50",
    },
    implementation: {
      file: "src/engine/churnPredictionEngine.ts",
      symbol: "applyCalibrationUpdate",
    },
    thresholds: [
      {
        name: "blend_start_n",
        value: 10,
        acceptedLiterals: [/CALIBRATION_BLEND_START\s*=\s*10/],
      },
    ],
    testability: "static+test",
  },
  {
    id: "churn-full-weight-n",
    description: "N≥50 observations gives full weight to observed data",
    source: {
      file: "README.md",
      quote: "Weighted blend at N ≥ 10, full weight at N ≥ 50",
    },
    implementation: {
      file: "src/engine/churnPredictionEngine.ts",
      symbol: "applyCalibrationUpdate",
    },
    thresholds: [
      {
        name: "blend_full_n",
        value: 50,
        acceptedLiterals: [/CALIBRATION_BLEND_FULL\s*=\s*50/],
      },
    ],
    testability: "static+test",
  },

  // ── Loop 5: Internal Benchmark Replacement ─────────────────────────────
  {
    id: "benchmark-quantiles",
    description: "Nightly refresh computes p25/p50/p75 for each archetype-field cohort",
    source: {
      file: "README.md",
      quote: "Nightly Edge Fn computes p25/p50/p75 → replaces hardcoded numbers",
    },
    implementation: {
      file: "supabase/functions/nightly-benchmark-refresh/index.ts",
      symbol: "computePercentiles",
    },
    thresholds: [
      {
        name: "p25",
        value: 0.25,
        acceptedLiterals: [/percentile\s*\([^)]*0\.25\)/, /p25:\s*percentile/],
      },
      {
        name: "p50",
        value: 0.50,
        acceptedLiterals: [/percentile\s*\([^)]*0\.5\b/, /p50:\s*percentile/],
      },
      {
        name: "p75",
        value: 0.75,
        acceptedLiterals: [/percentile\s*\([^)]*0\.75\)/, /p75:\s*percentile/],
      },
    ],
    testability: "static-only",
  },

  // ── Loop 6: Prompt Patch TTL ────────────────────────────────────────────
  {
    id: "prompt-patch-improvement",
    description: "Patches with <10% improvement after 7 days are expired",
    source: {
      file: "README.md",
      quote: "If improvement < 10% → expire patch",
    },
    implementation: {
      file: "src/engine/promptOptimizerLoop.ts",
      symbol: "checkAndExpirePatches",
    },
    thresholds: [
      {
        name: "min_improvement_ratio",
        value: 0.10,
        acceptedLiterals: [/MIN_IMPROVEMENT_RATIO\s*=\s*0\.10?/, /improvement\s*<\s*MIN_IMPROVEMENT_RATIO/],
      },
    ],
    testability: "static+test",
  },
  {
    id: "prompt-patch-ttl-days",
    description: "Patch effectiveness is evaluated after 7 days",
    source: {
      file: "README.md",
      quote: "Negative training pair count before vs 7 days after patch",
    },
    implementation: {
      file: "src/engine/promptOptimizerLoop.ts",
      symbol: "checkAndExpirePatches",
    },
    thresholds: [
      {
        name: "effectiveness_ttl_days",
        value: 7,
        acceptedLiterals: [/PATCH_EFFECTIVENESS_TTL_MS\s*=\s*7\s*\*/],
      },
    ],
    testability: "static+test",
  },

  // ── Infra: LLM Tier Gates ───────────────────────────────────────────────
  {
    id: "llm-tier-gates",
    description: "Free→Haiku, Pro→max Sonnet, Business→all models (tier-gated)",
    source: {
      file: "README.md",
      quote: "Cost caps · fallback chains · tier-gated by subscription",
    },
    implementation: {
      file: "src/services/llmRouter.ts",
      symbol: "getMaxTierForPricingTier",
    },
    thresholds: [
      {
        name: "free_max_tier",
        value: "fast",
        acceptedLiterals: [/free:\s*"fast"/, /free.*Haiku only/],
      },
      {
        name: "pro_max_tier",
        value: "standard",
        acceptedLiterals: [/pro:\s*"standard"/],
      },
      {
        name: "business_max_tier",
        value: "deep",
        acceptedLiterals: [/business:\s*"deep"/],
      },
    ],
    testability: "test-only",
  },
];
