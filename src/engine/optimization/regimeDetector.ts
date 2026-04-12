// ═══════════════════════════════════════════════
// M1 — Regime Detector
//
// 3-state classifier over rolling Meta Insights metrics:
//   'stable' / 'transitional' / 'crisis'
//
// Pure statistics. No HMM, no ML library. Synchronous. Zero I/O.
//
// Aggregation rules (per spec):
//   - stable:       COV < 0.15 for all metrics, no trend shift, no
//                   critical threshold tripped
//   - transitional: any 0.15 ≤ COV ≤ 0.35, or any trend shift, but
//                   no critical threshold tripped and no COV > 0.35
//   - crisis:       any COV > 0.35, or CPL rising ≥25% (last3/first4),
//                   or CVR dropping ≥30% (last3/first4)
//
// The critical thresholds are applied specifically to CPL (up) and
// CVR (down) because those two metrics directly express whether the
// funnel is bleeding money or losing conversions.
// ═══════════════════════════════════════════════

export type RegimeMetric = "ctr" | "cpc" | "cpl" | "cvr" | "spend";

export interface RegimeInput {
  metric: RegimeMetric;
  series: Array<{ ts: number; value: number }>;
}

export type RegimeState = "stable" | "transitional" | "crisis";

export interface RegimeOutput {
  state: RegimeState;
  confidence: number; // 0..1
  reason: string;
  since: number; // epoch ms
}

// ───────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────

const WINDOW_SIZE = 7;
const MIN_POINTS = 3;

const COV_STABLE_MAX = 0.15;
const COV_CRISIS_MIN = 0.35;

const CPL_CRISIS_RATIO = 1.25; // last3 mean / first4 mean > this → crisis
const CVR_CRISIS_RATIO = 0.70; // last3 mean / first4 mean < this → crisis

const TREND_SHIFT_HIGH = 1.25;
const TREND_SHIFT_LOW = 0.75;

// ───────────────────────────────────────────────
// Math helpers
// ───────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  if (n < lo) return lo;
  if (n > hi) return hi;
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

function cov(values: number[]): number {
  const m = mean(values);
  if (Math.abs(m) < 1e-9) return 0;
  return stddev(values) / Math.abs(m);
}

function windowOf<T>(series: T[], size: number): T[] {
  return series.length <= size ? series.slice() : series.slice(series.length - size);
}

// ───────────────────────────────────────────────
// Per-metric analysis
// ───────────────────────────────────────────────

interface MetricAnalysis {
  metric: RegimeMetric;
  pointCount: number;
  cov: number;
  trendShifted: boolean;
  criticalCrisis: boolean; // CPL up / CVR down
  crisisReason?: string;
  oldestTs: number;
}

function analyzeMetric(input: RegimeInput): MetricAnalysis | null {
  const cleanSeries = input.series.filter(
    (p) =>
      typeof p.value === "number" &&
      Number.isFinite(p.value) &&
      typeof p.ts === "number" &&
      Number.isFinite(p.ts),
  );
  if (cleanSeries.length < MIN_POINTS) return null;

  const win = windowOf(cleanSeries, WINDOW_SIZE);
  const values = win.map((p) => p.value);

  const metricCov = cov(values);

  // Trend shift: compare first half mean vs second half mean
  const halfIndex = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, halfIndex);
  const secondHalf = values.slice(halfIndex);
  let trendShifted = false;
  const m1 = mean(firstHalf);
  const m2 = mean(secondHalf);
  if (Math.abs(m1) > 1e-9) {
    const ratio = m2 / m1;
    if (ratio > TREND_SHIFT_HIGH || ratio < TREND_SHIFT_LOW) trendShifted = true;
  }

  // Critical threshold check for CPL / CVR — uses last3 / first4 where available
  let criticalCrisis = false;
  let crisisReason: string | undefined;
  if (values.length >= 4 && (input.metric === "cpl" || input.metric === "cvr")) {
    const last3 = values.slice(-3);
    const first4 = values.slice(0, Math.max(1, values.length - 3));
    const last3Mean = mean(last3);
    const first4Mean = mean(first4);
    if (Math.abs(first4Mean) > 1e-9) {
      const ratio = last3Mean / first4Mean;
      if (input.metric === "cpl" && ratio > CPL_CRISIS_RATIO) {
        criticalCrisis = true;
        crisisReason = "עלייה חדה ב-CPL";
      } else if (input.metric === "cvr" && ratio < CVR_CRISIS_RATIO) {
        criticalCrisis = true;
        crisisReason = "צניחה חדה ב-CVR";
      }
    }
  }

  return {
    metric: input.metric,
    pointCount: values.length,
    cov: metricCov,
    trendShifted,
    criticalCrisis,
    crisisReason,
    oldestTs: win[0].ts,
  };
}

// ───────────────────────────────────────────────
// Aggregation
// ───────────────────────────────────────────────

function aggregate(analyses: MetricAnalysis[]): RegimeOutput {
  let crisisSignals = 0;
  let transitionalSignals = 0;
  let maxCov = 0;
  const crisisReasons: string[] = [];
  let oldestTs = Number.POSITIVE_INFINITY;

  for (const a of analyses) {
    if (a.cov > maxCov) maxCov = a.cov;
    if (a.oldestTs < oldestTs) oldestTs = a.oldestTs;

    if (a.cov > COV_CRISIS_MIN) {
      crisisSignals += 1;
      crisisReasons.push("תנודתיות גבוהה במדדים");
    }
    if (a.criticalCrisis) {
      crisisSignals += 1;
      if (a.crisisReason) crisisReasons.push(a.crisisReason);
    }
    if (a.cov >= COV_STABLE_MAX && a.cov <= COV_CRISIS_MIN) {
      transitionalSignals += 1;
    }
    if (a.trendShifted) {
      transitionalSignals += 1;
    }
  }

  const since = Number.isFinite(oldestTs) ? oldestTs : 0;

  if (crisisSignals >= 1) {
    const dominantReason =
      crisisReasons.find((r) => r.includes("CPL") || r.includes("CVR")) ??
      (crisisSignals >= 2
        ? "שני מדדים לפחות חצו סף שלילי"
        : "מדד חצה סף שלילי");
    const confidence = clamp(0.7 + 0.1 * crisisSignals, 0.7, 1.0);
    return { state: "crisis", confidence, reason: dominantReason, since };
  }

  if (transitionalSignals >= 1) {
    const sigRatio = transitionalSignals / Math.max(1, analyses.length);
    const confidence = clamp(0.5 + 0.2 * sigRatio, 0.5, 0.8);
    return {
      state: "transitional",
      confidence,
      reason: "זוהה שינוי מגמה באחד המדדים",
      since,
    };
  }

  const confidence = clamp(1 - maxCov / COV_STABLE_MAX, 0.6, 1.0);
  return {
    state: "stable",
    confidence,
    reason: "המערכת יציבה בשבוע האחרון",
    since,
  };
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

/**
 * Classify the current regime from one or more metric time series.
 * Falls back to `stable` with low confidence when all inputs have
 * fewer than 3 valid points.
 */
/**
 * Build synthetic RegimeInput entries from UKG cross-domain signals
 * when the caller doesn't have a full timeseries (e.g. only a single
 * Meta snapshot or CSV trend summary). Returns an empty array when
 * UKG has no real metrics.
 */
export function buildRegimeInputFromUKG(
  ukg: import("../userKnowledgeGraph").UserKnowledgeGraph,
): RegimeInput[] {
  const rm = ukg.derived.realMetrics;
  if (rm.avgCPL == null && rm.avgCTR == null) return [];
  const result: RegimeInput[] = [];
  if (rm.avgCPL != null) {
    result.push({
      metric: "cpl",
      values: [rm.avgCPL, rm.avgCPL * (rm.trendDirection === "improving" ? 0.95 : rm.trendDirection === "declining" ? 1.08 : 1)],
      direction: "up" as const,
    });
  }
  if (rm.avgCTR != null) {
    result.push({
      metric: "ctr",
      values: [rm.avgCTR, rm.avgCTR * (rm.trendDirection === "improving" ? 1.05 : rm.trendDirection === "declining" ? 0.92 : 1)],
      direction: "down" as const,
    });
  }
  return result;
}

export function detectRegime(inputs: RegimeInput[]): RegimeOutput {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return {
      state: "stable",
      confidence: 0.2,
      reason: "חסרים נתונים לניתוח משטר",
      since: 0,
    };
  }

  const analyses: MetricAnalysis[] = [];
  for (const input of inputs) {
    const a = analyzeMetric(input);
    if (a) analyses.push(a);
  }

  if (analyses.length === 0) {
    return {
      state: "stable",
      confidence: 0.2,
      reason: "חסרים נתונים לניתוח משטר",
      since: 0,
    };
  }

  return aggregate(analyses);
}
