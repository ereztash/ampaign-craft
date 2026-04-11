// ═══════════════════════════════════════════════
// E3 — Freshness Budget tests
//
// 1. All six components fresh inside the window → countFresh = 6,
//    freshnessGate passes.
// 2. Exactly three fresh, three stale → countFresh = 3, gate passes
//    (the threshold is inclusive).
// 3. Two fresh, four stale → countFresh = 2, gate fails. The integration
//    inside generateReflectiveAction returns the dedicated E3 watch.
// 4. Same ctx, two different window_min values → the count flips,
//    demonstrating that the env-controlled window is the only knob.
// 5. Backward compat: ctx without a freshness map bypasses the gate
//    (existing engine call sites are unaffected).
// ═══════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  countFresh,
  freshnessGate,
  DEFAULT_FRESH_WINDOW_MIN,
  MIN_FRESH_COMPONENTS,
} from "../freshnessBudget";
import {
  generateReflectiveAction,
  type ReflectiveContext,
} from "../reflectiveAction";
import type { FunnelResult } from "@/types/funnel";
import type { KpiGap } from "@/types/meta";

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

const goodGap: KpiGap = {
  kpiName: { he: "ctr", en: "ctr" },
  targetMin: 1,
  targetMax: 3,
  unit: "%",
  actual: 2,
  gapPercent: 0,
  status: "good",
};

const NOW = 1_712_836_800_000;
const MIN = 60 * 1000;

function ctxWithFreshness(
  ages: Partial<Record<
    "funnel" | "gaps" | "regime" | "anomaly" | "forecast" | "profile",
    number
  >>,
): ReflectiveContext {
  // For each component listed in `ages`, attach a freshness timestamp
  // computed as NOW - ageMinutes*60_000. Components not listed are
  // simply absent from the freshness map (counted as not fresh).
  const freshness: Record<string, number> = {};
  for (const [key, ageMin] of Object.entries(ages)) {
    if (typeof ageMin === "number") {
      freshness[key] = NOW - ageMin * MIN;
    }
  }
  return {
    funnel: funnelStub,
    gaps: [goodGap],
    freshness,
  };
}

// ───────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────

describe("E3 — Freshness Budget", () => {
  it("1. all six components fresh → countFresh = 6, gate passes", () => {
    const ctx = ctxWithFreshness({
      funnel: 1,
      gaps: 1,
      regime: 1,
      anomaly: 1,
      forecast: 1,
      profile: 1,
    });

    expect(countFresh(ctx, DEFAULT_FRESH_WINDOW_MIN, NOW)).toBe(6);
    // Direct call to countFresh using a known `now` proves the math
    // independently of the env reader.
    expect(countFresh(ctx, DEFAULT_FRESH_WINDOW_MIN, NOW)).toBeGreaterThanOrEqual(
      MIN_FRESH_COMPONENTS,
    );
  });

  it("2. exactly three components fresh → gate passes (inclusive threshold)", () => {
    const ctx = ctxWithFreshness({
      funnel: 1, // fresh
      gaps: 2, // fresh
      regime: 3, // fresh
      anomaly: 30, // stale (well outside default window)
      forecast: 60, // stale
      profile: 120, // stale
    });

    expect(countFresh(ctx, DEFAULT_FRESH_WINDOW_MIN, NOW)).toBe(3);
    // The gate is inclusive: >= 3 means pass.
    const passes = countFresh(ctx, DEFAULT_FRESH_WINDOW_MIN, NOW) >=
      MIN_FRESH_COMPONENTS;
    expect(passes).toBe(true);
  });

  it("3. only two components fresh → gate blocks; engine returns E3 watch", () => {
    const ctx = ctxWithFreshness({
      funnel: 1, // fresh
      gaps: 2, // fresh
      regime: 30, // stale
      anomaly: 45, // stale
      forecast: 60, // stale
      profile: 90, // stale
    });

    expect(countFresh(ctx, DEFAULT_FRESH_WINDOW_MIN, NOW)).toBe(2);

    // Integration with the engine: the gate blocks before any other
    // logic runs, so the resulting card carries the E3 watch text and
    // an inert falsifier.
    const card = generateReflectiveAction(ctx);
    expect(card.signal).toBe("watch");
    expect(card.headline).toBe("שיהוי החלטות");
    expect(card.why).toContain("ישן");
    expect(card.why).toContain("טרייה");
    // None of the downstream gates' texts must appear here.
    expect(card.why).not.toContain("ניתנת להפרכה");
    expect(card.why).not.toContain("עמידה לתרגום");
    expect(card.falsifier_metric).toBe("none");
    expect(card.falsification_window_days).toBe(0);
  });

  it("4. same ctx, two different windows → the count flips", () => {
    const ctx = ctxWithFreshness({
      funnel: 4, // fresh under any reasonable window
      gaps: 4,
      regime: 4,
      anomaly: 9, // borderline: fresh under 10-min, stale under 5-min
      forecast: 9,
      profile: 9,
    });

    // Wide window (12 minutes) sees all six as fresh.
    expect(countFresh(ctx, 12, NOW)).toBe(6);
    // Narrow window (5 minutes) sees only the first three.
    expect(countFresh(ctx, 5, NOW)).toBe(3);
    // Even narrower (2 minutes) sees zero.
    expect(countFresh(ctx, 2, NOW)).toBe(0);

    // The same ctx flips from passing to blocking purely from the
    // window value — the gate is window-driven, period.
    expect(countFresh(ctx, 12, NOW) >= MIN_FRESH_COMPONENTS).toBe(true);
    expect(countFresh(ctx, 2, NOW) >= MIN_FRESH_COMPONENTS).toBe(false);
  });

  it("5. backward compat: a ctx without a freshness map bypasses the gate", () => {
    // No freshness key at all. freshnessGate must return true so that
    // existing M4 / E1 / E2 callers (and the existing 64 tests) keep
    // working unchanged.
    const ctx: ReflectiveContext = { funnel: funnelStub, gaps: [goodGap] };
    expect(freshnessGate(ctx)).toBe(true);

    // Engine reaches the M4 coherence gate and returns the M4 watch
    // (because there are no diagnostics → coherence = 0.5 < 0.6),
    // not the E3 watch.
    const card = generateReflectiveAction(ctx);
    expect(card.signal).toBe("watch");
    expect(card.why).not.toContain("ישן");
    expect(card.why).toContain("המערכת");
  });
});
