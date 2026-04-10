// ═══════════════════════════════════════════════
// M2 — Biomimetic Anomaly Detector
//
// Three-layer anomaly scoring on a single metric time series.
// Pure statistics. No HMM, no ML library. Synchronous. Zero I/O.
//
// Layers (per spec):
//   L1 adaptive threshold: mean ± 2.5·std on a rolling 14-day window.
//     Current point outside band → 1.0, inside → scaled 0..1 by distance.
//   L2 predictive residual:  predict via 3-day rolling mean on history,
//     residual = |current − prediction|, normalized by window std.
//   L3 NBSR novelty: distance of current from full-history centroid,
//     normalized to 0..1 by max observed distance.
//
// Aggregate score = 0.4·L1 + 0.3·L2 + 0.3·L3. isAnomaly = score > 0.7.
//
// Explain is a single Hebrew sentence describing the dominant layer.
// No numbers, no percents, no metric values.
// ═══════════════════════════════════════════════

export interface AnomalyInput {
  metric: string;
  history: Array<{ ts: number; value: number }>;
  current: { ts: number; value: number };
}

export interface AnomalyOutput {
  score: number; // 0..1
  isAnomaly: boolean;
  layers: {
    threshold: number; // L1
    predictive: number; // L2
    novelty: number; // L3
  };
  explain: string;
}

// ───────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────

const WINDOW_DAYS = 14;
const SHORT_WINDOW = 3;
const THRESHOLD_K = 2.5;
const MIN_HISTORY = 3;

const WEIGHT_L1 = 0.4;
const WEIGHT_L2 = 0.3;
const WEIGHT_L3 = 0.3;

const ANOMALY_CUTOFF = 0.7;

// ───────────────────────────────────────────────
// Math helpers
// ───────────────────────────────────────────────

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

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

function cleanSeries(
  series: Array<{ ts: number; value: number }>,
): Array<{ ts: number; value: number }> {
  return series.filter(
    (p) =>
      typeof p.value === "number" &&
      Number.isFinite(p.value) &&
      typeof p.ts === "number" &&
      Number.isFinite(p.ts),
  );
}

// ───────────────────────────────────────────────
// Layer computations
// ───────────────────────────────────────────────

function layerThreshold(window: number[], current: number): number {
  if (window.length < 2) return 0;
  const m = mean(window);
  const s = stddev(window);
  if (s < 1e-9) {
    return Math.abs(current - m) < 1e-9 ? 0 : 1;
  }
  const z = Math.abs(current - m) / s;
  if (z >= THRESHOLD_K) return 1;
  // Smooth inside the band: 0 at z=0 up to ~0.6 at z=2.5
  return clamp01((z / THRESHOLD_K) * 0.6);
}

function layerPredictive(
  history: number[],
  current: number,
  windowStd: number,
): number {
  if (history.length === 0) return 0;
  const recent = history.slice(-SHORT_WINDOW);
  const prediction = mean(recent);
  const residual = Math.abs(current - prediction);
  if (windowStd < 1e-9) {
    return residual < 1e-9 ? 0 : 1;
  }
  // Normalize by std: 1 std → ~0.33, 3 std → 1.0
  return clamp01(residual / (3 * windowStd));
}

function layerNovelty(history: number[], current: number): number {
  if (history.length === 0) return 0;
  const centroid = mean(history);
  const distance = Math.abs(current - centroid);
  let maxDistance = 0;
  for (const v of history) {
    const d = Math.abs(v - centroid);
    if (d > maxDistance) maxDistance = d;
  }
  if (maxDistance < 1e-9) {
    return distance < 1e-9 ? 0 : 1;
  }
  // Ratio > 1 means current exceeds the historical envelope.
  return clamp01(distance / (maxDistance * 1.5));
}

// ───────────────────────────────────────────────
// Explain builder
// ───────────────────────────────────────────────

function buildExplain(
  isAnomaly: boolean,
  layers: { threshold: number; predictive: number; novelty: number },
): string {
  if (!isAnomaly) {
    return "המדד בטווח ההתנהגות הרגיל";
  }
  let dominantKey: "threshold" | "predictive" | "novelty" = "threshold";
  let dominantVal = layers.threshold;
  if (layers.predictive > dominantVal) {
    dominantKey = "predictive";
    dominantVal = layers.predictive;
  }
  if (layers.novelty > dominantVal) {
    dominantKey = "novelty";
    dominantVal = layers.novelty;
  }
  if (dominantKey === "threshold") {
    return "חריגה חדה מהתחום הרגיל";
  }
  if (dominantKey === "predictive") {
    return "פער משמעותי מול הצפי הקצר";
  }
  return "דפוס חדש שלא נצפה בעבר";
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

/**
 * Score the current point as an anomaly on a single metric series.
 * Requires at least 3 valid history points; otherwise returns a
 * neutral, non-anomalous result.
 */
export function detectAnomaly(input: AnomalyInput): AnomalyOutput {
  const history = cleanSeries(input.history).map((p) => p.value);
  const currentValid =
    typeof input.current?.value === "number" &&
    Number.isFinite(input.current.value);

  if (history.length < MIN_HISTORY || !currentValid) {
    return {
      score: 0,
      isAnomaly: false,
      layers: { threshold: 0, predictive: 0, novelty: 0 },
      explain: "אין די היסטוריה לקבוע חריגה",
    };
  }

  const current = input.current.value;
  const window = history.slice(-WINDOW_DAYS);
  const windowStd = stddev(window);

  const l1 = layerThreshold(window, current);
  const l2 = layerPredictive(history, current, windowStd);
  const l3 = layerNovelty(history, current);

  const score = clamp01(WEIGHT_L1 * l1 + WEIGHT_L2 * l2 + WEIGHT_L3 * l3);
  const isAnomaly = score > ANOMALY_CUTOFF;
  const layers = { threshold: l1, predictive: l2, novelty: l3 };

  return {
    score,
    isAnomaly,
    layers,
    explain: buildExplain(isAnomaly, layers),
  };
}
