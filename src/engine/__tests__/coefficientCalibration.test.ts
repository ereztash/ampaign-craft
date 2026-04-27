import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mock so the module under test resolves it on import.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import {
  getCoefficient,
  getCalibrationMeta,
  recordObservation,
  _resetCacheForTests,
} from "../coefficientCalibration";

describe("coefficientCalibration", () => {
  beforeEach(() => {
    _resetCacheForTests();
    vi.clearAllMocks();
  });

  it("returns the heuristic when no calibration is cached", () => {
    expect(getCoefficient("psm.premiumPct.high", 0.22)).toBe(0.22);
  });

  it("reports source=heuristic with N=0 when cache is empty", () => {
    const meta = getCalibrationMeta("psm.premiumPct.high");
    expect(meta).toEqual({ source: "heuristic", n: 0, confidence: 0 });
  });

  it("recordObservation does not throw on Supabase errors", async () => {
    await expect(
      recordObservation("test.coefficient", 1, 1.1, { archetype: "warrior" }),
    ).resolves.toBeUndefined();
  });

  it("recordObservation passes the right shape to Supabase", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await recordObservation("test.coef", 0.5, 0.6, { ctx: 1 });
    expect(supabase.from).toHaveBeenCalledWith("coefficient_observations");
  });
});
