import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Mock contexts
vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: vi.fn(),
}));

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

vi.mock("@/lib/paletteVariantGenerator", () => ({
  getVariantAccentHsl: vi.fn(() => null),
}));

vi.mock("@/engine/behavioralHeuristicEngine", () => ({
  getL5CSSVars: vi.fn(() => ({
    "--motion-duration-multiplier": "1.2",
    "--motion-easing": "ease-in-out",
    "--cta-font-weight": "700",
  })),
}));

import { useUserProfile } from "@/contexts/UserProfileContext";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { getL5CSSVars } from "@/engine/behavioralHeuristicEngine";
import { useAdaptiveTheme } from "../useAdaptiveTheme";

const mockUseUserProfile = vi.mocked(useUserProfile);
const mockUseArchetype = vi.mocked(useArchetype);
const mockGetL5CSSVars = vi.mocked(getL5CSSVars);

function makeProfileContext(overrides = {}) {
  return {
    profile: {
      userSegment: "new-beginner",
      lastFormData: null,
      ...overrides,
    },
  } as ReturnType<typeof useUserProfile>;
}

function makeArchetypeContext(overrides = {}) {
  return {
    effectiveArchetypeId: "optimizer",
    confidenceTier: "none",
    uiConfig: { informationDensity: "comfortable" },
    adaptationsEnabled: false,
    ...overrides,
  } as unknown as ReturnType<typeof useArchetype>;
}

describe("useAdaptiveTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserProfile.mockReturnValue(makeProfileContext() as ReturnType<typeof useUserProfile>);
    mockUseArchetype.mockReturnValue(makeArchetypeContext() as ReturnType<typeof useArchetype>);
  });

  afterEach(() => {
    // Clean up any attributes left on document element
    document.documentElement.removeAttribute("data-segment");
    document.documentElement.removeAttribute("data-field");
    document.documentElement.removeAttribute("data-audience");
    document.documentElement.removeAttribute("data-experience");
    document.documentElement.removeAttribute("data-archetype");
    document.documentElement.removeAttribute("data-density");
  });

  it("sets data-segment on document.documentElement", () => {
    mockUseUserProfile.mockReturnValue(
      makeProfileContext({ userSegment: "new-intermediate" }) as ReturnType<typeof useUserProfile>
    );
    renderHook(() => useAdaptiveTheme());
    expect(document.documentElement.getAttribute("data-segment")).toBe("new-intermediate");
  });

  it("defaults data-segment to new-beginner when userSegment is undefined", () => {
    mockUseUserProfile.mockReturnValue(
      makeProfileContext({ userSegment: undefined }) as ReturnType<typeof useUserProfile>
    );
    renderHook(() => useAdaptiveTheme());
    expect(document.documentElement.getAttribute("data-segment")).toBe("new-beginner");
  });

  it("sets data-field when businessField is present", () => {
    mockUseUserProfile.mockReturnValue(
      makeProfileContext({ lastFormData: { businessField: "tech" } }) as ReturnType<typeof useUserProfile>
    );
    renderHook(() => useAdaptiveTheme());
    expect(document.documentElement.getAttribute("data-field")).toBe("tech");
  });

  it("removes data-field when businessField is absent", () => {
    document.documentElement.setAttribute("data-field", "old-value");
    renderHook(() => useAdaptiveTheme());
    expect(document.documentElement.getAttribute("data-field")).toBeNull();
  });

  it("sets data-audience when audienceType is present", () => {
    mockUseUserProfile.mockReturnValue(
      makeProfileContext({ lastFormData: { audienceType: "b2b" } }) as ReturnType<typeof useUserProfile>
    );
    renderHook(() => useAdaptiveTheme());
    expect(document.documentElement.getAttribute("data-audience")).toBe("b2b");
  });

  it("sets data-experience when experienceLevel is present", () => {
    mockUseUserProfile.mockReturnValue(
      makeProfileContext({ lastFormData: { experienceLevel: "advanced" } }) as ReturnType<typeof useUserProfile>
    );
    renderHook(() => useAdaptiveTheme());
    expect(document.documentElement.getAttribute("data-experience")).toBe("advanced");
  });

  it("does NOT set data-archetype when adaptationsEnabled is false", () => {
    mockUseArchetype.mockReturnValue(
      makeArchetypeContext({ adaptationsEnabled: false, confidenceTier: "confident" }) as ReturnType<typeof useArchetype>
    );
    renderHook(() => useAdaptiveTheme());
    expect(document.documentElement.getAttribute("data-archetype")).toBeNull();
  });

  it("sets data-archetype when adaptationsEnabled and tier is confident", () => {
    mockUseArchetype.mockReturnValue(
      makeArchetypeContext({
        adaptationsEnabled: true,
        confidenceTier: "confident",
        effectiveArchetypeId: "strategist",
      }) as ReturnType<typeof useArchetype>
    );
    renderHook(() => useAdaptiveTheme());
    expect(document.documentElement.getAttribute("data-archetype")).toBe("strategist");
  });

  it("sets data-archetype when adaptationsEnabled and tier is strong", () => {
    mockUseArchetype.mockReturnValue(
      makeArchetypeContext({
        adaptationsEnabled: true,
        confidenceTier: "strong",
        effectiveArchetypeId: "pioneer",
      }) as ReturnType<typeof useArchetype>
    );
    renderHook(() => useAdaptiveTheme());
    expect(document.documentElement.getAttribute("data-archetype")).toBe("pioneer");
  });

  it("does NOT set data-density when adaptationsEnabled is false", () => {
    renderHook(() => useAdaptiveTheme());
    expect(document.documentElement.getAttribute("data-density")).toBeNull();
  });

  it("sets data-density when adaptationsEnabled and tier is strong", () => {
    mockUseArchetype.mockReturnValue(
      makeArchetypeContext({
        adaptationsEnabled: true,
        confidenceTier: "strong",
        uiConfig: { informationDensity: "compact" },
      }) as ReturnType<typeof useArchetype>
    );
    renderHook(() => useAdaptiveTheme());
    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
  });

  it("applies L5 CSS vars when adaptationsEnabled and confident tier", () => {
    mockUseArchetype.mockReturnValue(
      makeArchetypeContext({
        adaptationsEnabled: true,
        confidenceTier: "confident",
        effectiveArchetypeId: "closer",
      }) as ReturnType<typeof useArchetype>
    );
    const setPropertySpy = vi.spyOn(document.documentElement.style, "setProperty");
    renderHook(() => useAdaptiveTheme());
    expect(mockGetL5CSSVars).toHaveBeenCalledWith("closer");
    expect(setPropertySpy).toHaveBeenCalledWith("--motion-duration-multiplier", "1.2");
  });

  it("removes attributes on unmount", () => {
    mockUseUserProfile.mockReturnValue(
      makeProfileContext({ userSegment: "returning" }) as ReturnType<typeof useUserProfile>
    );
    const { unmount } = renderHook(() => useAdaptiveTheme());
    expect(document.documentElement.getAttribute("data-segment")).toBe("returning");
    unmount();
    expect(document.documentElement.getAttribute("data-segment")).toBeNull();
  });
});
