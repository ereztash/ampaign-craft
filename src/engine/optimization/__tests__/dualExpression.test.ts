// ═══════════════════════════════════════════════
// E2 — Dual Expression Gate tests
//
// 1. Full ctx (M1+M2+M3+gap+E1) produces both expressions, mechanisms
//    align, and the architectural sentence becomes the next_step on
//    the resulting ActionCard.
// 2. Only gapEngine present (M1, M2, M3 all missing) → expressDual
//    returns null. The integration card falls back to E2 watch.
// 3. Architectural and metric mechanisms diverge (gap=ctr but
//    forecast=act forces falsifier=spend_velocity) → null.
// 4. Validator: a metric sentence stripped of every digit is rejected
//    by hasNumber, demonstrating the contract.
// 5. Validator: an architectural sentence with no action verb is
//    rejected by hasActionVerb, demonstrating the contract.
// 6. Valid dual: eta_minutes is consistent with the metric — the
//    metric sentence carries the same window_days that drove the
//    falsifier, and the resulting card uses the canonical eta for
//    its signal.
// 7. Sanity: when E2 returns null inside generateReflectiveAction
//    the resulting card carries the dedicated dual-missing why and
//    inert falsifier fields.
// ═══════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  expressDual,
  hasActionVerb,
  hasNumber,
  hasMetricName,
  wordCount,
} from "../dualExpression";
import {
  generateReflectiveAction,
  type ReflectiveContext,
} from "../reflectiveAction";
import type { FunnelResult } from "@/types/funnel";
import type { KpiGap } from "@/types/meta";
import type { RegimeOutput } from "../regimeDetector";
import type { AnomalyOutput } from "../biomimeticAnomaly";
import type { ForecastOutput } from "../extremeForecaster";

// ───────────────────────────────────────────────
// Fixtures
// ───────────────────────────────────────────────

const funnelStub = {
  id: "test",
  funnelName: { he: "", en: "" },
  stages: [],
  totalBudget: { min: 0, max: 0 },
  overallTips: [],
  hookTips: [],
  copyLab: {},
  kpis: [],
  createdAt: "",
  formData: {},
} as unknown as FunnelResult;

const ctrCriticalGap: KpiGap = {
  kpiName: { he: "ctr", en: "ctr" },
  targetMin: 1.5,
  targetMax: 3,
  unit: "%",
  actual: 0.4,
  gapPercent: -73,
  status: "critical",
};

const cplCriticalGap: KpiGap = {
  kpiName: { he: "cpl", en: "cpl" },
  targetMin: 25,
  targetMax: 60,
  unit: "₪",
  actual: 90,
  gapPercent: 50,
  status: "critical",
};

const stableRegime: RegimeOutput = {
  state: "stable",
  confidence: 0.9,
  reason: "המערכת יציבה",
  since: 0,
};

const transitionalRegime: RegimeOutput = {
  state: "transitional",
  confidence: 0.7,
  reason: "מגמת שינוי",
  since: 0,
};

const calmAnomaly: AnomalyOutput = {
  score: 0.1,
  isAnomaly: false,
  layers: { threshold: 0, predictive: 0, novelty: 0 },
  explain: "",
};

const clearForecast: ForecastOutput = {
  collapse_probability: 0.1,
  horizon_days: 3,
  signal: "clear",
  drivers: [],
};

const actForecast: ForecastOutput = {
  collapse_probability: 0.85,
  horizon_days: 3,
  signal: "act",
  drivers: ["קצב הוצאה מואץ"],
};

// ───────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────

describe("E2 — Dual Expression Gate", () => {
  it("1. full ctx with critical CPL gap + transitional regime produces both expressions", () => {
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [cplCriticalGap],
      regime: transitionalRegime,
      anomaly: calmAnomaly,
      forecast: clearForecast,
    };
    const dual = expressDual(ctx, "next");
    expect(dual).not.toBeNull();
    if (dual === null) return;

    // Architectural side passes the action-verb rule and the word cap.
    expect(hasActionVerb(dual.architectural)).toBe(true);
    expect(wordCount(dual.architectural)).toBeLessThanOrEqual(12);

    // Metric side carries a number, the literal CPL label, and a window.
    expect(hasNumber(dual.metric)).toBe(true);
    expect(dual.metric).toContain("CPL");
    expect(dual.metric).toContain("ימים");
    expect(wordCount(dual.metric)).toBeLessThanOrEqual(16);

    // Integration: the card uses the architectural sentence as next_step
    // and stores the metric sentence as metric_expression.
    const card = generateReflectiveAction(ctx);
    expect(card.signal).toBe("act");
    expect(card.next_step).toBe(dual.architectural);
    expect(card.metric_expression).toBe(dual.metric);
  });

  it("2. only gapEngine present (no regime / anomaly / forecast) → null", () => {
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [ctrCriticalGap],
      // regime, anomaly, forecast all omitted
    };
    const dual = expressDual(ctx, "next");
    expect(dual).toBeNull();

    // Integration: M4 coherence gate fires first because no votes are
    // present (coherence = 0.5 < 0.6), so the card is the M4 watch.
    // E2 never runs in this branch — the assertion is that the card
    // does not carry a metric_expression.
    const card = generateReflectiveAction(ctx);
    expect(card.signal).toBe("watch");
    expect(card.metric_expression).toBeUndefined();
    expect(card.falsifier_metric).toBe("none");
  });

  it("3. divergent mechanisms (critical CTR gap + forecast=act) → null", () => {
    // forecast=act drives the falsifier to spend_velocity (pacing),
    // but the critical CTR gap drives the architectural mechanism to
    // creative. The two substrates point at different mechanisms, so
    // expressDual must reject the pair.
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [ctrCriticalGap],
      regime: stableRegime,
      anomaly: calmAnomaly,
      forecast: actForecast,
    };
    const dual = expressDual(ctx, "next");
    expect(dual).toBeNull();

    // Integration: the E2 watch fires inside generateReflectiveAction.
    const card = generateReflectiveAction(ctx);
    expect(card.signal).toBe("watch");
    expect(card.why).toContain("עמידה לתרגום");
    expect(card.falsifier_metric).toBe("none");
    expect(card.metric_expression).toBeUndefined();
  });

  it("4. validator: a metric sentence with no number is rejected", () => {
    expect(hasNumber("המדד צריך לעלות מעט")).toBe(false);
    expect(hasNumber("CTR צריך להיות מעל 1.5 בתוך 14 ימים")).toBe(true);

    // Metric label rule too: a sentence missing the literal label is
    // rejected even when it contains a number.
    expect(hasMetricName("המדד צריך להיות מעל 1.5 בתוך 14 ימים", "ctr")).toBe(
      false,
    );
    expect(hasMetricName("CTR צריך להיות מעל 1.5", "ctr")).toBe(true);
  });

  it("5. validator: an architectural sentence with no action verb is rejected", () => {
    expect(hasActionVerb("הקריאייטיב לא ממש מתחבר לקהל")).toBe(false);
    expect(hasActionVerb("פצל את הקריאייטיב לקהל ממוקד")).toBe(true);

    // Word-cap rule on the architectural side as a separate guard.
    const longSentence = "פצל את הקריאייטיב לקהל ממוקד יותר וגם לקהל נוסף ולקהל שלישי ולקהל רביעי וחמישי";
    expect(wordCount(longSentence)).toBeGreaterThan(12);
  });

  it("6. valid dual: eta_minutes is consistent with the metric window", () => {
    // forecast=act with no contradicting regime → falsifier window=7
    // (max(7, horizon=3) = 7). The metric sentence must carry that 7.
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [],
      regime: transitionalRegime,
      anomaly: calmAnomaly,
      forecast: actForecast,
    };
    const dual = expressDual(ctx, "next");
    expect(dual).not.toBeNull();
    if (dual === null) return;

    // Forecast act with non-stable regime → window 7.
    expect(dual.metric).toContain("בתוך 7 ימים");

    const card = generateReflectiveAction(ctx);
    // Canonical eta for act signal is 15 minutes/week saved — derived
    // from the falsifier (active short-window pacing recommendation).
    expect(card.signal).toBe("act");
    expect(card.eta_minutes).toBe(15);
    expect(card.falsification_window_days).toBe(7);
    // The metric sentence and the falsifier window must agree.
    expect(card.metric_expression).toContain("7");
  });

  it("7. integration: E2 watch fallback carries dual-missing why and inert falsifier", () => {
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [ctrCriticalGap],
      regime: stableRegime,
      anomaly: calmAnomaly,
      forecast: actForecast,
    };
    const card = generateReflectiveAction(ctx);
    expect(card.signal).toBe("watch");
    expect(card.headline).toBe("שיהוי החלטות");
    // Distinguish E2 text from E1 text.
    expect(card.why).toContain("עמידה לתרגום");
    expect(card.why).not.toContain("ניתנת להפרכה");
    // Inert falsifier on rejection.
    expect(card.falsifier_metric).toBe("none");
    expect(card.falsification_window_days).toBe(0);
    expect(card.metric_expression).toBeUndefined();
  });
});
