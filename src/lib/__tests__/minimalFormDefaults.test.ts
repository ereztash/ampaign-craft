import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock safeStorage
vi.mock("../safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn(),
    setJSON: vi.fn(),
    remove: vi.fn(),
  },
}));

import { getLatestPlanResult } from "../minimalFormDefaults";
import { safeStorage } from "../safeStorage";

describe("minimalFormDefaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLatestPlanResult", () => {
    it("returns null when no plans are stored", () => {
      vi.mocked(safeStorage.getJSON).mockReturnValue([]);

      const result = getLatestPlanResult();
      expect(result).toBeNull();
    });

    it("returns the result of the most recently saved plan", () => {
      const plans = [
        { savedAt: "2024-01-01T10:00:00Z", result: { id: "old" } },
        { savedAt: "2024-01-03T10:00:00Z", result: { id: "newest" } },
        { savedAt: "2024-01-02T10:00:00Z", result: { id: "middle" } },
      ];
      vi.mocked(safeStorage.getJSON).mockReturnValue(plans);

      const result = getLatestPlanResult();
      expect((result as { id: string }).id).toBe("newest");
    });

    it("returns the only plan's result when there is one plan", () => {
      const plans = [{ savedAt: "2024-01-01T12:00:00Z", result: { name: "Single Plan" } }];
      vi.mocked(safeStorage.getJSON).mockReturnValue(plans);

      const result = getLatestPlanResult();
      expect((result as { name: string }).name).toBe("Single Plan");
    });

    it("calls safeStorage.getJSON with the correct key", () => {
      vi.mocked(safeStorage.getJSON).mockReturnValue([]);

      getLatestPlanResult();

      expect(safeStorage.getJSON).toHaveBeenCalledWith("funnelforge-plans", []);
    });

    it("does not mutate the original plans array (sorting is safe)", () => {
      const plans = [
        { savedAt: "2024-01-02T00:00:00Z", result: { id: "a" } },
        { savedAt: "2024-01-01T00:00:00Z", result: { id: "b" } },
      ];
      vi.mocked(safeStorage.getJSON).mockReturnValue(plans);

      getLatestPlanResult();

      // Original plans order should be unchanged
      expect(plans[0].result).toEqual({ id: "a" });
      expect(plans[1].result).toEqual({ id: "b" });
    });
  });
});
