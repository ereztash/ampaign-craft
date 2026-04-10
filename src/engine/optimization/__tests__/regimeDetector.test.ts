import { describe, it, expect } from "vitest";
import {
  detectRegime,
  type RegimeInput,
} from "../regimeDetector";

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function series(values: number[], startTs = 1_700_000_000_000, stepMs = 86_400_000): Array<{ ts: number; value: number }> {
  return values.map((value, i) => ({ ts: startTs + i * stepMs, value }));
}

// ───────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────

describe("detectRegime", () => {
  it("stable: flat metrics across 7 points return state='stable' with high confidence", () => {
    const inputs: RegimeInput[] = [
      { metric: "ctr", series: series([0.05, 0.051, 0.0505, 0.05, 0.0498, 0.0502, 0.0501]) },
      { metric: "cpc", series: series([1.0, 1.01, 0.99, 1.0, 1.005, 0.995, 1.0]) },
    ];
    const out = detectRegime(inputs);
    expect(out.state).toBe("stable");
    expect(out.confidence).toBeGreaterThan(0.8);
    expect(out.since).toBe(1_700_000_000_000);
  });

  it("transitional: a metric in the mid COV band returns state='transitional'", () => {
    // Build a series whose COV is ~0.23 (between 0.15 and 0.35)
    // mean = 1.0, std ≈ 0.23 → COV ≈ 0.23
    // Also: first-half mean ≈ second-half mean → no trend shift
    // Also: no CPL/CVR metric → no critical crisis
    const inputs: RegimeInput[] = [
      { metric: "ctr", series: series([1.0, 1.3, 0.7, 1.2, 0.8, 1.25, 0.75]) },
    ];
    const out = detectRegime(inputs);
    expect(out.state).toBe("transitional");
    expect(out.confidence).toBeGreaterThanOrEqual(0.5);
    expect(out.confidence).toBeLessThanOrEqual(0.8);
  });

  it("crisis via COV: a metric with very high volatility returns state='crisis'", () => {
    // COV > 0.35 on spend
    const inputs: RegimeInput[] = [
      { metric: "spend", series: series([100, 250, 50, 300, 80, 280, 60]) },
    ];
    const out = detectRegime(inputs);
    expect(out.state).toBe("crisis");
    expect(out.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("crisis via CPL rise: last3 mean > 1.25 * first4 mean returns state='crisis' with CPL reason", () => {
    // first4 mean ≈ 10, last3 mean ≈ 15 → ratio 1.5 > 1.25
    const inputs: RegimeInput[] = [
      { metric: "cpl", series: series([10, 10, 10, 10, 15, 15, 15]) },
    ];
    const out = detectRegime(inputs);
    expect(out.state).toBe("crisis");
    expect(out.reason).toContain("CPL");
  });

  it("crisis via CVR drop: last3 mean < 0.70 * first4 mean returns state='crisis' with CVR reason", () => {
    // first4 mean ≈ 0.1, last3 mean ≈ 0.05 → ratio 0.5 < 0.70
    const inputs: RegimeInput[] = [
      { metric: "cvr", series: series([0.1, 0.1, 0.1, 0.1, 0.05, 0.05, 0.05]) },
    ];
    const out = detectRegime(inputs);
    expect(out.state).toBe("crisis");
    expect(out.reason).toContain("CVR");
  });

  it("insufficient data: <3 points falls back to state='stable' with low confidence", () => {
    const inputs: RegimeInput[] = [
      { metric: "ctr", series: series([0.05, 0.051]) },
    ];
    const out = detectRegime(inputs);
    expect(out.state).toBe("stable");
    expect(out.confidence).toBeLessThanOrEqual(0.3);
    expect(out.reason).toContain("חסרים");
  });
});
