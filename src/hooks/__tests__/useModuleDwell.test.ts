import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("react-router-dom", () => ({
  useLocation: vi.fn(() => ({ pathname: "/wizard" })),
}));

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/archetypeBlindSpots", () => ({
  getBlindSpotProfile: vi.fn(() => ({
    archetypeId: "optimizer",
    moduleBlindSpots: [],
  })),
}));

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn((_key: string, fallback: unknown) => fallback),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
    setString: vi.fn(),
    remove: vi.fn(),
  },
}));

import { useLocation } from "react-router-dom";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { useAuth } from "@/contexts/AuthContext";
import { getBlindSpotProfile } from "@/lib/archetypeBlindSpots";
import { safeStorage } from "@/lib/safeStorage";
import {
  useModuleDwell,
  getDismissRecord,
  setDismissRecord,
  isRecentlyDismissed,
} from "../useModuleDwell";

const mockUseLocation = vi.mocked(useLocation);
const mockUseArchetype = vi.mocked(useArchetype);
const mockUseAuth = vi.mocked(useAuth);
const mockGetBlindSpotProfile = vi.mocked(getBlindSpotProfile);
const mockSafeStorage = vi.mocked(safeStorage);

function makeArchetypeContext(overrides = {}) {
  return {
    effectiveArchetypeId: "optimizer",
    confidenceTier: "none",
    adaptationsEnabled: false,
    uiConfig: {},
    ...overrides,
  } as unknown as ReturnType<typeof useArchetype>;
}

function makeBlindSpotEntry(overrides = {}) {
  return {
    moduleId: "wizard",
    routePath: "/wizard",
    dwellThresholdDays: 3,
    description: { he: "תיאור", en: "Description" },
    nudge: { he: "נגיעה", en: "Nudge" },
    suggestedNextModule: "data",
    suggestedNextRoutePath: "/data",
    ...overrides,
  };
}

describe("useModuleDwell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocation.mockReturnValue({ pathname: "/wizard" } as ReturnType<typeof useLocation>);
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } } as ReturnType<typeof useAuth>);
    mockUseArchetype.mockReturnValue(makeArchetypeContext());
    mockGetBlindSpotProfile.mockReturnValue({
      archetypeId: "optimizer",
      moduleBlindSpots: [],
    } as ReturnType<typeof getBlindSpotProfile>);
    mockSafeStorage.getJSON.mockReturnValue(null);
    mockSafeStorage.getString.mockReturnValue("");
  });

  it("returns null moduleId when adaptationsEnabled is false", () => {
    const { result } = renderHook(() => useModuleDwell());
    expect(result.current.moduleId).toBeNull();
  });

  it("returns null moduleId when confidenceTier is none", () => {
    mockUseArchetype.mockReturnValue(makeArchetypeContext({ adaptationsEnabled: true, confidenceTier: "none" }));
    const { result } = renderHook(() => useModuleDwell());
    expect(result.current.moduleId).toBeNull();
  });

  it("returns null moduleId when no blind spot matches the route", () => {
    mockUseArchetype.mockReturnValue(makeArchetypeContext({ adaptationsEnabled: true, confidenceTier: "confident" }));
    mockGetBlindSpotProfile.mockReturnValue({
      archetypeId: "optimizer",
      moduleBlindSpots: [makeBlindSpotEntry({ routePath: "/other-path" })],
    } as ReturnType<typeof getBlindSpotProfile>);

    const { result } = renderHook(() => useModuleDwell());
    expect(result.current.moduleId).toBeNull();
  });

  it("returns moduleId when blind spot matches the route", () => {
    mockUseArchetype.mockReturnValue(makeArchetypeContext({ adaptationsEnabled: true, confidenceTier: "confident" }));
    mockGetBlindSpotProfile.mockReturnValue({
      archetypeId: "optimizer",
      moduleBlindSpots: [makeBlindSpotEntry()],
    } as ReturnType<typeof getBlindSpotProfile>);

    const { result } = renderHook(() => useModuleDwell());
    expect(result.current.moduleId).toBe("wizard");
  });

  it("shouldNudge is false when module is completed", () => {
    mockUseArchetype.mockReturnValue(makeArchetypeContext({ adaptationsEnabled: true, confidenceTier: "confident" }));
    mockGetBlindSpotProfile.mockReturnValue({
      archetypeId: "optimizer",
      moduleBlindSpots: [makeBlindSpotEntry({ routePath: "/wizard", dwellThresholdDays: 0 })],
    } as ReturnType<typeof getBlindSpotProfile>);
    // Simulate completed: wizard storage key has a plan
    mockSafeStorage.getString.mockImplementation((key) => {
      if (key === "funnelforge-plans") return JSON.stringify([{ id: "plan-1" }]);
      return "";
    });

    const { result } = renderHook(() => useModuleDwell());
    expect(result.current.isCompleted).toBe(true);
    expect(result.current.shouldNudge).toBe(false);
  });

  it("shouldNudge is false when daysSinceFirstVisit is below threshold", () => {
    mockUseArchetype.mockReturnValue(makeArchetypeContext({ adaptationsEnabled: true, confidenceTier: "confident" }));
    mockGetBlindSpotProfile.mockReturnValue({
      archetypeId: "optimizer",
      moduleBlindSpots: [makeBlindSpotEntry({ dwellThresholdDays: 5 })],
    } as ReturnType<typeof getBlindSpotProfile>);
    // firstVisitAt is today — daysSinceFirstVisit = 0
    mockSafeStorage.getJSON.mockImplementation((key) => {
      if (key === "funnelforge-dwell-user-1-wizard") {
        return { firstVisitAt: new Date().toISOString(), lastVisitAt: new Date().toISOString() };
      }
      return null;
    });

    const { result } = renderHook(() => useModuleDwell());
    expect(result.current.daysSinceFirstVisit).toBe(0);
    expect(result.current.shouldNudge).toBe(false);
  });

  it("daysSinceFirstVisit is 0 when no dwell record exists", () => {
    mockUseArchetype.mockReturnValue(makeArchetypeContext({ adaptationsEnabled: true, confidenceTier: "confident" }));
    mockGetBlindSpotProfile.mockReturnValue({
      archetypeId: "optimizer",
      moduleBlindSpots: [makeBlindSpotEntry()],
    } as ReturnType<typeof getBlindSpotProfile>);
    mockSafeStorage.getJSON.mockReturnValue(null);

    const { result } = renderHook(() => useModuleDwell());
    expect(result.current.daysSinceFirstVisit).toBe(0);
  });

  it("blindSpotEntry is null when adaptations are disabled", () => {
    const { result } = renderHook(() => useModuleDwell());
    expect(result.current.blindSpotEntry).toBeNull();
  });

  it("uses anonymous userId when user is not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    mockUseArchetype.mockReturnValue(makeArchetypeContext({ adaptationsEnabled: true, confidenceTier: "confident" }));
    mockGetBlindSpotProfile.mockReturnValue({
      archetypeId: "optimizer",
      moduleBlindSpots: [makeBlindSpotEntry()],
    } as ReturnType<typeof getBlindSpotProfile>);

    const { result } = renderHook(() => useModuleDwell());
    expect(result.current.moduleId).toBe("wizard");
  });
});

describe("isRecentlyDismissed / getDismissRecord / setDismissRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeStorage.getJSON.mockReturnValue(null);
    mockSafeStorage.setJSON.mockImplementation(() => true);
  });

  it("isRecentlyDismissed returns false when no record", () => {
    mockSafeStorage.getJSON.mockReturnValue(null);
    expect(isRecentlyDismissed("user-1", "wizard")).toBe(false);
  });

  it("isRecentlyDismissed returns true when dismissed recently (< 72h)", () => {
    const recentTime = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h ago
    mockSafeStorage.getJSON.mockReturnValue({ dismissedAt: recentTime });
    expect(isRecentlyDismissed("user-1", "wizard")).toBe(true);
  });

  it("isRecentlyDismissed returns false when dismissed more than 72h ago", () => {
    const oldTime = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString(); // 73h ago
    mockSafeStorage.getJSON.mockReturnValue({ dismissedAt: oldTime });
    expect(isRecentlyDismissed("user-1", "wizard")).toBe(false);
  });

  it("getDismissRecord returns null when not set", () => {
    mockSafeStorage.getJSON.mockReturnValue(null);
    expect(getDismissRecord("user-1", "wizard")).toBeNull();
  });

  it("getDismissRecord returns the stored record", () => {
    const record = { dismissedAt: new Date().toISOString() };
    mockSafeStorage.getJSON.mockReturnValue(record);
    expect(getDismissRecord("user-1", "wizard")).toEqual(record);
  });

  it("setDismissRecord persists a new dismiss record", () => {
    setDismissRecord("user-1", "wizard");
    expect(mockSafeStorage.setJSON).toHaveBeenCalledWith(
      "funnelforge-nudge-dismiss-user-1-wizard",
      expect.objectContaining({ dismissedAt: expect.any(String) })
    );
  });
});
