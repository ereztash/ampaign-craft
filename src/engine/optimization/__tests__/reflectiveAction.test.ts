import { describe, it, expect } from "vitest";
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

// Minimal FunnelResult shim — the engine never reads most of its
// fields, so a typed cast through `unknown` is the narrowest route.
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

const goodGap: KpiGap = {
  kpiName: { he: "ctr", en: "ctr" },
  targetMin: 1,
  targetMax: 3,
  unit: "%",
  actual: 2,
  gapPercent: 0,
  status: "good",
};

const warningGap: KpiGap = { ...goodGap, status: "warning" };
const criticalGap: KpiGap = { ...goodGap, status: "critical" };

const stableRegime: RegimeOutput = {
  state: "stable",
  confidence: 0.9,
  reason: "",
  since: 0,
};
const transitionalRegime: RegimeOutput = {
  state: "transitional",
  confidence: 0.7,
  reason: "",
  since: 0,
};
const crisisRegime: RegimeOutput = {
  state: "crisis",
  confidence: 0.9,
  reason: "",
  since: 0,
};

const calmAnomaly: AnomalyOutput = {
  score: 0.1,
  isAnomaly: false,
  layers: { threshold: 0, predictive: 0, novelty: 0 },
  explain: "",
};
const hotAnomaly: AnomalyOutput = {
  score: 0.9,
  isAnomaly: true,
  layers: { threshold: 1, predictive: 0.8, novelty: 0.7 },
  explain: "",
};

const clearForecast: ForecastOutput = {
  collapse_probability: 0.1,
  horizon_days: 3,
  signal: "clear",
  drivers: [],
};
const watchForecast: ForecastOutput = {
  collapse_probability: 0.4,
  horizon_days: 3,
  signal: "watch",
  drivers: [],
};
const actForecast: ForecastOutput = {
  collapse_probability: 0.8,
  horizon_days: 3,
  signal: "act",
  drivers: [],
};

// ───────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────

describe("generateReflectiveAction", () => {
  it("low coherence: no optional inputs yields a watch card with fixed message", () => {
    const ctx: ReflectiveContext = { funnel: funnelStub, gaps: [] };
    const card = generateReflectiveAction(ctx);
    expect(card.signal).toBe("watch");
    expect(card.headline).toBe("שיהוי החלטות");
    expect(card.coherence_score).toBeLessThan(0.6);
    expect(card.next_step.length).toBeGreaterThan(0);
    expect(card.why).toContain("המערכת");
  });

  it("stable: all diagnostics calm and no gaps yields a stable 'natural' card", () => {
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [goodGap],
      regime: stableRegime,
      anomaly: calmAnomaly,
      forecast: clearForecast,
    };
    const card = generateReflectiveAction(ctx);
    expect(card.signal).toBe("stable");
    expect(card.headline).toBe("נתיב טבעי");
    expect(card.coherence_score).toBe(1);
    expect(card.eta_minutes).toBe(120);
  });

  it("act via critical gap: forces bottleneck headline", () => {
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [criticalGap],
      regime: stableRegime,
      anomaly: calmAnomaly,
      forecast: clearForecast,
    };
    const card = generateReflectiveAction(ctx);
    expect(card.signal).toBe("act");
    expect(card.headline).toBe("צוואר בקבוק");
    expect(card.eta_minutes).toBe(15);
  });

  it("act via anomaly: picks the normalization headline", () => {
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [],
      regime: stableRegime,
      anomaly: hotAnomaly,
      forecast: clearForecast,
    };
    const card = generateReflectiveAction(ctx);
    expect(card.signal).toBe("act");
    expect(card.headline).toBe("נורמליזציה של סטייה");
  });

  it("act via forecast: picks the tech-blocker headline", () => {
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [],
      regime: stableRegime,
      anomaly: calmAnomaly,
      forecast: actForecast,
    };
    const card = generateReflectiveAction(ctx);
    expect(card.signal).toBe("act");
    expect(card.headline).toBe("חוסם עורקים טכנולוגי");
  });

  it("watch via transitional regime: picks the natural-path headline", () => {
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [],
      regime: transitionalRegime,
      anomaly: calmAnomaly,
      forecast: clearForecast,
    };
    const card = generateReflectiveAction(ctx);
    expect(card.signal).toBe("watch");
    expect(card.headline).toBe("נתיב טבעי");
    expect(card.eta_minutes).toBe(45);
  });

  it("crisis regime maps to bottleneck headline", () => {
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [],
      regime: crisisRegime,
      anomaly: calmAnomaly,
      forecast: clearForecast,
    };
    const card = generateReflectiveAction(ctx);
    expect(card.signal).toBe("act");
    expect(card.headline).toBe("צוואר בקבוק");
  });

  it("contradictory optionals drop coherence below 0.6 and trigger the watch fallback", () => {
    // regime=stable, anomaly=isAnomaly=true → two votes, 1 calm 1 trouble
    // No forecast provided → coherence = 1/2 = 0.5 < 0.6
    const ctx: ReflectiveContext = {
      funnel: funnelStub,
      gaps: [warningGap],
      regime: stableRegime,
      anomaly: hotAnomaly,
    };
    const card = generateReflectiveAction(ctx);
    expect(card.coherence_score).toBeLessThan(0.6);
    expect(card.signal).toBe("watch");
    expect(card.headline).toBe("שיהוי החלטות");
  });
});
