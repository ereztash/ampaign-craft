// ═══════════════════════════════════════════════
// E5 — Anomaly Type Classifier (post-processor on M2)
//
// Takes an AnomalyOutput (produced by biomimeticAnomaly.ts) together
// with the raw time series that fed it, and classifies the anomaly
// into one of three types:
//
//   noise         — only one scoring layer is above the HIGH cutoff
//                   (or the history is too short to say anything
//                   confident). The system should keep watching.
//
//   pathological  — all three layers are above HIGH and the last-5d
//                   volatility exceeds the prior-14d volatility. The
//                   chaos is escalating and the standard act path
//                   applies.
//
//   emergent      — threshold and novelty are above HIGH but the
//                   predictive layer is LOW. The system is already
//                   internally coherent with the new data: a new
//                   regime is beginning to form. We must MEASURE
//                   before acting.
//
// Pure, synchronous, zero I/O. Does NOT mutate or re-read
// biomimeticAnomaly.ts. The file is a strict downstream consumer.
//
// Principle: "normalization of deviation" inverted. An anomaly that
// stabilizes into a new structure is not a deviation to reset to
// normal — it is the next normal. The engine must measure it before
// trying to close it.
// ═══════════════════════════════════════════════

import type { AnomalyOutput } from "./biomimeticAnomaly";

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export type AnomalyType = "noise" | "pathological" | "emergent";

export interface AnomalyClassification {
  type: AnomalyType;
  confidence: number; // 0..1
  reason: string; // Hebrew, single sentence
  feeds_regime_hint: boolean; // true only when type === 'emergent'
}

// ───────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────

const HIGH_LAYER = 0.6;
const LOW_LAYER = 0.4;
const MIN_HISTORY_POINTS = 10;
const RECENT_WINDOW = 5;
const PRIOR_WINDOW = 14;

// ───────────────────────────────────────────────
// Math helpers (inlined — no cross-file dependency)
// ───────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  let acc = 0;
  for (const v of values) acc += (v - m) * (v - m);
  return Math.sqrt(acc / values.length);
}

function cleanValues(
  history: Array<{ ts: number; value: number }>,
): number[] {
  if (!Array.isArray(history)) return [];
  const out: number[] = [];
  for (const p of history) {
    if (!p) continue;
    if (typeof p.value === "number" && Number.isFinite(p.value)) {
      out.push(p.value);
    }
  }
  return out;
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

/**
 * Classify an anomaly signal produced by biomimeticAnomaly into one
 * of three types: noise, pathological, emergent.
 *
 * Short-history guard: when the cleaned history has fewer than 10
 * valid points, the classifier cannot reliably distinguish chaos
 * from stability. It returns noise with low confidence and a fixed
 * "history too short" reason.
 *
 * Volatility guard: the pathological classification requires both
 * the last-5 and prior-14 windows to exist, otherwise the "chaos
 * escalating" test cannot be run and the classifier falls back
 * to noise.
 */
export function classifyAnomaly(
  anomaly: AnomalyOutput,
  history: Array<{ ts: number; value: number }>,
): AnomalyClassification {
  const values = cleanValues(history);

  if (values.length < MIN_HISTORY_POINTS) {
    return {
      type: "noise",
      confidence: 0.2,
      reason: "היסטוריה קצרה מדי לסיווג",
      feeds_regime_hint: false,
    };
  }

  const layers = anomaly.layers;
  const thresholdHigh = layers.threshold >= HIGH_LAYER;
  const predictiveHigh = layers.predictive >= HIGH_LAYER;
  const noveltyHigh = layers.novelty >= HIGH_LAYER;
  const highCount =
    (thresholdHigh ? 1 : 0) +
    (predictiveHigh ? 1 : 0) +
    (noveltyHigh ? 1 : 0);

  // Emergent: threshold + novelty high, predictive low. The system
  // has already aligned itself with the new data — a new regime
  // is forming under us.
  if (thresholdHigh && noveltyHigh && layers.predictive < LOW_LAYER) {
    return {
      type: "emergent",
      confidence: 0.75,
      reason: "שכבות סף וחידוש גבוהות עם עקביות פנימית",
      feeds_regime_hint: true,
    };
  }

  // Pathological: all three layers high AND volatility is escalating.
  if (highCount >= 3) {
    const lastN = values.slice(-RECENT_WINDOW);
    const priorWindowEnd = values.length - RECENT_WINDOW;
    const priorWindowStart = Math.max(0, priorWindowEnd - PRIOR_WINDOW);
    const prior = values.slice(priorWindowStart, priorWindowEnd);

    if (lastN.length >= 2 && prior.length >= 2) {
      const vRecent = stddev(lastN);
      const vPrior = stddev(prior);
      if (vRecent > vPrior) {
        return {
          type: "pathological",
          confidence: 0.9,
          reason: "שלוש שכבות גבוהות וכאוס מתגבר",
          feeds_regime_hint: false,
        };
      }
    }
    // Three layers high but volatility NOT escalating — we cannot
    // confirm pathology, so we classify as noise with medium confidence.
    return {
      type: "noise",
      confidence: 0.5,
      reason: "שלוש שכבות גבוהות ללא הסלמה בתנודתיות",
      feeds_regime_hint: false,
    };
  }

  // Default: any other combination is noise — at most one or two
  // layers crossed the cutoff, not enough structural evidence.
  return {
    type: "noise",
    confidence: highCount === 1 ? 0.6 : 0.5,
    reason:
      highCount === 1
        ? "רק שכבה אחת חצתה את הסף"
        : "אין מספיק שכבות גבוהות לסיווג",
    feeds_regime_hint: false,
  };
}
