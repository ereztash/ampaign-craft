import { describe, it, expect } from "vitest";
import { detectAnomaly, type AnomalyInput } from "../biomimeticAnomaly";

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function points(
  values: number[],
  startTs = 1_700_000_000_000,
  stepMs = 86_400_000,
): Array<{ ts: number; value: number }> {
  return values.map((value, i) => ({ ts: startTs + i * stepMs, value }));
}

function tsFor(i: number, startTs = 1_700_000_000_000, stepMs = 86_400_000): number {
  return startTs + i * stepMs;
}

// ───────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────

describe("detectAnomaly", () => {
  it("stable history + stable current point → not an anomaly", () => {
    const history = points([100, 102, 101, 99, 100, 101, 100, 102, 101, 100]);
    const input: AnomalyInput = {
      metric: "ctr",
      history,
      current: { ts: tsFor(10), value: 101 },
    };
    const out = detectAnomaly(input);
    expect(out.isAnomaly).toBe(false);
    expect(out.score).toBeLessThan(0.5);
  });

  it("sudden spike up → isAnomaly=true with high threshold layer", () => {
    const history = points([100, 102, 101, 99, 100, 101, 100, 102, 101, 100]);
    const input: AnomalyInput = {
      metric: "cpl",
      history,
      current: { ts: tsFor(10), value: 500 },
    };
    const out = detectAnomaly(input);
    expect(out.isAnomaly).toBe(true);
    expect(out.score).toBeGreaterThan(0.7);
    expect(out.layers.threshold).toBe(1);
  });

  it("sudden spike down → isAnomaly=true", () => {
    const history = points([100, 102, 101, 99, 100, 101, 100, 102, 101, 100]);
    const input: AnomalyInput = {
      metric: "cvr",
      history,
      current: { ts: tsFor(10), value: 1 },
    };
    const out = detectAnomaly(input);
    expect(out.isAnomaly).toBe(true);
    expect(out.layers.threshold).toBe(1);
  });

  it("gradual drift is caught by novelty even if it stays within rolling band", () => {
    // 14 stable points then a new outlier ~4x the centroid.
    const history = points([
      10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10,
    ]);
    const input: AnomalyInput = {
      metric: "spend",
      history,
      current: { ts: tsFor(14), value: 40 },
    };
    const out = detectAnomaly(input);
    expect(out.isAnomaly).toBe(true);
    expect(out.layers.novelty).toBeGreaterThan(0);
  });

  it("novel pattern against near-zero history is flagged", () => {
    const history = points([0.1, 0.1, 0.1, 0.1, 0.1]);
    const input: AnomalyInput = {
      metric: "cvr",
      history,
      current: { ts: tsFor(5), value: 5 },
    };
    const out = detectAnomaly(input);
    expect(out.isAnomaly).toBe(true);
    expect(out.score).toBeGreaterThan(0.7);
  });

  it("insufficient history returns neutral non-anomaly", () => {
    const input: AnomalyInput = {
      metric: "ctr",
      history: points([100, 101]),
      current: { ts: tsFor(2), value: 500 },
    };
    const out = detectAnomaly(input);
    expect(out.isAnomaly).toBe(false);
    expect(out.score).toBe(0);
    expect(out.explain).toContain("היסטוריה");
  });

  it("explain string reflects the dominant layer when anomalous", () => {
    const history = points([100, 102, 101, 99, 100, 101, 100, 102, 101, 100]);
    const input: AnomalyInput = {
      metric: "ctr",
      history,
      current: { ts: tsFor(10), value: 500 },
    };
    const out = detectAnomaly(input);
    expect(out.isAnomaly).toBe(true);
    // Hebrew explain string is non-empty and mentions one of the dominant concepts.
    expect(out.explain.length).toBeGreaterThan(0);
    expect(
      out.explain.includes("חריגה") ||
        out.explain.includes("פער") ||
        out.explain.includes("דפוס"),
    ).toBe(true);
  });
});
