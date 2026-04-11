// ═══════════════════════════════════════════════
// E6 — Adaptive Verifier
//
// Second-layer verifier that learns from the system's own failure
// history. Reads FailedCardSignature rows from the reflective_failures
// table (via blackboardClient — never Supabase directly) and scores
// each candidate ActionCard for its similarity to cards that previously
// failed their own falsifier test.
//
// Similarity is a weighted blend of:
//   - Jaccard overlap on engines_used (weight 0.5)
//   - exact match on falsifier_metric  (weight 0.3)
//   - exact match on regime_at_time    (weight 0.2)
//
// Similarity bands:
//   sim <= 0.6   → pass, no confidence penalty
//   0.6 < sim   → pass, but adjusted_confidence drops by 0.3
//   sim > 0.8   → BLOCK; the engine returns the E6 watch
//
// Activation threshold:
//   REFLECTIVE_ADAPTIVE_MIN_SAMPLES = 20.
//   When fewer failures are available, verifyHistorical returns a
//   pass-through result with similarity=0 and the fixed "need more
//   samples" reason. This prevents the adaptive layer from mis-firing
//   during the early use of the system when the data network effect
//   has not yet accumulated.
//
// The public API follows the spec: verifyHistorical is async and
// self-fetches failures. For the synchronous gate inside
// generateReflectiveAction, verifyHistoricalSync takes a pre-fetched
// failure list so that the engine stays sync and existing frontend
// callers (ResultsDashboard) do not need to change.
// ═══════════════════════════════════════════════

import type { ActionCard, ReflectiveContext } from "./reflectiveAction";

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export interface FailedCardSignature {
  ts: number;
  engines_used: string[];
  falsifier_metric: string;
  regime_at_time: string;
  score: number;
}

export interface AdaptiveVerificationResult {
  ok: boolean;
  similarity_to_failures: number;
  adjusted_confidence: number;
  reason: string;
}

// ───────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────

export const REFLECTIVE_ADAPTIVE_MIN_SAMPLES = 20;
export const CONFIDENCE_PENALTY_BAND = 0.6;
export const BLOCK_BAND = 0.8;
export const CONFIDENCE_PENALTY = 0.3;

const JACCARD_WEIGHT = 0.5;
const METRIC_WEIGHT = 0.3;
const REGIME_WEIGHT = 0.2;

const INSUFFICIENT_SAMPLES_RESULT: AdaptiveVerificationResult = {
  ok: true,
  similarity_to_failures: 0,
  adjusted_confidence: 0,
  reason: "נדרשות עוד דוגמאות היסטוריות להפעלת הלמידה",
};

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

/**
 * Jaccard similarity between two lists of engine ids. Treats the
 * inputs as sets: |intersection| / |union|, with 0 returned when
 * both sides are empty. Exported for direct unit testing.
 */
export function jaccard(a: string[], b: string[]): number {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  const setA = new Set(a.filter((x) => typeof x === "string" && x.length > 0));
  const setB = new Set(b.filter((x) => typeof x === "string" && x.length > 0));
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const x of setA) if (setB.has(x)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Build the engines_used signature for a given reflective context.
 * This is the same tag used when we later record a failure, so the
 * comparison is apples to apples.
 */
export function deriveEnginesUsed(ctx: ReflectiveContext): string[] {
  const out: string[] = ["M4"]; // reflectiveAction is always involved
  if (ctx.regime !== undefined) out.push("M1");
  if (ctx.anomaly !== undefined) out.push("M2");
  if (ctx.forecast !== undefined) out.push("M3");
  if (ctx.profile !== undefined) out.push("M5");
  if (ctx.stage_spectrum !== undefined) out.push("M7");
  if (ctx.anomaly_classification !== undefined) out.push("E5");
  return out;
}

/**
 * Weighted-average similarity between a candidate and a list of past
 * failures. Exported for direct unit testing.
 */
export function computeSimilarity(
  candidate_engines: string[],
  candidate_falsifier_metric: string,
  candidate_regime: string,
  failures: FailedCardSignature[],
): number {
  if (!Array.isArray(failures) || failures.length === 0) return 0;
  let total = 0;
  for (const f of failures) {
    if (!f) continue;
    const jac = jaccard(candidate_engines, f.engines_used ?? []);
    const metricMatch = f.falsifier_metric === candidate_falsifier_metric ? 1 : 0;
    const regimeMatch = f.regime_at_time === candidate_regime ? 1 : 0;
    total += JACCARD_WEIGHT * jac + METRIC_WEIGHT * metricMatch + REGIME_WEIGHT * regimeMatch;
  }
  return total / failures.length;
}

// ───────────────────────────────────────────────
// Public API — synchronous gate
// ───────────────────────────────────────────────

/**
 * Synchronous variant used by generateReflectiveAction. Takes the
 * pre-fetched failure list as an argument so the engine stays sync
 * and existing frontend callers do not need to change their contract.
 *
 * Callers that want the async self-fetching version should use
 * verifyHistorical() below.
 */
export function verifyHistoricalSync(
  candidate: ActionCard,
  ctx: ReflectiveContext,
  failures: FailedCardSignature[],
): AdaptiveVerificationResult {
  if (!Array.isArray(failures) || failures.length < REFLECTIVE_ADAPTIVE_MIN_SAMPLES) {
    return { ...INSUFFICIENT_SAMPLES_RESULT };
  }

  const engines = deriveEnginesUsed(ctx);
  const regime = ctx.regime?.state ?? "unknown";
  const sim = computeSimilarity(
    engines,
    candidate.falsifier_metric,
    regime,
    failures,
  );

  if (sim > BLOCK_BAND) {
    return {
      ok: false,
      similarity_to_failures: sim,
      adjusted_confidence: Math.max(0, candidate.coherence_score - CONFIDENCE_PENALTY),
      reason: "דמיון גבוה להמלצות שנכשלו בעבר",
    };
  }

  if (sim > CONFIDENCE_PENALTY_BAND) {
    return {
      ok: true,
      similarity_to_failures: sim,
      adjusted_confidence: Math.max(0, candidate.coherence_score - CONFIDENCE_PENALTY),
      reason: "דמיון בינוני להמלצות שנכשלו בעבר",
    };
  }

  return {
    ok: true,
    similarity_to_failures: sim,
    adjusted_confidence: 0,
    reason: "אין דמיון משמעותי להיסטוריה",
  };
}

// ───────────────────────────────────────────────
// Public API — async self-fetching variant + recordFailure
// ───────────────────────────────────────────────

/**
 * Async self-fetching verifier. Delegates the DB read to
 * blackboardClient.readFailures (never touches Supabase directly)
 * and runs the sync verifier on the result.
 */
export async function verifyHistorical(
  candidate: ActionCard,
  ctx: ReflectiveContext,
): Promise<AdaptiveVerificationResult> {
  const { readFailures } = await import("./blackboardClient");
  const failures = await readFailures();
  return verifyHistoricalSync(candidate, ctx, failures);
}

/**
 * Thin delegate to blackboardClient.recordFailure. Exists so that
 * the scheduled task (or any other caller) can record a failure
 * without importing the blackboard client directly — keeping the
 * spec rule that adaptiveVerifier never touches Supabase.
 *
 * Not covered by unit tests in this prompt — the scheduled task
 * that drives it is out of scope. See section 3.E6 "recordFailure"
 * in the MOAT prompt for the full workflow.
 */
export async function recordFailure(
  card_id: string,
  observed_value: number,
): Promise<void> {
  const { recordFailure: delegate } = await import("./blackboardClient");
  await delegate(card_id, observed_value);
}
