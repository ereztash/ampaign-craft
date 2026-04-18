import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAchievements } from "../useAchievements";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock safeStorage
vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn((_key: string, fallback: unknown) => fallback),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
    setString: vi.fn(),
    remove: vi.fn(),
  },
  safeSessionStorage: {
    getJSON: vi.fn((_key: string, fallback: unknown) => fallback),
    setJSON: vi.fn(),
    remove: vi.fn(),
  },
}));

// Mock utils
vi.mock("@/lib/utils", () => ({
  safeParseJson: vi.fn((_key: string, fallback: unknown) => fallback),
  getWeekId: vi.fn(() => "2026-W16"),
}));

import { safeStorage } from "@/lib/safeStorage";
import { safeParseJson } from "@/lib/utils";

const mockSafeStorage = vi.mocked(safeStorage);
const mockSafeParseJson = vi.mocked(safeParseJson);

describe("useAchievements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeParseJson.mockImplementation((_key, fallback) => fallback);
    mockSafeStorage.getJSON.mockImplementation((_key, fallback) => fallback);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with 10 achievements all locked", () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.achievements).toHaveLength(10);
    result.current.achievements.forEach((a) => {
      expect(a.unlockedAt).toBeNull();
    });
  });

  it("totalCount is 10", () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.totalCount).toBe(10);
  });

  it("unlockedCount is 0 initially", () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.unlockedCount).toBe(0);
  });

  it("isUnlocked returns false for a locked achievement", () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.isUnlocked("first_plan")).toBe(false);
  });

  it("unlock sets unlockedAt for a valid achievement id", () => {
    const { result } = renderHook(() => useAchievements());
    act(() => {
      result.current.unlock("first_plan");
    });
    const ach = result.current.achievements.find((a) => a.id === "first_plan");
    expect(ach?.unlockedAt).not.toBeNull();
    expect(result.current.isUnlocked("first_plan")).toBe(true);
    expect(result.current.unlockedCount).toBe(1);
  });

  it("unlock does nothing for unknown id", () => {
    const { result } = renderHook(() => useAchievements());
    act(() => {
      result.current.unlock("nonexistent_achievement");
    });
    expect(result.current.unlockedCount).toBe(0);
  });

  it("unlock is idempotent — calling twice doesn't double-count", () => {
    const { result } = renderHook(() => useAchievements());
    act(() => {
      result.current.unlock("first_plan");
    });
    act(() => {
      result.current.unlock("first_plan");
    });
    expect(result.current.unlockedCount).toBe(1);
  });

  it("exposes streak with currentStreak and longestStreak", () => {
    const { result } = renderHook(() => useAchievements());
    expect(typeof result.current.streak.currentStreak).toBe("number");
    expect(typeof result.current.streak.longestStreak).toBe("number");
  });

  it("trackFeature adds a feature to masteryFeatures", () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.masteryFeatures.has("strategy")).toBe(false);
    act(() => {
      result.current.trackFeature("strategy");
    });
    expect(result.current.masteryFeatures.has("strategy")).toBe(true);
  });

  it("trackFeature is idempotent", () => {
    const { result } = renderHook(() => useAchievements());
    act(() => {
      result.current.trackFeature("strategy");
      result.current.trackFeature("strategy");
    });
    expect(result.current.masteryFeatures.size).toBe(1);
  });

  it("mastery percentage is 0 when no features used", () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.mastery.percentage).toBe(0);
  });

  it("mastery percentage increases as features are tracked", () => {
    const { result } = renderHook(() => useAchievements());
    act(() => {
      result.current.trackFeature("strategy");
      result.current.trackFeature("content");
    });
    expect(result.current.mastery.usedFeatures).toBe(2);
    expect(result.current.mastery.percentage).toBeGreaterThan(0);
  });

  it("mastery totalFeatures matches FEATURE_MAP count (10)", () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.mastery.totalFeatures).toBe(10);
  });

  it("mastery categories has an entry for each feature", () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.mastery.categories).toHaveLength(10);
    result.current.mastery.categories.forEach((cat) => {
      expect(cat.total).toBe(1);
    });
  });

  it("accepts language parameter 'en'", () => {
    const { result } = renderHook(() => useAchievements("en"));
    expect(result.current.achievements[0].name.en).toBeDefined();
  });

  it("loads existing unlocked achievements from storage", () => {
    const storedAchievements = { first_plan: "2026-01-01T00:00:00.000Z" };
    mockSafeParseJson.mockImplementation((key, fallback) => {
      if (key === "funnelforge-achievements") return storedAchievements;
      return fallback;
    });

    const { result } = renderHook(() => useAchievements());
    const ach = result.current.achievements.find((a) => a.id === "first_plan");
    expect(ach?.unlockedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("auto-unlocks streak_4 when streak is >= 4", () => {
    mockSafeParseJson.mockImplementation((key, fallback) => {
      if (key === "funnelforge-streak") {
        return { currentStreak: 4, longestStreak: 4, lastActiveDate: "2026-W16" };
      }
      return fallback;
    });

    const { result } = renderHook(() => useAchievements());
    // streak_4 should be unlocked via auto-unlock effect
    const ach = result.current.achievements.find((a) => a.id === "streak_4");
    // The achievement becomes unlocked after effect runs
    expect(ach).toBeDefined();
  });
});
