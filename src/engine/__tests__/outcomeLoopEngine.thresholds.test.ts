// ═══════════════════════════════════════════════
// Threshold-locking tests — Loop 1: Pricing Validation
//
// Behavioral thresholds locked here (changing them breaks these tests):
//   miss_ratio: 0.20  — missRatio > 0.20 triggers training pair capture
//   horizon_days: 30  — pricing outcomes use a 30-day horizon
//
// See: README.md "If miss > 20% → negative training pair → prompt patch"
// ═══════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";
import { capturePricingOutcome } from "../outcomeLoopEngine";
import { captureOutcome, type OutcomeHorizon } from "../outcomeLoopEngine";

// ── Mocks (mirrors outcomeLoopEngine.test.ts setup) ──────────────────────────

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(<T>(_k: string, fallback: T): T => fallback),
    setJSON: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: vi.fn().mockResolvedValue({ error: null }) }),
  },
}));

const mockCaptureTrainingPair = vi.fn().mockResolvedValue(undefined);

vi.mock("../trainingDataEngine", () => ({
  captureTrainingPair: (...args: unknown[]) => mockCaptureTrainingPair(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── miss_ratio = 0.20 boundary ────────────────────────────────────────────────

describe("capturePricingOutcome — miss_ratio threshold 0.20", () => {
  it("miss of exactly 20.0% does NOT trigger training pair (threshold is > 0.20)", async () => {
    // recommended=100, actual=80 → |80-100|/100 = 0.20 exactly — not > 0.20
    await capturePricingOutcome("u1", 100, 80, "strategist", "tech");
    // Allow micro-tasks to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(mockCaptureTrainingPair).not.toHaveBeenCalled();
  });

  it("miss of 20.1% DOES trigger training pair", async () => {
    // recommended=1000, actual=799 → |799-1000|/1000 = 0.201 > 0.20
    await capturePricingOutcome("u1", 1000, 799, "strategist", "tech");
    await new Promise((r) => setTimeout(r, 10));
    expect(mockCaptureTrainingPair).toHaveBeenCalled();
  });

  it("large miss (50%) triggers training pair", async () => {
    // recommended=100, actual=50 → 50% miss > 0.20
    await capturePricingOutcome("u1", 100, 50, "connector", "services");
    await new Promise((r) => setTimeout(r, 10));
    expect(mockCaptureTrainingPair).toHaveBeenCalled();
  });

  it("miss of 19.9% does NOT trigger training pair", async () => {
    // recommended=1000, actual=801 → |801-1000|/1000 = 0.199 < 0.20
    await capturePricingOutcome("u1", 1000, 801, "pioneer", "education");
    await new Promise((r) => setTimeout(r, 0));
    expect(mockCaptureTrainingPair).not.toHaveBeenCalled();
  });

  it("zero miss does NOT trigger training pair", async () => {
    await capturePricingOutcome("u1", 100, 100, "closer", "health");
    await new Promise((r) => setTimeout(r, 0));
    expect(mockCaptureTrainingPair).not.toHaveBeenCalled();
  });
});

// ── horizon_days = 30 ─────────────────────────────────────────────────────────

describe("capturePricingOutcome — horizon_days: 30", () => {
  it("OutcomeHorizon type includes 30 as a valid value", () => {
    // Type-level assertion: 30 is a valid OutcomeHorizon
    const horizon: OutcomeHorizon = 30;
    expect(horizon).toBe(30);
  });

  it("captureOutcome accepts horizon_days of 30 without error", () => {
    expect(() =>
      captureOutcome("rec-1", "u1", "pricing_validated", 30, 500),
    ).not.toThrow();
  });
});
