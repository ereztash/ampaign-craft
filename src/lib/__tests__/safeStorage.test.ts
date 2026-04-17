import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { safeStorage } from "@/lib/safeStorage";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("safeStorage", () => {
  it("round-trips JSON values", () => {
    expect(safeStorage.setJSON("k", { a: 1, b: [2, 3] })).toBe(true);
    expect(safeStorage.getJSON("k", null)).toEqual({ a: 1, b: [2, 3] });
  });

  it("returns fallback when key is missing", () => {
    expect(safeStorage.getJSON("missing", { fallback: true })).toEqual({ fallback: true });
  });

  it("returns fallback when value is malformed JSON", () => {
    localStorage.setItem("broken", "{not-json");
    expect(safeStorage.getJSON("broken", [])).toEqual([]);
  });

  it("returns false when setItem throws a quota error", () => {
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = vi.fn(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    try {
      expect(safeStorage.setJSON("k", { big: "payload" })).toBe(false);
    } finally {
      localStorage.setItem = original;
    }
  });

  it("getString falls back on read error", () => {
    const original = localStorage.getItem.bind(localStorage);
    localStorage.getItem = vi.fn(() => {
      throw new Error("disabled");
    });
    try {
      expect(safeStorage.getString("k", "default")).toBe("default");
    } finally {
      localStorage.getItem = original;
    }
  });

  it("remove swallows errors", () => {
    const original = localStorage.removeItem.bind(localStorage);
    localStorage.removeItem = vi.fn(() => {
      throw new Error("boom");
    });
    try {
      expect(() => safeStorage.remove("k")).not.toThrow();
    } finally {
      localStorage.removeItem = original;
    }
  });
});
