// ═══════════════════════════════════════════════
// E2 — Dual Expression Gate
//
// Forces every recommendation to be expressible in two independent
// substrates that point to the same mechanism in the reflective
// context: an architectural sentence (what to change in the campaign
// structure) and a metric sentence (what observable number must move,
// in what direction, over what window).
//
// Pure, synchronous, zero I/O. No mutation of any other module.
//
// Content rules (strictly enforced — failure → null):
//   architectural — Hebrew, ≤ 12 words, must contain an action verb
//                   from {העבר, בטל, הזז, שלב, פצל, צמצם, הוסף, חסום}.
//   metric        — Hebrew, ≤ 16 words, must contain a number AND a
//                   metric label from FalsifierMetric (excluding 'none').
//
// Both must derive from the same Mechanism, otherwise the dual is
// rejected. The mechanism on the architectural side prefers the
// most explicit user-facing source (a critical or warning gap with
// a parseable kpi); only when no gap is present does it fall back to
// the dominant diagnostic (forecast → anomaly → regime).
//
// expressDual REQUIRES at least one non-gap source (regime, anomaly,
// or forecast) in the context. A standalone gap is treated as a
// single-source signal and is rejected, because the whole point of
// the dual is to verify coherence between two independent substrates.
// ═══════════════════════════════════════════════

import type {
  ReflectiveContext,
  FalsifierSpec,
  FalsifierMetric,
} from "./reflectiveAction";
import { deriveFalsifier } from "./reflectiveAction";
import type { KpiGap } from "@/types/meta";

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export interface DualExpression {
  architectural: string;
  metric: string;
}

type Mechanism = "creative" | "cost" | "conversion" | "pacing";

// ───────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────

// Action verbs allowed in the architectural sentence — exact substring
// match. Order matches the spec.
export const ACTION_VERBS = [
  "העבר",
  "בטל",
  "הזז",
  "שלב",
  "פצל",
  "צמצם",
  "הוסף",
  "חסום",
] as const;

// Architectural sentence templates per mechanism. Each is hand-tuned
// to satisfy the action-verb rule and stay under 12 words.
const ARCHITECTURAL_BY_MECHANISM: Record<Mechanism, string> = {
  creative: "פצל את הקריאייטיב לקהל ממוקד יותר",
  cost: "צמצם את היקף הקהל הרחב",
  conversion: "הוסף שלב qualification לפני הטופס",
  pacing: "צמצם את התקציב היומי במשך 48 שעות",
};

// Metric labels — these are the literal substrings the validator
// searches for. Hebrew prose interleaved with English/abbreviated
// metric names is intentional and matches the rest of the M-layer.
const METRIC_LABEL: Record<Exclude<FalsifierMetric, "none">, string> = {
  ctr: "CTR",
  cpl: "CPL",
  cvr: "CVR",
  spend_velocity: "spend_velocity",
};

const MAX_ARCH_WORDS = 12;
const MAX_METRIC_WORDS = 16;

// ───────────────────────────────────────────────
// Mechanism mapping
// ───────────────────────────────────────────────

function falsifierMechanism(metric: FalsifierMetric): Mechanism | null {
  switch (metric) {
    case "ctr":
      return "creative";
    case "cpl":
      return "cost";
    case "cvr":
      return "conversion";
    case "spend_velocity":
      return "pacing";
    case "none":
    default:
      return null;
  }
}

function gapMechanism(gap: KpiGap): Mechanism | null {
  const en = gap.kpiName?.en?.toLowerCase().trim() ?? "";
  const he = gap.kpiName?.he?.toLowerCase().trim() ?? "";
  const candidates = [en, he];
  for (const name of candidates) {
    if (!name) continue;
    if (name === "ctr") return "creative";
    if (name === "cpl") return "cost";
    if (name === "cvr") return "conversion";
    if (name === "spend_velocity" || name === "spend velocity") return "pacing";
  }
  return null;
}

function diagnosticMechanism(ctx: ReflectiveContext): Mechanism | null {
  // Forecast trouble → pacing.
  if (ctx.forecast?.signal === "act" || ctx.forecast?.signal === "watch") {
    return "pacing";
  }
  // Anomaly → mechanism from the dominant scoring layer.
  if (ctx.anomaly?.isAnomaly) {
    const layers = ctx.anomaly.layers;
    let best: Mechanism = "creative";
    let bestVal = layers.threshold;
    if (layers.predictive > bestVal) {
      best = "cost";
      bestVal = layers.predictive;
    }
    if (layers.novelty > bestVal) {
      best = "conversion";
    }
    return best;
  }
  // Regime trouble → cost (CPL) or conversion (CVR by reason).
  if (ctx.regime?.state === "crisis") {
    return ctx.regime.reason?.includes("CVR") ? "conversion" : "cost";
  }
  if (ctx.regime?.state === "transitional") {
    return "cost";
  }
  return null;
}

/**
 * The architectural side prefers the most explicit user-facing signal:
 * a critical gap, then a warning gap, then the diagnostic stream.
 */
function pickArchitecturalMechanism(ctx: ReflectiveContext): Mechanism | null {
  const critical = ctx.gaps.find((g) => g.status === "critical");
  if (critical) {
    const m = gapMechanism(critical);
    if (m) return m;
  }
  const warning = ctx.gaps.find((g) => g.status === "warning");
  if (warning) {
    const m = gapMechanism(warning);
    if (m) return m;
  }
  return diagnosticMechanism(ctx);
}

// ───────────────────────────────────────────────
// Sentence building
// ───────────────────────────────────────────────

function formatThreshold(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

function buildMetricSentence(falsifier: FalsifierSpec): string {
  if (falsifier.metric === "none") return "";
  const label = METRIC_LABEL[falsifier.metric];
  const dirWord = falsifier.direction === "above" ? "מעל" : "מתחת";
  const t = formatThreshold(falsifier.threshold);
  if (t === "") return "";
  return `${label} צריך להיות ${dirWord} ${t} בתוך ${falsifier.window_days} ימים`;
}

// ───────────────────────────────────────────────
// Validators (exported for unit tests)
// ───────────────────────────────────────────────

const NUMBER_RE = /\d/;

export function hasActionVerb(s: string): boolean {
  if (!s) return false;
  return ACTION_VERBS.some((v) => s.includes(v));
}

export function hasNumber(s: string): boolean {
  if (!s) return false;
  return NUMBER_RE.test(s);
}

export function hasMetricName(s: string, metric: FalsifierMetric): boolean {
  if (!s || metric === "none") return false;
  return s.includes(METRIC_LABEL[metric]);
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

/**
 * Build a DualExpression from the reflective context, or return null
 * when the recommendation cannot be expressed coherently in both
 * architectural and metric form.
 *
 * `next_step` is forwarded to deriveFalsifier and otherwise unused
 * here — the architectural sentence is selected from a fixed template
 * keyed by the resolved mechanism, not by parsing the input string.
 */
export function expressDual(
  ctx: ReflectiveContext,
  next_step: string,
): DualExpression | null {
  // 1. Falsifier must exist and be active.
  const falsifier = deriveFalsifier(ctx, next_step);
  if (!falsifier || falsifier.metric === "none") return null;

  // 2. At least one non-gap source must be present in ctx — a lone
  //    gap is a single-source signal, not a dual one.
  const hasNonGapSource =
    ctx.regime !== undefined ||
    ctx.anomaly !== undefined ||
    ctx.forecast !== undefined;
  if (!hasNonGapSource) return null;

  // 3. Resolve mechanisms.
  const archMechanism = pickArchitecturalMechanism(ctx);
  if (!archMechanism) return null;

  const metricMech = falsifierMechanism(falsifier.metric);
  if (!metricMech) return null;

  // 4. Both substrates must point to the same mechanism.
  if (archMechanism !== metricMech) return null;

  // 5. Build sentences.
  const architectural = ARCHITECTURAL_BY_MECHANISM[archMechanism];
  const metric = buildMetricSentence(falsifier);

  // 6. Content rules.
  if (!hasActionVerb(architectural)) return null;
  if (!hasNumber(metric)) return null;
  if (!hasMetricName(metric, falsifier.metric)) return null;
  if (wordCount(architectural) > MAX_ARCH_WORDS) return null;
  if (wordCount(metric) > MAX_METRIC_WORDS) return null;

  return { architectural, metric };
}
