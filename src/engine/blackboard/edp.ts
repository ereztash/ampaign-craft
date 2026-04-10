// ═══════════════════════════════════════════════
// EDP Collapse Detector — Existential Dynamics Principle
//
// Pure-function observer that classifies the blackboard's health
// from two derived signals:
//
//   V(t) = ‖dX/dt‖   — information arrival rate, computed from
//                      the delta between consecutive event timestamps
//                      (events per millisecond, normalized).
//   C(X(t))          — structural complexity, computed as the Shannon
//                      entropy over the distribution of active
//                      concept-key prefixes.
//
// detectCollapse(v, c, ε, κ) maps the (v, c) pair into one of four
// states with the thresholds ε (for V) and κ (for C).
//
// Constraints (by spec):
//   - No I/O, no state, no side effects.
//   - No imports from any existing blackboard module. Standalone.
// ═══════════════════════════════════════════════

export type CollapseState = "healthy" | "v_collapse" | "c_decoherence" | "both";

const DEFAULT_EPSILON = 0.05;
const DEFAULT_KAPPA = 0.3;

/**
 * Information arrival rate V(t).
 *
 * Given a time-ordered stream of events, computes the mean delta
 * between consecutive timestamps and returns its reciprocal in
 * events-per-millisecond. An empty or single-event stream produces
 * 0 (no motion). Out-of-order inputs are tolerated by sorting.
 */
export function computeV(
  events: ReadonlyArray<{ ts: number; conceptKey: string }>,
): number {
  if (events.length < 2) return 0;

  // Sort defensively without mutating the caller's input.
  const sorted = [...events].sort((a, b) => a.ts - b.ts);

  let totalDelta = 0;
  let pairs = 0;
  for (let i = 1; i < sorted.length; i++) {
    const delta = sorted[i].ts - sorted[i - 1].ts;
    if (delta > 0) {
      totalDelta += delta;
      pairs++;
    }
  }

  if (pairs === 0) return 0;

  const meanDeltaMs = totalDelta / pairs;
  // Events per ms. Clamp upwards to avoid infinities from sub-millisecond
  // clocks while keeping the scale monotonic in the actual arrival rate.
  if (meanDeltaMs <= 0) return 1;
  return 1 / meanDeltaMs;
}

/**
 * Structural complexity C(X(t)) as Shannon entropy (bits) over
 * concept-key prefixes.
 *
 * A concept key is expected to follow the convention
 *   `<SCOPE>-<type>-<id>`
 * so we collapse each key to its `<SCOPE>-<type>` prefix before
 * counting. Empty inputs produce 0 (no complexity).
 */
export function computeC(
  events: ReadonlyArray<{ conceptKey: string }>,
): number {
  if (events.length === 0) return 0;

  const counts = new Map<string, number>();
  for (const event of events) {
    const key = prefixOf(event.conceptKey);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const total = events.length;
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}

/**
 * Maps (V, C) into a CollapseState.
 *
 *   healthy         → V ≥ ε AND C ≥ κ
 *   v_collapse      → V <  ε AND C ≥ κ
 *   c_decoherence   → V ≥ ε AND C <  κ
 *   both            → V <  ε AND C <  κ
 */
export function detectCollapse(
  v: number,
  c: number,
  epsilon: number = DEFAULT_EPSILON,
  kappa: number = DEFAULT_KAPPA,
): CollapseState {
  const vLow = v < epsilon;
  const cLow = c < kappa;
  if (vLow && cLow) return "both";
  if (vLow) return "v_collapse";
  if (cLow) return "c_decoherence";
  return "healthy";
}

/**
 * Exported default thresholds so callers can read them rather than
 * re-inventing literals.
 */
export const EDP_DEFAULTS = {
  epsilon: DEFAULT_EPSILON,
  kappa: DEFAULT_KAPPA,
} as const;

// ───────────────────────────────────────────────
// Internals
// ───────────────────────────────────────────────

function prefixOf(conceptKey: string): string {
  // Keep the first two dash-separated segments: "SCOPE-type".
  // If the key has fewer than two dashes, use whatever is there.
  const segments = conceptKey.split("-");
  if (segments.length >= 2) {
    return `${segments[0]}-${segments[1]}`;
  }
  return conceptKey;
}
