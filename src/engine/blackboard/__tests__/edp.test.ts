import { describe, it, expect } from "vitest";
import { computeV, computeC, detectCollapse, EDP_DEFAULTS } from "../edp";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function events(tss: number[], key = "AGENT-disc-1") {
  return tss.map((ts) => ({ ts, conceptKey: key }));
}

// ─────────────────────────────────────────────────────────────────────────────

describe("computeV (information arrival rate)", () => {
  it("returns 0 for empty stream", () => {
    expect(computeV([])).toBe(0);
  });

  it("returns 0 for single-event stream", () => {
    expect(computeV([{ ts: 100, conceptKey: "k" }])).toBe(0);
  });

  it("returns 0 when all events have identical timestamps", () => {
    expect(computeV(events([1000, 1000, 1000]))).toBe(0);
  });

  it("higher event frequency → higher V", () => {
    const fast = computeV(events([0, 10, 20, 30]));
    const slow = computeV(events([0, 100, 200, 300]));
    expect(fast).toBeGreaterThan(slow);
  });

  it("is tolerant of out-of-order inputs", () => {
    const sorted = computeV(events([0, 100, 200]));
    const shuffled = computeV(events([200, 0, 100]));
    expect(shuffled).toBeCloseTo(sorted, 8);
  });

  it("returns 1/meanDeltaMs for evenly-spaced events", () => {
    // 3 events, 200ms apart → meanDelta=200 → V=1/200=0.005
    const v = computeV(events([0, 200, 400]));
    expect(v).toBeCloseTo(0.005, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("computeC (structural complexity / Shannon entropy)", () => {
  it("returns 0 for empty stream", () => {
    expect(computeC([])).toBe(0);
  });

  it("returns 0 when all events share the same prefix", () => {
    const evs = [
      { conceptKey: "AGENT-disc-1" },
      { conceptKey: "AGENT-disc-2" },
      { conceptKey: "AGENT-disc-3" },
    ];
    expect(computeC(evs)).toBe(0);
  });

  it("returns log2(n) when n events all have distinct prefixes", () => {
    const evs = [
      { conceptKey: "A-x-1" },
      { conceptKey: "B-y-2" },
      { conceptKey: "C-z-3" },
      { conceptKey: "D-w-4" },
    ];
    // 4 equally-probable prefixes → H = log2(4) = 2
    expect(computeC(evs)).toBeCloseTo(2, 5);
  });

  it("is higher for more diverse prefix distribution", () => {
    const homogeneous = [
      { conceptKey: "SCOPE-type-1" },
      { conceptKey: "SCOPE-type-2" },
      { conceptKey: "SCOPE-type-3" },
    ];
    const diverse = [
      { conceptKey: "A-b-1" },
      { conceptKey: "C-d-2" },
      { conceptKey: "E-f-3" },
    ];
    expect(computeC(diverse)).toBeGreaterThanOrEqual(computeC(homogeneous));
  });

  it("uses first two dash-separated segments as prefix", () => {
    // "SCOPE-type-id1" and "SCOPE-type-id2" share prefix "SCOPE-type" → entropy=0
    const evs = [
      { conceptKey: "SCOPE-type-id1" },
      { conceptKey: "SCOPE-type-id2" },
    ];
    expect(computeC(evs)).toBe(0);
  });

  it("handles key with no dashes as its own prefix", () => {
    const evs = [{ conceptKey: "nodash" }, { conceptKey: "nodash" }];
    expect(computeC(evs)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("detectCollapse", () => {
  const { epsilon: ε, kappa: κ } = EDP_DEFAULTS;

  it("healthy when V ≥ ε AND C ≥ κ", () => {
    expect(detectCollapse(ε, κ)).toBe("healthy");
    expect(detectCollapse(ε + 1, κ + 1)).toBe("healthy");
  });

  it("v_collapse when V < ε AND C ≥ κ", () => {
    expect(detectCollapse(0, κ)).toBe("v_collapse");
    expect(detectCollapse(ε - 0.01, κ + 1)).toBe("v_collapse");
  });

  it("c_decoherence when V ≥ ε AND C < κ", () => {
    expect(detectCollapse(ε, 0)).toBe("c_decoherence");
    expect(detectCollapse(ε + 1, κ - 0.01)).toBe("c_decoherence");
  });

  it("both when V < ε AND C < κ", () => {
    expect(detectCollapse(0, 0)).toBe("both");
    expect(detectCollapse(ε - 0.01, κ - 0.01)).toBe("both");
  });

  it("accepts custom epsilon and kappa", () => {
    // With ε=0.5, κ=0.5: V=0.4 → v_collapse
    expect(detectCollapse(0.4, 0.6, 0.5, 0.5)).toBe("v_collapse");
  });

  it("EDP_DEFAULTS exports correct default thresholds", () => {
    expect(EDP_DEFAULTS.epsilon).toBe(0.05);
    expect(EDP_DEFAULTS.kappa).toBe(0.3);
  });
});
