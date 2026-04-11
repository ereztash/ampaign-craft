// ═══════════════════════════════════════════════
// E5 — Anomaly Type Classifier tests
//
// 1. One layer above HIGH, others low → noise.
// 2. Three layers above HIGH with last-5d volatility escalating past
//    the prior-14d volatility → pathological.
// 3. threshold + novelty high, predictive below LOW → emergent.
// 4. Emergent classification sets feeds_regime_hint=true.
// 5. History shorter than the 10-point minimum → noise with low
//    confidence and the fixed "history too short" reason.
// 6. Integration: a ctx whose anomaly_classification is emergent
//    forces generateReflectiveAction into the measurement watch
//    regardless of how strong the would-be act card is.
// 7. Integration: a ctx classified as pathological still produces
//    an act card — the classifier does not block the standard flow.
// 8. Three high layers without escalating volatility → noise
//    (belt-and-suspenders for the volatility guard).
// ═══════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { classifyAnomaly } from "../biomimeticAnomalyType";
import {
  generateReflectiveAction,
  type ReflectiveContext,
} from "../reflectiveAction";
import type { AnomalyOutput } from "../biomimeticAnomaly";
import type { FunnelResult } from "@/types/funnel";
import type { KpiGap } from "@/types/meta";
import type { RegimeOutput } from "../regimeDetector";
import type { ForecastOutput } from "../extremeForecaster";

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

/**
 * Build a synthetic history of `n` points with values drawn from
 * a simple pattern. `noisy` controls whether the last 5 points get
 * a volatility jump, which is what the classifier uses to detect
 * escalating chaos.
 */
function buildHistory(n: number, noisy: boolean): Array<{ ts: number; value: number }> {
  const out: Array<{ ts: number; value: number }> = [];
  // Prior points are stable around 10 with low jitter.
  const priorCount = Math.max(0, n - 5);
  for (let i = 0; i < priorCount; i += 1) {
    out.push({ ts: i, value: 10 + (i % 2) * 0.1 });
  }
  // Last 5 points — either stable or wild.
  if (noisy) {
    const wild = [25, 4, 30, 2, 28];
    for (let i = 0; i < 5 && out.length < n; i += 1) {
      out.push({ ts: priorCount + i, value: wild[i] });
    }
  } else {
    for (let i = 0; i < 5 && out.length < n; i += 1) {
      out.push({ ts: priorCount + i, value: 10 + (i % 2) * 0.1 });
    }
  }
  return out.slice(0, n);
}

function anomaly(
  threshold: number,
  predictive: number,
  novelty: number,
): AnomalyOutput {
  // The aggregate score is what biomimeticAnomaly would compute.
  // It does not affect classification (the classifier only reads
  // `layers`), but we keep it realistic.
  const score = 0.4 * threshold + 0.3 * predictive + 0.3 * novelty;
  return {
    score,
    isAnomaly: score > 0.7,
    layers: { threshold, predictive, novelty },
    explain: "",
  };
}

// ───────────────────────────────────────────────
// Fixtures for integration tests
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

const transitionalRegime: RegimeOutput = {
  state: "transitional",
  confidence: 0.7,
  reason: "מגמת שינוי",
  since: 0,
};

const clearForecast: ForecastOutput = {
  collapse_probability: 0.1,
  horizon_days: 3,
  signal: "clear",
  drivers: [],
};

// Base ctx that normally produces a solid act card (critical gap +
// anomaly + transitional regime).
function baselineCtx(): ReflectiveContext {
  return {
    funnel: funnelStub,
    gaps: [ctrCriticalGap],
    regime: transitionalRegime,
    anomaly: anomaly(0.9, 0.8, 0.8),
    forecast: clearForecast,
  };
}

// ───────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────

describe("E5 — Anomaly Type Classifier", () => {
  it("1. single layer high → noise", () => {
    const out = classifyAnomaly(
      anomaly(0.9, 0.2, 0.2),
      buildHistory(20, false),
    );
    expect(out.type).toBe("noise");
    expect(out.feeds_regime_hint).toBe(false);
    expect(out.reason).toContain("שכבה");
    expect(out.confidence).toBeGreaterThan(0);
    expect(out.confidence).toBeLessThanOrEqual(1);
  });

  it("2. three layers high + escalating volatility → pathological", () => {
    const out = classifyAnomaly(
      anomaly(0.8, 0.7, 0.75),
      buildHistory(20, true),
    );
    expect(out.type).toBe("pathological");
    expect(out.feeds_regime_hint).toBe(false);
    expect(out.reason).toContain("כאוס");
    expect(out.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("3. threshold + novelty high, predictive low → emergent", () => {
    const out = classifyAnomaly(
      anomaly(0.85, 0.15, 0.8),
      buildHistory(20, false),
    );
    expect(out.type).toBe("emergent");
    expect(out.reason).toContain("עקביות");
  });

  it("4. emergent classification sets feeds_regime_hint=true", () => {
    const out = classifyAnomaly(
      anomaly(0.85, 0.15, 0.8),
      buildHistory(20, false),
    );
    expect(out.type).toBe("emergent");
    expect(out.feeds_regime_hint).toBe(true);
  });

  it("5. short history → noise with low confidence and fixed reason", () => {
    const out = classifyAnomaly(
      anomaly(0.85, 0.15, 0.8), // would be emergent under long history
      buildHistory(5, false),
    );
    expect(out.type).toBe("noise");
    expect(out.confidence).toBeLessThanOrEqual(0.25);
    expect(out.reason).toBe("היסטוריה קצרה מדי לסיווג");
    expect(out.feeds_regime_hint).toBe(false);
  });

  it("6. integration: emergent classification forces the measurement watch", () => {
    // The baseline ctx would produce a strong act card (critical
    // CTR gap + hot anomaly). Attach an emergent classification and
    // the engine must suppress the act signal.
    const ctx: ReflectiveContext = {
      ...baselineCtx(),
      anomaly_classification: {
        type: "emergent",
        confidence: 0.75,
        reason: "שכבות סף וחידוש גבוהות עם עקביות פנימית",
        feeds_regime_hint: true,
      },
    };
    const card = generateReflectiveAction(ctx);

    expect(card.signal).toBe("watch");
    expect(card.headline).toBe("שיהוי החלטות");
    // Dedicated E5 text — distinguish from E1/E2/E3/E4 watches.
    expect(card.why).toContain("משטר חדש");
    expect(card.why).toContain("מודד");
    expect(card.why).not.toContain("ניתנת להפרכה");
    expect(card.why).not.toContain("עמידה לתרגום");
    expect(card.why).not.toContain("ישן");
    expect(card.why).not.toContain("צוואר הבקבוק");
    // next_step is a measurement, not a fix.
    expect(card.next_step).toContain("מדידה");
    expect(card.next_step).toContain("המשטר המתהווה");
    // Falsifier is inert on the watch fallback.
    expect(card.falsifier_metric).toBe("none");
  });

  it("7. integration: pathological classification does NOT block the act flow", () => {
    const ctx: ReflectiveContext = {
      ...baselineCtx(),
      anomaly_classification: {
        type: "pathological",
        confidence: 0.9,
        reason: "שלוש שכבות גבוהות וכאוס מתגבר",
        feeds_regime_hint: false,
      },
    };
    const card = generateReflectiveAction(ctx);

    // Pathological is the normal high-urgency case — the classifier
    // is pass-through for this type.
    expect(card.signal).toBe("act");
    expect(card.falsifier_metric).not.toBe("none");
    // Not the measurement watch.
    expect(card.why).not.toContain("משטר חדש");
    expect(card.next_step).not.toContain("מדידה");
  });

  it("8. three layers high without escalating volatility → noise fallback", () => {
    // Same layers as test 2 but a calm history — volatility does NOT
    // escalate, so the pathological classification cannot fire.
    const out = classifyAnomaly(
      anomaly(0.8, 0.7, 0.75),
      buildHistory(20, false),
    );
    expect(out.type).toBe("noise");
    expect(out.reason).toContain("ללא הסלמה");
    expect(out.feeds_regime_hint).toBe(false);
  });
});
