// ═══════════════════════════════════════════════
// M3 — Hybrid Extreme Event Forecaster
//
// Bayesian-style forecaster for imminent performance collapse.
// Pure, synchronous, zero I/O. No ML library.
//
// Inputs (pre-computed by caller from Meta Insights):
//   velocity          — spend today / 7-day avg spend
//   fatigue           — 1 - (ctr_today / ctr_max_14d)
//   cost_escalation   — cpl_today / cpl_p50_30d
//   history_volatility — stddev(last 14 values of target metric)
//
// Model:
//   Start with prior p = 0.10 (base rate).
//   Each signal whose value crosses its threshold multiplies odds
//   by a likelihood ratio tuned to its severity.
//   history_volatility is an amplifier (not a stand-alone signal):
//     it scales the contribution of the other signals.
//
// Output bands on the final probability:
//   p < 0.30            → 'clear'
//   0.30 ≤ p < 0.60     → 'watch'
//   p ≥ 0.60            → 'act'
//
// horizon_days is fixed at 3: the forecast answers
// "what's the chance of collapse in the next 3 days".
//
// Drivers: Hebrew strings ranked by each signal's odds contribution,
// top 3 only, no numbers or percents.
// ═══════════════════════════════════════════════

export interface ForecastInput {
  velocity: number;
  fatigue: number;
  cost_escalation: number;
  history_volatility: number;
}

export type ForecastSignal = "clear" | "watch" | "act";

export interface ForecastOutput {
  collapse_probability: number; // 0..1
  horizon_days: number;
  signal: ForecastSignal;
  drivers: string[];
}

// ───────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────

const PRIOR = 0.1;
const HORIZON_DAYS = 3;

const VELOCITY_T1 = 1.5;
const VELOCITY_T2 = 2.0;
const FATIGUE_T1 = 0.4;
const FATIGUE_T2 = 0.6;
const COST_T1 = 1.25;
const COST_T2 = 1.5;

const VOLATILITY_AMPLIFIER_THRESHOLD = 0.4;
const VOLATILITY_AMPLIFIER_FACTOR = 1.4;

// Likelihood ratios (odds multipliers) by severity band.
// Tuned so a single STRONG signal crosses the 'act' band (p >= 0.6)
// from the PRIOR, while a single MILD signal lands in the 'watch' band.
const LR_MILD = 6.0;
const LR_STRONG = 20.0;

const WATCH_MIN = 0.3;
const ACT_MIN = 0.6;

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function safe(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

function probToOdds(p: number): number {
  const c = Math.min(Math.max(p, 1e-6), 1 - 1e-6);
  return c / (1 - c);
}

function oddsToProb(o: number): number {
  if (!Number.isFinite(o) || o <= 0) return 0;
  return o / (1 + o);
}

// ───────────────────────────────────────────────
// Per-signal likelihood ratio
// ───────────────────────────────────────────────

interface SignalContribution {
  key: "velocity" | "fatigue" | "cost_escalation";
  lr: number; // 1 = neutral
  driver?: string;
}

function velocityContribution(v: number): SignalContribution {
  const vv = safe(v);
  if (vv >= VELOCITY_T2) {
    return { key: "velocity", lr: LR_STRONG, driver: "קצב הוצאה מואץ" };
  }
  if (vv >= VELOCITY_T1) {
    return { key: "velocity", lr: LR_MILD, driver: "קצב הוצאה מוגבר" };
  }
  return { key: "velocity", lr: 1 };
}

function fatigueContribution(f: number): SignalContribution {
  const ff = safe(f);
  if (ff >= FATIGUE_T2) {
    return { key: "fatigue", lr: LR_STRONG, driver: "שחיקת קריאייטיב חריפה" };
  }
  if (ff >= FATIGUE_T1) {
    return { key: "fatigue", lr: LR_MILD, driver: "שחיקת קריאייטיב מתחילה" };
  }
  return { key: "fatigue", lr: 1 };
}

function costContribution(c: number): SignalContribution {
  const cc = safe(c);
  if (cc >= COST_T2) {
    return { key: "cost_escalation", lr: LR_STRONG, driver: "ייקור עלות מוביל" };
  }
  if (cc >= COST_T1) {
    return { key: "cost_escalation", lr: LR_MILD, driver: "עלייה בעלות מוביל" };
  }
  return { key: "cost_escalation", lr: 1 };
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

/**
 * Forecast the probability of performance collapse in the next
 * HORIZON_DAYS days. Returns a signal band and up to 3 Hebrew drivers
 * ranked by contribution to the posterior.
 */
export function forecastCollapse(input: ForecastInput): ForecastOutput {
  const contributions: SignalContribution[] = [
    velocityContribution(input.velocity),
    fatigueContribution(input.fatigue),
    costContribution(input.cost_escalation),
  ];

  const amplify =
    safe(input.history_volatility) >= VOLATILITY_AMPLIFIER_THRESHOLD
      ? VOLATILITY_AMPLIFIER_FACTOR
      : 1;

  let odds = probToOdds(PRIOR);
  for (const c of contributions) {
    if (c.lr > 1) {
      const effectiveLr = 1 + (c.lr - 1) * amplify;
      odds *= effectiveLr;
    }
  }

  const probability = clamp01(oddsToProb(odds));

  // Rank drivers by lr contribution descending; only those that fired.
  const firedDrivers = contributions
    .filter((c) => c.lr > 1 && typeof c.driver === "string")
    .sort((a, b) => b.lr - a.lr)
    .map((c) => c.driver as string);

  if (amplify > 1 && firedDrivers.length > 0) {
    firedDrivers.push("תנודתיות היסטורית גבוהה");
  }

  const drivers = firedDrivers.slice(0, 3);

  let signal: ForecastSignal = "clear";
  if (probability >= ACT_MIN) signal = "act";
  else if (probability >= WATCH_MIN) signal = "watch";

  return {
    collapse_probability: probability,
    horizon_days: HORIZON_DAYS,
    signal,
    drivers,
  };
}
