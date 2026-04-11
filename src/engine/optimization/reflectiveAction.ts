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
import type { BlackboardWrite } from "./ontologicalVerifier";
import type { FreshnessMap } from "./freshnessBudget";
import { freshnessGate } from "./freshnessBudget";
import type { StageDistribution, CascadeStage } from "./stageSpectrum";
import { nextStageInCascade } from "./stageSpectrum";
import type { AnomalyClassification } from "./biomimeticAnomalyType";
// E2 — runtime import is intentional. The cycle is safe because
// expressDual is only called inside function bodies, never at
// module-load time.
import { expressDual } from "./dualExpression";

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export type ActionSignal = "stable" | "watch" | "act";

// E1 — Falsification contract types
export type FalsifierMetric =
  | "ctr"
  | "cpl"
  | "cvr"
  | "spend_velocity"
  | "none";
export type FalsifierDirection = "above" | "below";

export interface FalsifierSpec {
  metric: FalsifierMetric;
  threshold: number;
  direction: FalsifierDirection;
  window_days: number;
}

export interface ReflectiveContext {
  funnel: FunnelResult;
  gaps: KpiGap[];
  regime?: RegimeOutput;
  anomaly?: AnomalyOutput;
  forecast?: ForecastOutput;
  profile?: UserProfileVector;
  // E3 — optional freshness map (component name → updated_at ms).
  // When undefined the freshness gate is bypassed (backward compat).
  freshness?: FreshnessMap;
  // E4 — optional cascade distribution from the blackboard. When a
  // caller fetches this via fetchRecentStageDistribution and attaches
  // it here, generateReflectiveAction will override next_step with
  // a movement sentence when cascade_blocked === true.
  stage_spectrum?: StageDistribution;
  // E5 — optional anomaly classification (noise / pathological /
  // emergent). When the type is 'emergent' the engine suppresses
  // any act signal and returns the E5 measurement watch instead —
  // a new regime is forming and the system must measure before it
  // tries to close the deviation.
  anomaly_classification?: AnomalyClassification;
}

export interface ActionCard {
  signal: ActionSignal;
  headline: string;
  why: string;
  next_step: string;
  eta_minutes: number;
  coherence_score: number; // 0..1
  // E1 — Falsification contract fields
  falsification_window_days: number;
  falsifier_metric: FalsifierMetric;
  falsifier_threshold: number;
  falsifier_direction: FalsifierDirection;
  // E2 — Internal metric expression (persisted to blackboard but
  // never displayed in UI). Optional so the field stays invisible
  // to existing frontend consumers and to low-coherence/inert paths.
  metric_expression?: string;
}

// E1 — Inert falsifier block applied when recommendation is not
// falsifiable in a bounded time (e.g. low coherence, stable path).
const INERT_FALSIFIER = {
  falsification_window_days: 0,
  falsifier_metric: "none" as const,
  falsifier_threshold: 0,
  falsifier_direction: "above" as const,
};

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

// E1 — Reason strings for the falsifier-missing watch path. These
// intentionally exceed the normal why length cap because the spec
// quotes them verbatim.
const WHY_FALSIFIER_MISSING =
  "ההמלצה שנגזרת משלב זה אינה ניתנת להפרכה בזמן סופי. נדרשת מדידה לפני שנציע אותה.";
const NEXT_STEP_FALSIFIER_MISSING = "המתן לאיתות נוסף לפני הצעת מהלך מבני";

// E2 — Reason strings for the dual-expression-missing watch path.
const WHY_DUAL_EXPRESSION_MISSING =
  "ההמלצה אינה עמידה לתרגום בין פעולה למטריקה. נדרשת קוהרנטיות בין השניים לפני החזרה למשתמש.";
const NEXT_STEP_DUAL_EXPRESSION_MISSING =
  "המתן לקוהרנטיות בין הצד הארכיטקטוני לצד המטרי";

// E3 — Reason strings for the stale-context watch path.
const WHY_STALE_CONTEXT =
  "חלק מהקונטקסט ישן. אוסף מדידה טרייה לפני שנחזיר הצעה שאפשר לעמוד מאחוריה.";
const NEXT_STEP_STALE_CONTEXT = "המתן לאיסוף מדידה טרייה לפני החזרת הצעה";

// E4 — Reason strings for the cascade-blocked watch path. The
// {stage} token is filled in at render time so the observer can see
// exactly where the cascade stopped.
function whyCascadeBlocked(stage: CascadeStage): string {
  return `הזרימה נעצרה ב-${stage}. צריך לזהות את צוואר הבקבוק לפני הצעת פעולה.`;
}
const NEXT_STEP_CASCADE_BLOCKED = "המתן לאיתור צוואר הבקבוק לפני המשך התנועה";

/**
 * Build the movement next_step sentence for a cascade that is
 * blocked at the given stage. Returns null when no downstream stage
 * exists (i.e. the block is at deploy), which forces the engine to
 * emit the E4 watch instead.
 *
 * Uses an action verb from the dualExpression allowed set and a
 * COR-SYS term ("צוואר בקבוק") so the sentence passes any downstream
 * content validators.
 */
function buildCascadeNextStep(blocked: CascadeStage): string | null {
  const next = nextStageInCascade(blocked);
  if (next === null) return null;
  return `העבר את צוואר הבקבוק מ-${blocked} אל ${next}`;
}

// E5 — Reason strings for the emergent-regime measurement watch.
const WHY_EMERGENT_REGIME =
  "מזהה משטר חדש שמתחיל להיווצר. מודד לפני פעולה.";
const NEXT_STEP_EMERGENT_REGIME =
  "המתן לאיסוף מדידה של המשטר המתהווה לפני פעולת תיקון";

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
// E1 — Falsifier derivation
// ───────────────────────────────────────────────

/**
 * Map a kpi label (he or en) to a known FalsifierMetric, or null when
 * the label is not part of the supported metric set.
 */
function parseKpiMetric(name: string | undefined): FalsifierMetric | null {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  if (n === "ctr") return "ctr";
  if (n === "cpl") return "cpl";
  if (n === "cvr") return "cvr";
  if (n === "spend_velocity" || n === "spend velocity") return "spend_velocity";
  return null;
}

function getKpiMetric(gap: KpiGap): FalsifierMetric | null {
  return parseKpiMetric(gap.kpiName?.en) ?? parseKpiMetric(gap.kpiName?.he);
}

/**
 * Direction the metric should move IF the recommendation works:
 *   ctr / cvr go up; cpl / spend_velocity go down.
 */
function recoveryDirection(metric: FalsifierMetric): FalsifierDirection {
  if (metric === "cpl" || metric === "spend_velocity") return "below";
  return "above";
}

/**
 * Derive the dominant falsification metric from the reflective context.
 *
 * Priority (deterministic, fail-fast):
 *   1. forecast.signal in (act, watch) → spend_velocity
 *   2. anomaly.isAnomaly                 → metric from dominant layer
 *   3. critical gap with parseable kpi   → that metric
 *   4. regime in (crisis, transitional)  → cpl (or cvr if reason matches)
 *   5. warning gap with parseable kpi    → that metric, shorter window
 *   6. nothing structural present        → null
 *
 * Returns null when the recommendation is structurally unfalsifiable
 * (e.g., pristine stable, or no driver could be parsed).
 *
 * Exported because dualExpression (E2) needs the same falsifier to
 * build the metric expression — keeping the priority chain in one
 * place avoids drift between the two modules.
 */
export function deriveFalsifier(
  ctx: ReflectiveContext,
  _next_step: string,
): FalsifierSpec | null {
  // 1. Forecast (M3) — strongest, time-bounded driver.
  if (ctx.forecast && ctx.forecast.signal !== "clear") {
    const horizon = ctx.forecast.horizon_days;
    const contradicting =
      ctx.forecast.signal === "act" && ctx.regime?.state === "stable";
    let window_days: number;
    if (contradicting) {
      // Spec: contradictory drivers shorten the window.
      window_days = horizon > 0 ? Math.max(3, Math.min(5, horizon)) : 3;
    } else if (ctx.forecast.signal === "act") {
      window_days = horizon > 0 ? Math.max(7, horizon) : 14;
    } else {
      window_days = 7;
    }
    return {
      metric: "spend_velocity",
      direction: "below",
      threshold: ctx.forecast.signal === "act" ? 1.2 : 1.5,
      window_days,
    };
  }

  // 2. Anomaly (M2) — dominant layer chooses the metric.
  if (ctx.anomaly?.isAnomaly) {
    const layers = ctx.anomaly.layers;
    let metric: FalsifierMetric = "ctr";
    let maxVal = layers.threshold;
    if (layers.predictive > maxVal) {
      metric = "cpl";
      maxVal = layers.predictive;
    }
    if (layers.novelty > maxVal) {
      metric = "cvr";
    }
    return {
      metric,
      direction: recoveryDirection(metric),
      threshold: 0.15,
      window_days: 14,
    };
  }

  // 3. Critical gap — explicit user-facing failure.
  const critical = ctx.gaps.find((g) => g.status === "critical");
  if (critical) {
    const metric = getKpiMetric(critical);
    if (metric !== null) {
      const target =
        typeof critical.targetMin === "number" && critical.targetMin > 0
          ? critical.targetMin
          : 0.01;
      return {
        metric,
        direction: recoveryDirection(metric),
        threshold: target,
        window_days: 14,
      };
    }
  }

  // 4. Regime (M1) — crisis or transitional.
  if (ctx.regime) {
    if (ctx.regime.state === "crisis") {
      const reasonHasCvr = ctx.regime.reason?.includes("CVR") ?? false;
      if (reasonHasCvr) {
        return {
          metric: "cvr",
          direction: "above",
          threshold: 0.02,
          window_days: 7,
        };
      }
      return {
        metric: "cpl",
        direction: "below",
        threshold: 0.85,
        window_days: 7,
      };
    }
    if (ctx.regime.state === "transitional") {
      return {
        metric: "cpl",
        direction: "below",
        threshold: 1.0,
        window_days: 14,
      };
    }
    // stable regime alone is not sufficient — fall through.
  }

  // 5. Warning gap with parseable kpi — shorter horizon.
  const warning = ctx.gaps.find((g) => g.status === "warning");
  if (warning) {
    const metric = getKpiMetric(warning);
    if (metric !== null) {
      const target =
        typeof warning.targetMin === "number" && warning.targetMin > 0
          ? warning.targetMin
          : 0.01;
      return {
        metric,
        direction: recoveryDirection(metric),
        threshold: target,
        window_days: 7,
      };
    }
  }

  // 6. No structural driver could be derived.
  return null;
}

/**
 * "Pristine stable" = every diagnostic explicitly present and calm,
 * no gaps at all. In that state the recommendation is "do nothing"
 * and there is genuinely nothing to falsify in a bounded window.
 */
function isPristineStable(ctx: ReflectiveContext): boolean {
  return (
    ctx.gaps.length === 0 &&
    ctx.regime?.state === "stable" &&
    ctx.anomaly?.isAnomaly === false &&
    ctx.forecast?.signal === "clear"
  );
}

// ───────────────────────────────────────────────
// E1 — Payload builder for blackboard persistence
// ───────────────────────────────────────────────

const USER_ID_SAFE_RE = /[^A-Za-z0-9_-]/g;

/**
 * Build the BlackboardWrite payload for a reflective action.
 *
 * Pure: returns the structured object only. The caller decides whether
 * to persist via blackboardClient.writeConcept (not yet implemented in
 * this layer) and whether to verify via ontologicalVerifier.verifyWrite.
 *
 * concept_key shape: TASK-reflective-action-{user_id}-{ts}.
 */
export function buildReflectiveActionPayload(
  card: ActionCard,
  user_id: string,
  ts: number,
): BlackboardWrite {
  const sanitizedUserId = (user_id ?? "").replace(USER_ID_SAFE_RE, "");
  const payload: Record<string, unknown> = {
    created_at: ts,
    signal: card.signal,
    headline: card.headline,
    why: card.why,
    next_step: card.next_step,
    eta_minutes: card.eta_minutes,
    coherence_score: card.coherence_score,
    falsification_window_days: card.falsification_window_days,
    falsifier_metric: card.falsifier_metric,
    falsifier_threshold: card.falsifier_threshold,
    falsifier_direction: card.falsifier_direction,
  };
  // E2 — only persist the metric expression when it exists, so the
  // existing E1 snapshot (without dual) stays unchanged.
  if (card.metric_expression !== undefined) {
    payload.metric_expression = card.metric_expression;
  }
  return {
    concept_key: `TASK-reflective-action-${sanitizedUserId}-${ts}`,
    stage: "process",
    payload,
  };
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

/**
 * Produce a single ActionCard from the reflective context.
 * Always returns exactly one card — never a list, never null.
 *
 * Gate order (each gate fully short-circuits the rest):
 *   1. freshness (E3)               → E3 watch (inert) when too few fresh
 *   2. coherence_score < 0.6        → M4 watch (fixed text, inert falsifier)
 *   3. signal/headline derivation   (existing M4 logic)
 *   4. E1 falsifier derivation
 *   5. signal === 'stable'          → eta=0 if pristine, 120 otherwise; inert
 *   6. falsifier === null           → E1 watch (inert)
 *   7. expressDual (E2) === null    → E2 watch (inert)
 *   8. stage_spectrum cascade_blocked (E4) → override next_step with
 *                                     a movement sentence; when no
 *                                     downstream stage exists, emit
 *                                     the E4 watch instead.
 *   9. anomaly_classification = emergent (E5) → measurement watch.
 *                                     Emergent anomalies indicate a
 *                                     new regime forming; the engine
 *                                     must measure it before acting.
 *  10. otherwise                    → full ActionCard with active dual + falsifier
 *
 * Each watch path emits a watch text unique to its rejection reason
 * so a downstream observer can tell exactly which gate fired.
 *
 * The architectural sentence from a successful dual replaces the M4
 * NEXT_STEP fragment as the card's next_step. The metric sentence is
 * stored on the card as `metric_expression` for blackboard persistence
 * and is never displayed in the UI.
 */
export function generateReflectiveAction(
  ctx: ReflectiveContext,
): ActionCard {
  // 1. Freshness gate (E3) — runs first, independent of coherence.
  //    When ctx.freshness is undefined the gate is bypassed entirely.
  if (!freshnessGate(ctx)) {
    // The coherence_score reported here is the value the engine would
    // have computed if it had reached the M4 logic. Recomputing keeps
    // the value meaningful for any downstream observer who logs it.
    const staleVotes = [
      voteRegime(ctx.regime),
      voteAnomaly(ctx.anomaly),
      voteForecast(ctx.forecast),
    ];
    return {
      signal: "watch",
      headline: HEADLINES.decisionDelay,
      why: WHY_STALE_CONTEXT,
      next_step: NEXT_STEP_STALE_CONTEXT,
      eta_minutes: ETA.watch,
      coherence_score: clamp01(computeCoherence(staleVotes)),
      ...INERT_FALSIFIER,
    };
  }

  const votes = [
    voteRegime(ctx.regime),
    voteAnomaly(ctx.anomaly),
    voteForecast(ctx.forecast),
  ];
  const coherence = clamp01(computeCoherence(votes));

  // 2. Low coherence short-circuit: fixed M4 watch message.
  if (coherence < 0.6) {
    return {
      signal: "watch",
      headline: HEADLINES.decisionDelay,
      why: WHY.decisionDelay,
      next_step: NEXT_STEP.decisionDelay,
      eta_minutes: ETA.watch,
      coherence_score: coherence,
      ...INERT_FALSIFIER,
    };
  }

  // 3. Existing M4 selection.
  const signal = fuseSignal(ctx);
  const key = pickHeadlineKey(ctx, signal);
  const next_step = NEXT_STEP[key];

  // 4. E1 falsifier derivation.
  const falsifier = deriveFalsifier(ctx, next_step);

  // 5. Stable path: never falsifiable in a bounded way. eta=0 when
  //    everything is pristine, otherwise the existing 120 stays.
  if (signal === "stable") {
    return {
      signal,
      headline: HEADLINES[key],
      why: WHY[key],
      next_step,
      eta_minutes: isPristineStable(ctx) ? 0 : ETA.stable,
      coherence_score: coherence,
      ...INERT_FALSIFIER,
    };
  }

  // 6. Watch/act with no derivable falsifier → E1 watch fallback.
  if (falsifier === null) {
    return {
      signal: "watch",
      headline: HEADLINES.decisionDelay,
      why: WHY_FALSIFIER_MISSING,
      next_step: NEXT_STEP_FALSIFIER_MISSING,
      eta_minutes: ETA.watch,
      coherence_score: coherence,
      ...INERT_FALSIFIER,
    };
  }

  // 7. E2 dual expression gate.
  const dual = expressDual(ctx, next_step);
  if (dual === null) {
    return {
      signal: "watch",
      headline: HEADLINES.decisionDelay,
      why: WHY_DUAL_EXPRESSION_MISSING,
      next_step: NEXT_STEP_DUAL_EXPRESSION_MISSING,
      eta_minutes: ETA.watch,
      coherence_score: coherence,
      ...INERT_FALSIFIER,
    };
  }

  // 8. E4 cascade override. When the caller attached a stage spectrum
  //    and the cascade is blocked, the dual's architectural sentence
  //    is replaced with a movement sentence that pushes from the
  //    blocked stage to the next one. When the block is at deploy
  //    (terminal stage) no movement is possible and the engine emits
  //    the E4 watch instead.
  let finalNextStep = dual.architectural;
  const spectrum = ctx.stage_spectrum;
  if (
    spectrum &&
    spectrum.cascade_blocked === true &&
    spectrum.blocked_stage !== null
  ) {
    const cascadeStep = buildCascadeNextStep(spectrum.blocked_stage);
    if (cascadeStep === null) {
      return {
        signal: "watch",
        headline: HEADLINES.decisionDelay,
        why: whyCascadeBlocked(spectrum.blocked_stage),
        next_step: NEXT_STEP_CASCADE_BLOCKED,
        eta_minutes: ETA.watch,
        coherence_score: coherence,
        ...INERT_FALSIFIER,
      };
    }
    finalNextStep = cascadeStep;
  }

  // 9. E5 emergent-regime override. Emergent anomalies must not
  //    turn into an act recommendation — the system must measure the
  //    forming regime before trying to close the deviation. This
  //    gate fires AFTER the cascade override so that a pathological
  //    classification (which reads act as act) still flows through
  //    the cascade logic, but an emergent classification preempts
  //    any action including the movement next_step.
  if (ctx.anomaly_classification?.type === "emergent") {
    return {
      signal: "watch",
      headline: HEADLINES.decisionDelay,
      why: WHY_EMERGENT_REGIME,
      next_step: NEXT_STEP_EMERGENT_REGIME,
      eta_minutes: ETA.watch,
      coherence_score: coherence,
      ...INERT_FALSIFIER,
    };
  }

  // 10. Active falsifier + valid dual (+ optional cascade override) — full card.
  return {
    signal,
    headline: HEADLINES[key],
    why: WHY[key],
    next_step: finalNextStep,
    eta_minutes: ETA[signal],
    coherence_score: coherence,
    falsification_window_days: falsifier.window_days,
    falsifier_metric: falsifier.metric,
    falsifier_threshold: falsifier.threshold,
    falsifier_direction: falsifier.direction,
    metric_expression: dual.metric,
  };
}
