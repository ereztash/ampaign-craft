// ═══════════════════════════════════════════════
// GoalROI Readiness Scorer
//
// Pure function that weighs four bounded signals (efficiency,
// speed, accuracy, understanding) into a single readiness score
// in [0, 1] and flips a stop flag when the score clears a
// configurable threshold.
//
// The weights sum to 1.0 and are `as const` so misuses are caught
// at compile time. At runtime, any override is validated: the
// weights MUST sum to 1.0 ± 0.001 — otherwise a descriptive error
// is thrown.
//
// Constraints (by spec):
//   - Pure, no I/O, no state.
//   - No imports from any existing blackboard module. Standalone.
// ═══════════════════════════════════════════════

export interface ReadinessInput {
  efficiency: number;     // 0..1
  speed: number;          // 0..1
  accuracy: number;       // 0..1
  understanding: number;  // 0..1
}

export interface ReadinessResult {
  score: number;          // 0..1
  shouldStop: boolean;    // score >= threshold
  breakdown: Record<keyof ReadinessInput, number>;
}

export type ReadinessWeights = {
  readonly [K in keyof ReadinessInput]: number;
};

export const DEFAULT_WEIGHTS = {
  efficiency: 0.25,
  speed: 0.2,
  accuracy: 0.25,
  understanding: 0.3,
} as const;

export const DEFAULT_THRESHOLD = 0.75;

const WEIGHT_SUM_TOLERANCE = 0.001;

/**
 * Compute the readiness score for a single evaluation.
 *
 * Each signal is clamped to [0, 1] before weighting so a caller
 * passing a slightly out-of-range value from a noisy source does
 * not corrupt the output. The breakdown mirrors the weighted
 * contribution of each signal so callers can render a per-signal
 * view without re-computing anything.
 */
export function computeReadiness(
  input: ReadinessInput,
  weights: ReadinessWeights = DEFAULT_WEIGHTS,
  threshold: number = DEFAULT_THRESHOLD,
): ReadinessResult {
  assertWeightsSumToOne(weights);

  const clamped: ReadinessInput = {
    efficiency: clamp01(input.efficiency),
    speed: clamp01(input.speed),
    accuracy: clamp01(input.accuracy),
    understanding: clamp01(input.understanding),
  };

  const breakdown: Record<keyof ReadinessInput, number> = {
    efficiency: clamped.efficiency * weights.efficiency,
    speed: clamped.speed * weights.speed,
    accuracy: clamped.accuracy * weights.accuracy,
    understanding: clamped.understanding * weights.understanding,
  };

  const score =
    breakdown.efficiency +
    breakdown.speed +
    breakdown.accuracy +
    breakdown.understanding;

  return {
    score,
    shouldStop: score >= threshold,
    breakdown,
  };
}

// ───────────────────────────────────────────────
// Internals
// ───────────────────────────────────────────────

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function assertWeightsSumToOne(weights: ReadinessWeights): void {
  const sum =
    weights.efficiency +
    weights.speed +
    weights.accuracy +
    weights.understanding;
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    throw new Error(
      `goalROI: readiness weights must sum to 1.0 ± ${WEIGHT_SUM_TOLERANCE} ` +
        `(got efficiency=${weights.efficiency}, speed=${weights.speed}, ` +
        `accuracy=${weights.accuracy}, understanding=${weights.understanding}, ` +
        `sum=${sum.toFixed(4)})`,
    );
  }
}
