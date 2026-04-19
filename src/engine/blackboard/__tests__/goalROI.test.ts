import { describe, it, expect } from "vitest";
import {
  computeReadiness,
  DEFAULT_WEIGHTS,
  DEFAULT_THRESHOLD,
} from "../goalROI";

const perfect = { efficiency: 1, speed: 1, accuracy: 1, understanding: 1 };
const zero    = { efficiency: 0, speed: 0, accuracy: 0, understanding: 0 };

describe("computeReadiness", () => {
  // ── basic score correctness ──────────────────────

  it("returns score=1 for all-1 input", () => {
    const res = computeReadiness(perfect);
    expect(res.score).toBeCloseTo(1, 5);
    expect(res.shouldStop).toBe(true);
  });

  it("returns score=0 for all-0 input", () => {
    const res = computeReadiness(zero);
    expect(res.score).toBe(0);
    expect(res.shouldStop).toBe(false);
  });

  it("computes score as weighted sum using DEFAULT_WEIGHTS", () => {
    const input = { efficiency: 0.8, speed: 0.6, accuracy: 0.9, understanding: 0.7 };
    const expected =
      0.8 * DEFAULT_WEIGHTS.efficiency +
      0.6 * DEFAULT_WEIGHTS.speed +
      0.9 * DEFAULT_WEIGHTS.accuracy +
      0.7 * DEFAULT_WEIGHTS.understanding;
    expect(computeReadiness(input).score).toBeCloseTo(expected, 8);
  });

  it("breakdown values sum to the total score", () => {
    const res = computeReadiness({ efficiency: 0.5, speed: 0.6, accuracy: 0.7, understanding: 0.8 });
    const sum = Object.values(res.breakdown).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(res.score, 8);
  });

  // ── shouldStop threshold ─────────────────────────

  it("shouldStop=false when score < DEFAULT_THRESHOLD (0.75)", () => {
    // All inputs at 0.5 → score = 0.5 < 0.75
    const res = computeReadiness({ efficiency: 0.5, speed: 0.5, accuracy: 0.5, understanding: 0.5 });
    expect(res.shouldStop).toBe(false);
  });

  it("shouldStop=true when score === threshold (boundary)", () => {
    // Solve: score = 0.75 exactly with custom weights
    const weights = { efficiency: 0.25, speed: 0.25, accuracy: 0.25, understanding: 0.25 };
    const res = computeReadiness(
      { efficiency: 0.75, speed: 0.75, accuracy: 0.75, understanding: 0.75 },
      weights,
      0.75,
    );
    expect(res.score).toBeCloseTo(0.75, 5);
    expect(res.shouldStop).toBe(true);
  });

  it("respects custom threshold", () => {
    // threshold=0.5, score=0.6 → shouldStop
    const res = computeReadiness(
      { efficiency: 0.6, speed: 0.6, accuracy: 0.6, understanding: 0.6 },
      DEFAULT_WEIGHTS,
      0.5,
    );
    expect(res.shouldStop).toBe(true);
  });

  // ── clamping ─────────────────────────────────────

  it("clamps values above 1 to 1", () => {
    const res = computeReadiness({ efficiency: 2, speed: 2, accuracy: 2, understanding: 2 });
    expect(res.score).toBeCloseTo(1, 5);
  });

  it("clamps negative values to 0", () => {
    const res = computeReadiness({ efficiency: -5, speed: -1, accuracy: -0.1, understanding: -100 });
    expect(res.score).toBe(0);
  });

  it("clamps NaN to 0", () => {
    const res = computeReadiness({ efficiency: NaN, speed: 1, accuracy: 1, understanding: 1 });
    expect(res.breakdown.efficiency).toBe(0);
  });

  // ── weight validation ────────────────────────────

  it("throws when custom weights do not sum to 1", () => {
    const badWeights = { efficiency: 0.3, speed: 0.3, accuracy: 0.3, understanding: 0.3 };
    expect(() => computeReadiness(perfect, badWeights)).toThrow(/weights must sum to 1/);
  });

  it("DEFAULT_WEIGHTS sum to exactly 1", () => {
    const sum =
      DEFAULT_WEIGHTS.efficiency +
      DEFAULT_WEIGHTS.speed +
      DEFAULT_WEIGHTS.accuracy +
      DEFAULT_WEIGHTS.understanding;
    expect(sum).toBeCloseTo(1, 10);
  });

  it("DEFAULT_THRESHOLD is 0.75", () => {
    expect(DEFAULT_THRESHOLD).toBe(0.75);
  });
});
