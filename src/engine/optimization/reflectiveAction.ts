// ═══════════════════════════════════════════════
// M4 — Reflective Interface Upgrade (engine)
//
// Synthesizes funnel + gaps + regime + anomaly + forecast + profile
// into exactly ONE ActionCard. Pure, synchronous, zero I/O.
//
// Content rules (enforced at selection time):
//   headline ∈ {
//     "צוואר בקבוק",
//     "נתיב טבעי",
//     "נורמליזציה של סטייה",
//     "שיהוי החלטות",
//     "חוסם עורקים טכנולוגי",
//   }
//   why        — no numbers, no percents, no metric names
//   next_step  — architectural action, not coaching advice
//
// When `coherence_score < 0.6` the signal is forced to 'watch' and
// a fixed, neutral message is emitted: the engine is explicit about
// not having enough aligned signals to commit to a decision.
//
// Coherence_score derivation (0..1):
//   * No optional signals present → 0.5 (unknown).
//   * One optional signal        → 0.9 (single source of truth).
//   * Multiple aligned           → 1.0.
//   * Multiple contradictory     → max(agree, disagree) / present.
//
// The engine returns direct fields (not the envelope) because the
// spec supplies explicit per-module signatures that override the
// general envelope rule.
// ═══════════════════════════════════════════════

import type { FunnelResult } from "@/types/funnel";
import type { KpiGap } from "@/types/meta";
import type { RegimeOutput } from "./regimeDetector";
import type { AnomalyOutput } from "./biomimeticAnomaly";
import type { ForecastOutput } from "./extremeForecaster";
import type { UserProfileVector } from "./daplProfile";

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export type ActionSignal = "stable" | "watch" | "act";

export interface ReflectiveContext {
  funnel: FunnelResult;
  gaps: KpiGap[];
  regime?: RegimeOutput;
  anomaly?: AnomalyOutput;
  forecast?: ForecastOutput;
  profile?: UserProfileVector;
}

export interface ActionCard {
  signal: ActionSignal;
  headline: string;
  why: string;
  next_step: string;
  eta_minutes: number;
  coherence_score: number; // 0..1
}

// ───────────────────────────────────────────────
// Allowed content fragments
// ───────────────────────────────────────────────

const HEADLINES = {
  bottleneck: "צוואר בקבוק",
  natural: "נתיב טבעי",
  normalization: "נורמליזציה של סטייה",
  decisionDelay: "שיהוי החלטות",
  techBlocker: "חוסם עורקים טכנולוגי",
} as const;

const WHY: Record<keyof typeof HEADLINES, string> = {
  bottleneck: "שלב בפאנל מייצר חיכוך שמעכב מעבר הלאה",
  natural: "המגמה נעה בכיוון שאינו תואם את יעד הפאנל",
  normalization: "דפוס חריג חוזר על עצמו והופך למובן מאליו",
  decisionDelay: "המערכת ממתינה לאיתות ברור לפני מהלך גדול",
  techBlocker: "אלמנט מערכתי ממתן את הביצועים שלא לצורך",
};

const NEXT_STEP: Record<keyof typeof HEADLINES, string> = {
  bottleneck: "אבחן את שלב החיכוך ותקן אותו בארכיטקטורה",
  natural: "כייל מחדש את יעד הפאנל מול המגמה",
  normalization: "הגדר סף תגובה חדש לדפוס החריג",
  decisionDelay: "המתן לאיתות נוסף לפני שינוי מבני",
  techBlocker: "בדוק את שכבת הכלים המחברת את הנכסים",
};

const ETA: Record<ActionSignal, number> = {
  stable: 120,
  watch: 45,
  act: 15,
};

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Map each optional diagnostic to a ternary trouble vote:
 *   'trouble' | 'calm' | null (absent)
 */
function voteRegime(regime?: RegimeOutput): "trouble" | "calm" | null {
  if (!regime) return null;
  if (regime.state === "crisis" || regime.state === "transitional") return "trouble";
  return "calm";
}

function voteAnomaly(anomaly?: AnomalyOutput): "trouble" | "calm" | null {
  if (!anomaly) return null;
  return anomaly.isAnomaly ? "trouble" : "calm";
}

function voteForecast(forecast?: ForecastOutput): "trouble" | "calm" | null {
  if (!forecast) return null;
  if (forecast.signal === "act" || forecast.signal === "watch") return "trouble";
  return "calm";
}

function computeCoherence(
  votes: Array<"trouble" | "calm" | null>,
): number {
  const present = votes.filter((v): v is "trouble" | "calm" => v !== null);
  if (present.length === 0) return 0.5;
  if (present.length === 1) return 0.9;
  const trouble = present.filter((v) => v === "trouble").length;
  const calm = present.length - trouble;
  if (trouble === 0 || calm === 0) return 1.0;
  return Math.max(trouble, calm) / present.length;
}

/**
 * Fuse the strongest signal across the diagnostic layers.
 * Anomaly and forecast=act escalate to 'act'; regime=crisis also
 * escalates. Transitional/watch escalate to 'watch'. Gaps with
 * status 'critical' force 'act'; 'warning' forces at least 'watch'.
 */
function fuseSignal(ctx: ReflectiveContext): ActionSignal {
  let level: ActionSignal = "stable";
  const bump = (target: ActionSignal) => {
    if (target === "act") level = "act";
    else if (target === "watch" && level !== "act") level = "watch";
  };

  if (ctx.regime) {
    if (ctx.regime.state === "crisis") bump("act");
    else if (ctx.regime.state === "transitional") bump("watch");
  }
  if (ctx.anomaly?.isAnomaly) bump("act");
  if (ctx.forecast) {
    if (ctx.forecast.signal === "act") bump("act");
    else if (ctx.forecast.signal === "watch") bump("watch");
  }

  for (const gap of ctx.gaps) {
    if (gap.status === "critical") bump("act");
    else if (gap.status === "warning") bump("watch");
  }

  return level;
}

/**
 * Pick the headline key that best matches the fused signal and the
 * dominant diagnostic input. Priority order is deterministic.
 */
function pickHeadlineKey(
  ctx: ReflectiveContext,
  signal: ActionSignal,
): keyof typeof HEADLINES {
  if (signal === "stable") {
    return "natural";
  }

  // Critical gap always reads as a bottleneck.
  if (ctx.gaps.some((g) => g.status === "critical")) {
    return "bottleneck";
  }

  // Anomaly dominates normalization framing.
  if (ctx.anomaly?.isAnomaly) {
    return "normalization";
  }

  // Forecast 'act' reads as a tech blocker (architectural friction
  // in the ad delivery stack, not user behavior).
  if (ctx.forecast?.signal === "act") {
    return "techBlocker";
  }

  // Crisis regime reads as bottleneck by default.
  if (ctx.regime?.state === "crisis") {
    return "bottleneck";
  }

  // Transitional regime → the funnel is on a natural drift.
  if (ctx.regime?.state === "transitional") {
    return "natural";
  }

  // Warning gap or forecast=watch with no sharper signal → decision delay.
  return "decisionDelay";
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

/**
 * Produce a single ActionCard from the reflective context.
 * Always returns exactly one card — never a list, never null.
 */
export function generateReflectiveAction(
  ctx: ReflectiveContext,
): ActionCard {
  const votes = [
    voteRegime(ctx.regime),
    voteAnomaly(ctx.anomaly),
    voteForecast(ctx.forecast),
  ];
  const coherence = clamp01(computeCoherence(votes));

  // Low coherence short-circuit: fixed watch message.
  if (coherence < 0.6) {
    return {
      signal: "watch",
      headline: HEADLINES.decisionDelay,
      why: WHY.decisionDelay,
      next_step: NEXT_STEP.decisionDelay,
      eta_minutes: ETA.watch,
      coherence_score: coherence,
    };
  }

  const signal = fuseSignal(ctx);
  const key = pickHeadlineKey(ctx, signal);

  return {
    signal,
    headline: HEADLINES[key],
    why: WHY[key],
    next_step: NEXT_STEP[key],
    eta_minutes: ETA[signal],
    coherence_score: coherence,
  };
}
