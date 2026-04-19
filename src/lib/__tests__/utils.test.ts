import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock safeStorage for safeParseJson
vi.mock("../safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn((key: string, fallback: unknown) => fallback),
    setJSON: vi.fn(),
    remove: vi.fn(),
  },
}));

import {
  cn,
  formatCurrency,
  formatDate,
  STATUS_LABELS,
  STATUS_COLORS,
  safeParseJson,
  getWeekId,
  getWeekNumber,
} from "../utils";
import { safeStorage } from "../safeStorage";

describe("utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── cn ─────────────────────────────────────────────────────────────────

  describe("cn", () => {
    it("merges class names", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("handles conditional classes", () => {
      const condition = false;
      const result = cn("base", condition && "not-included", "included");
      expect(result).not.toContain("not-included");
      expect(result).toContain("included");
    });

    it("deduplicates tailwind classes (last wins)", () => {
      // twMerge deduplication: p-2 and p-4 → p-4
      const result = cn("p-2", "p-4");
      expect(result).toBe("p-4");
    });

    it("handles empty input", () => {
      expect(cn()).toBe("");
    });

    it("handles undefined and null", () => {
      expect(() => cn(undefined as never, null as never)).not.toThrow();
    });
  });

  // ── formatCurrency ────────────────────────────────────────────────────

  describe("formatCurrency", () => {
    it("returns em-dash for null", () => {
      expect(formatCurrency(null)).toBe("—");
    });

    it("returns em-dash for undefined", () => {
      expect(formatCurrency(undefined)).toBe("—");
    });

    it("formats a positive number as ILS currency", () => {
      const result = formatCurrency(1000);
      // ILS formatting includes ₪ or ILS symbol depending on locale
      expect(result).toMatch(/1[,.]?000|₪|ILS/);
    });

    it("formats zero", () => {
      const result = formatCurrency(0);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("formats negative amounts", () => {
      const result = formatCurrency(-500);
      expect(typeof result).toBe("string");
    });
  });

  // ── formatDate ────────────────────────────────────────────────────────

  describe("formatDate", () => {
    it("returns em-dash for null", () => {
      expect(formatDate(null)).toBe("—");
    });

    it("returns em-dash for undefined", () => {
      expect(formatDate(undefined)).toBe("—");
    });

    it("returns em-dash for empty string", () => {
      expect(formatDate("")).toBe("—");
    });

    it("formats a valid ISO date string", () => {
      const result = formatDate("2024-01-15T00:00:00Z");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      // Should contain the year
      expect(result).toContain("2024");
    });

    it("formats another valid date", () => {
      const result = formatDate("2023-12-31");
      expect(result).toContain("2023");
    });
  });

  // ── STATUS_LABELS ─────────────────────────────────────────────────────

  describe("STATUS_LABELS", () => {
    const EXPECTED_KEYS = [
      "active", "prospect", "churned", "paused", "volunteer",
      "planned", "completed", "cancelled", "todo", "in_progress",
      "done", "blocked", "critical", "high", "medium", "low",
    ];

    it("has entries for all expected status keys", () => {
      for (const key of EXPECTED_KEYS) {
        expect(key in STATUS_LABELS).toBe(true);
      }
    });

    it("all values are non-empty strings", () => {
      for (const val of Object.values(STATUS_LABELS)) {
        expect(typeof val).toBe("string");
        expect(val.length).toBeGreaterThan(0);
      }
    });
  });

  // ── STATUS_COLORS ─────────────────────────────────────────────────────

  describe("STATUS_COLORS", () => {
    it("has entries for active, prospect, churned", () => {
      expect(STATUS_COLORS.active).toBeDefined();
      expect(STATUS_COLORS.prospect).toBeDefined();
      expect(STATUS_COLORS.churned).toBeDefined();
    });

    it("all values contain CSS class strings", () => {
      for (const val of Object.values(STATUS_COLORS)) {
        expect(typeof val).toBe("string");
        expect(val.length).toBeGreaterThan(0);
        expect(val).toContain("bg-");
      }
    });
  });

  // ── safeParseJson ─────────────────────────────────────────────────────

  describe("safeParseJson", () => {
    it("delegates to safeStorage.getJSON", () => {
      const fallback = { default: true };
      vi.mocked(safeStorage.getJSON).mockReturnValue({ stored: true });

      const result = safeParseJson("my-key", fallback);
      expect(safeStorage.getJSON).toHaveBeenCalledWith("my-key", fallback);
      expect(result).toEqual({ stored: true });
    });

    it("returns fallback when safeStorage returns the fallback", () => {
      const fallback = [1, 2, 3];
      vi.mocked(safeStorage.getJSON).mockReturnValue(fallback);

      const result = safeParseJson("missing-key", fallback);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  // ── getWeekId ─────────────────────────────────────────────────────────

  describe("getWeekId", () => {
    it("returns a string in YYYY-WNN format", () => {
      const id = getWeekId(new Date("2024-01-15"));
      expect(id).toMatch(/^\d{4}-W\d+$/);
    });

    it("returns the current week when no date provided", () => {
      const id = getWeekId();
      expect(id).toMatch(/^\d{4}-W\d+$/);
    });

    it("returns the same id for dates in the same ISO week", () => {
      // 2024-01-15 (Mon) and 2024-01-19 (Fri) are in the same week
      const id1 = getWeekId(new Date("2024-01-15"));
      const id2 = getWeekId(new Date("2024-01-19"));
      expect(id1).toBe(id2);
    });

    it("returns different ids for dates in different weeks", () => {
      const id1 = getWeekId(new Date("2024-01-08"));
      const id2 = getWeekId(new Date("2024-01-15"));
      expect(id1).not.toBe(id2);
    });

    it("year part matches the ISO week year", () => {
      const id = getWeekId(new Date("2024-06-15"));
      expect(id.startsWith("2024")).toBe(true);
    });
  });

  // ── getWeekNumber ─────────────────────────────────────────────────────

  describe("getWeekNumber", () => {
    it("returns a positive number", () => {
      const week = getWeekNumber(new Date("2024-01-15"));
      expect(week).toBeGreaterThan(0);
    });

    it("returns a number <= 53", () => {
      const week = getWeekNumber(new Date("2024-12-31"));
      expect(week).toBeLessThanOrEqual(53);
    });

    it("returns week 1 for early January", () => {
      const week = getWeekNumber(new Date("2024-01-03"));
      expect(week).toBe(1);
    });

    it("returns current week when no date provided", () => {
      const week = getWeekNumber();
      expect(typeof week).toBe("number");
      expect(week).toBeGreaterThan(0);
    });

    it("later dates produce higher week numbers (same year)", () => {
      const w1 = getWeekNumber(new Date("2024-01-01"));
      const w2 = getWeekNumber(new Date("2024-06-01"));
      expect(w2).toBeGreaterThan(w1);
    });
  });
});
