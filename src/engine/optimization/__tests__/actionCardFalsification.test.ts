// ═══════════════════════════════════════════════
// E1 — ActionCard Falsification Contract tests
//
// Verifies that every ActionCard returned by generateReflectiveAction
// carries the four falsifier fields, and that the new gate behaves as
// specified for the six required cases:
//
//   1. Happy path — falsifier produced from real drivers.
//   2. M3 missing + unparseable gap → E1 watch with falsifier-missing why.
//   3. Pristine stable → eta=0, inert falsifier, signal stays stable.
//   4. coherence_score < 0.6 → M4 watch wins; falsifier inert.
//   5. Contradictory drivers (forecast=act, regime=stable) → shorter window.
//   6. Snapshot of buildReflectiveActionPayload output.
//   7. Backward-compat assert: low-coherence path also carries inert
//      falsifier fields, no field is `undefined`.
// ═══════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  generateReflectiveAction,
  buildReflectiveActionPayload,
  type ActionCard,
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

const bounceWarningGap: KpiGap = {
  kpiName: { he: "שיעור נטישה", en: "bounce_rate" },
  targetMin: 30,
  targetMax: 50,
  unit: "%",
  actual: 65,
  gapPercent: 30,
  status: "warning",
};

const stableRegime: RegimeOutput = {
  state: "stable",
  confidence: 0.9,
  reason: "המערכת יציבה",
  since: 0,
};

const crisisRegime: RegimeOutput = {
  state: "crisis",
  confidence: 0.95,
  reason: "עלייה חדה ב-CPL",
  since: 0,
};

const calmAnomaly: AnomalyOutput = {
  score: 0.1,
  isAnomaly: false,
  layers: { threshold: 0, predictive: 0, novelty: 0 },
  explain: "",
};

const hotAnomalyThresholdDominant: AnomalyOutput = {
  score: 0.9,
  isAnomaly: true,
  layers: { threshold: 1, predictive: 0.4, novelty: 0.3 },
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

describe("E1 — ActionCard Falsification Contract", () => {
  it("1. happy path: crisis regime + critical CTR gap yields an active falsifier", () => {
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [ctrCriticalGap],
      regime: crisisRegime,
      anomaly: calmAnomaly,
      forecast: clearForecast,
    };
    const card = generateReflectiveAction(ctx);

    expect(card.signal).toBe("act");
    // Critical gap path picked before regime, so the metric is CTR.
    expect(card.falsifier_metric).toBe("ctr");
    expect(card.falsifier_direction).toBe("above");
    expect(card.falsifier_threshold).toBe(ctrCriticalGap.targetMin);
    expect(card.falsification_window_days).toBe(14);
    // Why must be the M4 architectural text, not the E1 fallback.
    expect(card.why).not.toContain("ניתנת להפרכה");
  });

  it("2. M3 missing + only an unparseable warning gap → E1 watch with falsifier-missing why", () => {
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [bounceWarningGap],
      regime: stableRegime,
      anomaly: calmAnomaly,
      // forecast intentionally omitted
    };
    const card = generateReflectiveAction(ctx);

    expect(card.signal).toBe("watch");
    expect(card.headline).toBe("שיהוי החלטות");
    expect(card.why).toContain("ניתנת להפרכה");
    expect(card.falsifier_metric).toBe("none");
    expect(card.falsification_window_days).toBe(0);
    expect(card.falsifier_threshold).toBe(0);
    expect(card.falsifier_direction).toBe("above");
  });

  it("3. pristine stable: all calm, no gaps → eta=0 and inert falsifier", () => {
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [],
      regime: stableRegime,
      anomaly: calmAnomaly,
      forecast: clearForecast,
    };
    const card = generateReflectiveAction(ctx);

    expect(card.signal).toBe("stable");
    expect(card.eta_minutes).toBe(0);
    expect(card.falsifier_metric).toBe("none");
    expect(card.falsification_window_days).toBe(0);
    expect(card.coherence_score).toBe(1);
  });

  it("4. coherence < 0.6: M4 watch wins over E1, falsifier stays inert", () => {
    // Two votes, one calm one trouble → coherence = 0.5 < 0.6
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [bounceWarningGap],
      regime: stableRegime,
      anomaly: hotAnomalyThresholdDominant,
    };
    const card = generateReflectiveAction(ctx);

    expect(card.coherence_score).toBeLessThan(0.6);
    expect(card.signal).toBe("watch");
    expect(card.headline).toBe("שיהוי החלטות");
    // M4 text, not E1 text — M4 gate took precedence.
    expect(card.why).toContain("המערכת");
    expect(card.why).not.toContain("ניתנת להפרכה");
    expect(card.falsifier_metric).toBe("none");
    expect(card.falsification_window_days).toBe(0);
  });

  it("5. contradictory drivers: forecast=act + regime=stable → shorter window", () => {
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [],
      regime: stableRegime,
      anomaly: calmAnomaly,
      forecast: actForecast,
    };
    const card = generateReflectiveAction(ctx);

    // Coherence: 2 calm + 1 trouble = max(2,1)/3 ≈ 0.67 — passes the M4 gate.
    expect(card.coherence_score).toBeGreaterThanOrEqual(0.6);
    expect(card.signal).toBe("act");
    expect(card.falsifier_metric).toBe("spend_velocity");
    expect(card.falsifier_direction).toBe("below");
    // Contradiction shortens the default 7-day forecast window.
    expect(card.falsification_window_days).toBeLessThan(7);
    expect(card.falsification_window_days).toBeGreaterThanOrEqual(3);

    // Sanity check: a non-contradicting forecast=act keeps the longer window.
    const noContradiction = generateReflectiveAction({
      ...ctx,
      regime: { ...crisisRegime },
    });
    expect(noContradiction.falsifier_metric).toBe("spend_velocity");
    expect(noContradiction.falsification_window_days).toBeGreaterThanOrEqual(7);
  });

  it("6. snapshot: buildReflectiveActionPayload produces the canonical TASK payload", () => {
    const card: ActionCard = {
      signal: "act",
      headline: "צוואר בקבוק",
      why: "שלב בפאנל מייצר חיכוך שמעכב מעבר הלאה",
      next_step: "אבחן את שלב החיכוך ותקן אותו בארכיטקטורה",
      eta_minutes: 15,
      coherence_score: 1,
      falsification_window_days: 14,
      falsifier_metric: "ctr",
      falsifier_threshold: 1.5,
      falsifier_direction: "above",
    };
    const ts = 1712836800000;
    const write = buildReflectiveActionPayload(card, "user-42", ts);

    expect(write).toEqual({
      concept_key: "TASK-reflective-action-user-42-1712836800000",
      stage: "process",
      payload: {
        created_at: ts,
        signal: "act",
        headline: "צוואר בקבוק",
        why: "שלב בפאנל מייצר חיכוך שמעכב מעבר הלאה",
        next_step: "אבחן את שלב החיכוך ותקן אותו בארכיטקטורה",
        eta_minutes: 15,
        coherence_score: 1,
        falsification_window_days: 14,
        falsifier_metric: "ctr",
        falsifier_threshold: 1.5,
        falsifier_direction: "above",
      },
    });
  });

  it("7. backward compat: every card carries all four falsifier fields, never undefined", () => {
    const minimalCtx: ReflectiveContext = { funnel: funnelStub, gaps: [] };
    const card = generateReflectiveAction(minimalCtx);

    // M4 watch path — must still expose falsifier fields with concrete values.
    expect(card.falsification_window_days).toBe(0);
    expect(card.falsifier_metric).toBe("none");
    expect(card.falsifier_threshold).toBe(0);
    expect(card.falsifier_direction).toBe("above");
    // Type guarantee: none of the four are undefined.
    expect(card.falsification_window_days).not.toBeUndefined();
    expect(card.falsifier_metric).not.toBeUndefined();
    expect(card.falsifier_threshold).not.toBeUndefined();
    expect(card.falsifier_direction).not.toBeUndefined();
  });
});
