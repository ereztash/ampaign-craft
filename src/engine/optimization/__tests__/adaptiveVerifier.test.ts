// ═══════════════════════════════════════════════
// E6 — Adaptive Verifier tests
//
// 1. Fewer than REFLECTIVE_ADAPTIVE_MIN_SAMPLES failures → pass-
//    through with the fixed "need more samples" reason.
// 2. 25 failures, all dissimilar to the candidate → pass, no penalty.
// 3. 25 failures landing in the penalty band (0.6 < sim <= 0.8) →
//    pass but adjusted_confidence is reduced.
// 4. 25 failures in the block band (sim > 0.8) → ok=false, the
//    engine emits the E6 historical-match watch.
// 5. Jaccard math: direct unit test on the exported helper.
// 6. Snapshot of the verifyHistoricalSync output shape for a known
//    failure set.
// 7. Sanity: with no ctx.adaptive_failures attached, the engine's
//    gate is a no-op and the card flows through unchanged.
// ═══════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  jaccard,
  computeSimilarity,
  deriveEnginesUsed,
  verifyHistoricalSync,
  REFLECTIVE_ADAPTIVE_MIN_SAMPLES,
  type FailedCardSignature,
  type AdaptiveVerificationResult,
} from "../adaptiveVerifier";
import {
  generateReflectiveAction,
  type ActionCard,
  type ReflectiveContext,
} from "../reflectiveAction";
import type { FunnelResult } from "@/types/funnel";
import type { KpiGap } from "@/types/meta";
import type { RegimeOutput } from "../regimeDetector";
import type { AnomalyOutput } from "../biomimeticAnomaly";
import type { ForecastOutput } from "../extremeForecaster";

// ───────────────────────────────────────────────
// Fixtures
// ───────────────────────────────────────────────

const funnelStub = {
  id: "test",
  funnelName: { he: "", en: "" },
  stages: [],
  totalBudget: { min: 0, max: 0 },
  overallTips: [],
  hookTips: [],
  copyLab: {},
  kpis: [],
  createdAt: "",
  formData: {},
} as unknown as FunnelResult;

const cplCriticalGap: KpiGap = {
  kpiName: { he: "cpl", en: "cpl" },
  targetMin: 25,
  targetMax: 60,
  unit: "₪",
  actual: 90,
  gapPercent: 50,
  status: "critical",
};

const transitionalRegime: RegimeOutput = {
  state: "transitional",
  confidence: 0.7,
  reason: "מגמת שינוי",
  since: 0,
};

const calmAnomaly: AnomalyOutput = {
  score: 0.1,
  isAnomaly: false,
  layers: { threshold: 0, predictive: 0, novelty: 0 },
  explain: "",
};

const clearForecast: ForecastOutput = {
  collapse_probability: 0.1,
  horizon_days: 3,
  signal: "clear",
  drivers: [],
};

// Baseline ctx that normally passes every prior gate and lands as
// an act card with a cpl falsifier.
function baselineCtx(): ReflectiveContext {
  return {
    funnel: funnelStub,
    gaps: [cplCriticalGap],
    regime: transitionalRegime,
    anomaly: calmAnomaly,
    forecast: clearForecast,
  };
}

// A synthetic ActionCard used for direct unit tests on the verifier.
function syntheticCard(
  coherence = 0.8,
  metric: ActionCard["falsifier_metric"] = "cpl",
): ActionCard {
  return {
    signal: "act",
    headline: "צוואר בקבוק",
    why: "שלב בפאנל מייצר חיכוך שמעכב מעבר הלאה",
    next_step: "צמצם את היקף הקהל הרחב",
    eta_minutes: 15,
    coherence_score: coherence,
    falsification_window_days: 14,
    falsifier_metric: metric,
    falsifier_threshold: 25,
    falsifier_direction: "below",
  };
}

// Generate `count` failures with a common shape. Each failure uses
// the same engines / metric / regime so the similarity to a matching
// candidate is very high.
function similarFailures(count: number): FailedCardSignature[] {
  const out: FailedCardSignature[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      ts: 1_000_000 + i,
      engines_used: ["M4", "M1", "M2", "M3"],
      falsifier_metric: "cpl",
      regime_at_time: "transitional",
      score: 0.8,
    });
  }
  return out;
}

// Failures that share nothing with the candidate — different engines,
// different metric, different regime.
function dissimilarFailures(count: number): FailedCardSignature[] {
  const out: FailedCardSignature[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      ts: 2_000_000 + i,
      engines_used: ["X", "Y", "Z"],
      falsifier_metric: "ctr",
      regime_at_time: "crisis",
      score: 0.5,
    });
  }
  return out;
}

// Failures that land in the penalty band (0.6 < sim <= 0.8). Metric
// and regime match, and engines overlap by one element out of four
// on each side — Jaccard ~ 1/7 ≈ 0.14. Combined: 0.5*0.14 + 0.3 + 0.2 ≈ 0.57.
// That's just BELOW the penalty band, so the combined similarity is
// controlled by bumping the engine overlap. Using ['M4','M1','Q','R']
// against candidate ['M4','M1','M2','M3'] gives Jaccard = 2/6 ≈ 0.33,
// combined ≈ 0.5*0.33 + 0.3 + 0.2 = 0.665 — squarely in the penalty band.
function penaltyBandFailures(count: number): FailedCardSignature[] {
  const out: FailedCardSignature[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      ts: 3_000_000 + i,
      engines_used: ["M4", "M1", "Q", "R"],
      falsifier_metric: "cpl",
      regime_at_time: "transitional",
      score: 0.75,
    });
  }
  return out;
}

// ───────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────

describe("E6 — Adaptive Verifier", () => {
  it("1. fewer than the minimum sample count → pass-through without blocking", () => {
    const card = syntheticCard();
    const ctx = baselineCtx();
    const failures = similarFailures(REFLECTIVE_ADAPTIVE_MIN_SAMPLES - 1);
    const out = verifyHistoricalSync(card, ctx, failures);

    expect(out.ok).toBe(true);
    expect(out.similarity_to_failures).toBe(0);
    expect(out.adjusted_confidence).toBe(0);
    expect(out.reason).toContain("דוגמאות");
  });

  it("2. 25 dissimilar failures → pass, no penalty", () => {
    const card = syntheticCard();
    const ctx = baselineCtx();
    const failures = dissimilarFailures(25);
    const out = verifyHistoricalSync(card, ctx, failures);

    expect(out.ok).toBe(true);
    expect(out.similarity_to_failures).toBeLessThanOrEqual(0.6);
    expect(out.adjusted_confidence).toBe(0);
  });

  it("3. 25 failures in the penalty band → ok=true but adjusted_confidence drops", () => {
    const card = syntheticCard(0.9);
    const ctx = baselineCtx();
    const failures = penaltyBandFailures(25);
    const out = verifyHistoricalSync(card, ctx, failures);

    expect(out.ok).toBe(true);
    expect(out.similarity_to_failures).toBeGreaterThan(0.6);
    expect(out.similarity_to_failures).toBeLessThanOrEqual(0.8);
    // Penalty shrinks coherence by exactly 0.3 (clamped at 0).
    expect(out.adjusted_confidence).toBeCloseTo(0.6, 5);
  });

  it("4. 25 highly-similar failures → ok=false, engine emits E6 watch", () => {
    const card = syntheticCard();
    const ctx = baselineCtx();
    const failures = similarFailures(25);
    const out = verifyHistoricalSync(card, ctx, failures);

    expect(out.ok).toBe(false);
    expect(out.similarity_to_failures).toBeGreaterThan(0.8);

    // Integration: the engine reaches E6 after all prior gates and
    // emits the historical-match watch with its dedicated why text.
    const engineCtx: ReflectiveContext = {
      ...baselineCtx(),
      adaptive_failures: failures,
    };
    const engineCard = generateReflectiveAction(engineCtx);
    expect(engineCard.signal).toBe("watch");
    expect(engineCard.headline).toBe("שיהוי החלטות");
    expect(engineCard.why).toContain("דמיון גבוה");
    expect(engineCard.why).toContain("נכשלו");
    // Distinguish from E1/E2/E3/E4/E5 texts.
    expect(engineCard.why).not.toContain("ניתנת להפרכה");
    expect(engineCard.why).not.toContain("עמידה לתרגום");
    expect(engineCard.why).not.toContain("ישן");
    expect(engineCard.why).not.toContain("צוואר הבקבוק");
    expect(engineCard.why).not.toContain("משטר חדש");
    // Inert falsifier on the block path.
    expect(engineCard.falsifier_metric).toBe("none");
  });

  it("5. Jaccard math on engines_used sets", () => {
    // Equal sets → 1.
    expect(jaccard(["M1", "M2"], ["M1", "M2"])).toBeCloseTo(1, 5);
    // Disjoint sets → 0.
    expect(jaccard(["M1"], ["M2"])).toBeCloseTo(0, 5);
    // 2 of 3 overlap, union size 4 → 2/4 = 0.5.
    expect(jaccard(["M1", "M2", "M3"], ["M1", "M2", "M4"])).toBeCloseTo(0.5, 5);
    // Duplicates don't double-count.
    expect(jaccard(["M1", "M1"], ["M1"])).toBeCloseTo(1, 5);
    // Both empty → 0 by convention.
    expect(jaccard([], [])).toBe(0);
  });

  it("6. snapshot of verifyHistoricalSync output for a known failure set", () => {
    const card = syntheticCard(0.85);
    const ctx = baselineCtx();
    const failures = similarFailures(25);
    const out = verifyHistoricalSync(card, ctx, failures);

    // Structural snapshot on the result shape. similarity is a
    // weighted average so it's stable across runs given fixed inputs.
    const snapshot: AdaptiveVerificationResult = {
      ok: out.ok,
      similarity_to_failures: Math.round(out.similarity_to_failures * 1000) / 1000,
      adjusted_confidence: Math.round(out.adjusted_confidence * 1000) / 1000,
      reason: out.reason,
    };
    expect(snapshot).toEqual({
      ok: false,
      similarity_to_failures: 1,
      adjusted_confidence: 0.55,
      reason: "דמיון גבוה להמלצות שנכשלו בעבר",
    });
  });

  it("7. no adaptive_failures on ctx → gate is a no-op, card flows through", () => {
    const ctx = baselineCtx();
    // No adaptive_failures attached.
    const card = generateReflectiveAction(ctx);
    expect(card.signal).toBe("act");
    expect(card.falsifier_metric).not.toBe("none");
    expect(card.why).not.toContain("דמיון");
    expect(card.why).not.toContain("נכשלו");
  });

  it("8. computeSimilarity bounds and engine derivation", () => {
    // Engines derived from a baseline ctx must include M4 plus the
    // three optional diagnostics the baseline provides.
    const engines = deriveEnginesUsed(baselineCtx());
    expect(engines).toContain("M4");
    expect(engines).toContain("M1");
    expect(engines).toContain("M2");
    expect(engines).toContain("M3");

    // Similarity is 0 when the failure list is empty.
    expect(computeSimilarity(engines, "cpl", "transitional", [])).toBe(0);

    // Similarity is 1 when every failure matches on all three axes.
    const allMatch: FailedCardSignature[] = [
      {
        ts: 1,
        engines_used: engines,
        falsifier_metric: "cpl",
        regime_at_time: "transitional",
        score: 0.8,
      },
    ];
    expect(
      computeSimilarity(engines, "cpl", "transitional", allMatch),
    ).toBeCloseTo(1, 5);
  });
});
