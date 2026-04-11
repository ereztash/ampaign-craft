// ═══════════════════════════════════════════════
// E4 / M7 — Stage Spectrum Engine tests
//
// 1. Twenty writes evenly distributed → concentration below the
//    threshold, cascade NOT blocked.
// 2. 16/2/2 concentration at discover → blocked at discover.
// 3. Zero writes → sample_size=0, cascade_blocked=false, the engine
//    does not intervene (no override on next_step).
// 4. Block at process → engine is forced to emit a next_step that
//    moves from process to deploy.
// 5. Rapid state change → calling computeStageDistribution again on
//    a different write set yields a fresh concentration.
// 6. Integration: a ReflectiveContext with a blocked stage_spectrum
//    produces an ActionCard whose next_step names both the blocked
//    stage and the next stage in the cascade.
// 7. Block at deploy → no downstream stage exists, engine emits the
//    dedicated E4 watch and leaves the falsifier inert.
// ═══════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  computeStageDistribution,
  nextStageInCascade,
  CASCADE_THRESHOLD,
  type StageDistribution,
} from "../stageSpectrum";
import {
  generateReflectiveAction,
  type ReflectiveContext,
} from "../reflectiveAction";
import type { BlackboardWrite } from "../ontologicalVerifier";
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

const cplCriticalGap: KpiGap = {
  kpiName: { he: "cpl", en: "cpl" },
  targetMin: 25,
  targetMax: 60,
  unit: "₪",
  actual: 90,
  gapPercent: 50,
  status: "critical",
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

function write(stage: BlackboardWrite["stage"], key: string): BlackboardWrite {
  return {
    concept_key: `CAMPAIGN-${key}`,
    stage,
    payload: { created_at: Date.now() },
  };
}

function fillWrites(
  counts: { discover: number; process: number; deploy: number },
): BlackboardWrite[] {
  const out: BlackboardWrite[] = [];
  for (let i = 0; i < counts.discover; i += 1) out.push(write("discover", `d${i}`));
  for (let i = 0; i < counts.process; i += 1) out.push(write("process", `p${i}`));
  for (let i = 0; i < counts.deploy; i += 1) out.push(write("deploy", `x${i}`));
  return out;
}

// Manual stage_spectrum fixture used by the integration tests — lets
// us bypass the async fetch surface entirely.
function stubSpectrum(
  overrides: Partial<StageDistribution>,
): StageDistribution {
  return {
    discover: 0,
    process: 0,
    deploy: 0,
    concentration: 0,
    blocked_stage: null,
    cascade_blocked: false,
    sample_size: 0,
    ...overrides,
  };
}

// Baseline ctx that passes every prior gate (freshness skipped,
// coherence 0.67, falsifier from the critical CPL gap, dual valid
// with cost mechanism).
function baselineCtx(): ReflectiveContext {
  return {
    funnel: funnelStub,
    gaps: [cplCriticalGap],
    regime: transitionalRegime,
    anomaly: calmAnomaly,
    forecast: clearForecast,
  };
}

// ───────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────

describe("E4 — Stage Spectrum", () => {
  it("1. twenty writes spread across stages keep concentration below the threshold", () => {
    // 7/7/6 — evenly distributed, max = 7/20 = 0.35 < 0.7
    const writes = fillWrites({ discover: 7, process: 7, deploy: 6 });
    const dist = computeStageDistribution(writes);

    expect(dist.sample_size).toBe(20);
    expect(dist.concentration).toBeLessThan(CASCADE_THRESHOLD);
    expect(dist.cascade_blocked).toBe(false);
    expect(dist.blocked_stage).toBeNull();
  });

  it("2. 16/2/2 concentration at discover yields cascade_blocked at discover", () => {
    const writes = fillWrites({ discover: 16, process: 2, deploy: 2 });
    const dist = computeStageDistribution(writes);

    expect(dist.sample_size).toBe(20);
    expect(dist.concentration).toBeCloseTo(0.8);
    expect(dist.cascade_blocked).toBe(true);
    expect(dist.blocked_stage).toBe("discover");
  });

  it("3. zero writes → empty distribution, engine does not intervene", () => {
    const dist = computeStageDistribution([]);
    expect(dist.sample_size).toBe(0);
    expect(dist.concentration).toBe(0);
    expect(dist.cascade_blocked).toBe(false);
    expect(dist.blocked_stage).toBeNull();

    // Integration: attaching the empty distribution to ctx must not
    // change the engine's behavior. The baseline ctx would otherwise
    // produce an act card via the dual expression path.
    const ctxNoSpectrum = baselineCtx();
    const ctxEmptySpectrum: ReflectiveContext = {
      ...baselineCtx(),
      stage_spectrum: dist,
    };
    const cardA = generateReflectiveAction(ctxNoSpectrum);
    const cardB = generateReflectiveAction(ctxEmptySpectrum);
    expect(cardA.signal).toBe(cardB.signal);
    expect(cardA.next_step).toBe(cardB.next_step);
    expect(cardA.metric_expression).toBe(cardB.metric_expression);
  });

  it("4. block at process forces a movement recommendation into deploy", () => {
    // 3 discover, 15 process, 2 deploy → concentration 0.75 at process
    const writes = fillWrites({ discover: 3, process: 15, deploy: 2 });
    const dist = computeStageDistribution(writes);
    expect(dist.cascade_blocked).toBe(true);
    expect(dist.blocked_stage).toBe("process");

    expect(nextStageInCascade("process")).toBe("deploy");

    const ctx: ReflectiveContext = {
      ...baselineCtx(),
      stage_spectrum: dist,
    };
    const card = generateReflectiveAction(ctx);
    // Still an act card — the cascade override transforms, not blocks.
    expect(card.signal).toBe("act");
    // The movement next_step must name both the source and the target.
    expect(card.next_step).toContain("process");
    expect(card.next_step).toContain("deploy");
  });

  it("5. rapid state change: a fresh call yields a fresh concentration", () => {
    const first = computeStageDistribution(
      fillWrites({ discover: 16, process: 2, deploy: 2 }),
    );
    expect(first.blocked_stage).toBe("discover");
    expect(first.cascade_blocked).toBe(true);

    // The next tick the load moves — now most writes hit deploy.
    const second = computeStageDistribution(
      fillWrites({ discover: 2, process: 2, deploy: 16 }),
    );
    expect(second.blocked_stage).toBe("deploy");
    expect(second.cascade_blocked).toBe(true);

    // Concentrations are computed fresh, not carried over.
    expect(second.discover).toBe(2);
    expect(first.deploy).toBe(2);
    expect(first.concentration).toBeCloseTo(0.8);
    expect(second.concentration).toBeCloseTo(0.8);
  });

  it("6. integration: blocked stage_spectrum builds a next_step that names both stages", () => {
    const ctx: ReflectiveContext = {
      ...baselineCtx(),
      stage_spectrum: stubSpectrum({
        discover: 15,
        process: 3,
        deploy: 2,
        concentration: 0.75,
        cascade_blocked: true,
        blocked_stage: "discover",
        sample_size: 20,
      }),
    };
    const card = generateReflectiveAction(ctx);

    expect(card.signal).toBe("act");
    expect(card.next_step).toContain("discover");
    expect(card.next_step).toContain("process");
    // The movement sentence uses an allowed action verb from the
    // dualExpression set so it stays compatible with E2's validators.
    expect(card.next_step).toMatch(/העבר|הזז/);
    // The underlying falsifier stays active (this is an override of
    // next_step only, not a watch fallback).
    expect(card.falsifier_metric).not.toBe("none");
  });

  it("7. block at deploy has no downstream stage → E4 watch fires", () => {
    const ctx: ReflectiveContext = {
      ...baselineCtx(),
      stage_spectrum: stubSpectrum({
        discover: 2,
        process: 2,
        deploy: 16,
        concentration: 0.8,
        cascade_blocked: true,
        blocked_stage: "deploy",
        sample_size: 20,
      }),
    };
    const card = generateReflectiveAction(ctx);

    expect(card.signal).toBe("watch");
    expect(card.headline).toBe("שיהוי החלטות");
    // Dedicated E4 text that mentions both the stage and the bottleneck term.
    expect(card.why).toContain("deploy");
    expect(card.why).toContain("צוואר הבקבוק");
    // Must be distinguishable from E1/E2/E3 watch texts.
    expect(card.why).not.toContain("ניתנת להפרכה");
    expect(card.why).not.toContain("עמידה לתרגום");
    expect(card.why).not.toContain("ישן");
    // Inert falsifier on the fallback.
    expect(card.falsifier_metric).toBe("none");
    expect(card.metric_expression).toBeUndefined();
  });
});
