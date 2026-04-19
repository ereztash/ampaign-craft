import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/contexts/AuthContext";
import { useFeatureGate } from "../useFeatureGate";

const mockUseAuth = vi.mocked(useAuth);

function makeAuthContext(overrides = {}) {
  return {
    user: null,
    loading: false,
    tier: "free",
    canUse: vi.fn(() => false),
    canPerform: vi.fn(() => false),
    isLocalAuth: true,
    ...overrides,
  } as unknown as ReturnType<typeof useAuth>;
}

describe("useFeatureGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes tier from auth context", () => {
    mockUseAuth.mockReturnValue(makeAuthContext({ tier: "pro" }));
    const { result } = renderHook(() => useFeatureGate());
    expect(result.current.tier).toBe("pro");
  });

  it("exposes canUse function", () => {
    mockUseAuth.mockReturnValue(makeAuthContext());
    const { result } = renderHook(() => useFeatureGate());
    expect(typeof result.current.canUse).toBe("function");
  });

  it("exposes checkAccess function", () => {
    mockUseAuth.mockReturnValue(makeAuthContext());
    const { result } = renderHook(() => useFeatureGate());
    expect(typeof result.current.checkAccess).toBe("function");
  });

  it("paywallOpen is false initially", () => {
    mockUseAuth.mockReturnValue(makeAuthContext());
    const { result } = renderHook(() => useFeatureGate());
    expect(result.current.paywallOpen).toBe(false);
  });

  it("paywallFeature defaults to maxFunnels", () => {
    mockUseAuth.mockReturnValue(makeAuthContext());
    const { result } = renderHook(() => useFeatureGate());
    expect(result.current.paywallFeature).toBe("maxFunnels");
  });

  it("paywallTier defaults to pro", () => {
    mockUseAuth.mockReturnValue(makeAuthContext());
    const { result } = renderHook(() => useFeatureGate());
    expect(result.current.paywallTier).toBe("pro");
  });

  it("checkAccess returns true when canUse returns true", () => {
    const canUse = vi.fn(() => true);
    mockUseAuth.mockReturnValue(makeAuthContext({ canUse }));
    const { result } = renderHook(() => useFeatureGate());

    let hasAccess: boolean;
    act(() => {
      hasAccess = result.current.checkAccess("pdfExport");
    });
    expect(hasAccess!).toBe(true);
    expect(result.current.paywallOpen).toBe(false);
  });

  it("checkAccess returns false and opens paywall when canUse returns false", () => {
    const canUse = vi.fn(() => false);
    mockUseAuth.mockReturnValue(makeAuthContext({ canUse }));
    const { result } = renderHook(() => useFeatureGate());

    let hasAccess: boolean;
    act(() => {
      hasAccess = result.current.checkAccess("pdfExport", "business");
    });
    expect(hasAccess!).toBe(false);
    expect(result.current.paywallOpen).toBe(true);
    expect(result.current.paywallFeature).toBe("pdfExport");
    expect(result.current.paywallTier).toBe("business");
  });

  it("checkAccess defaults requiredTier to pro", () => {
    const canUse = vi.fn(() => false);
    mockUseAuth.mockReturnValue(makeAuthContext({ canUse }));
    const { result } = renderHook(() => useFeatureGate());

    act(() => {
      result.current.checkAccess("pdfExport");
    });
    expect(result.current.paywallTier).toBe("pro");
  });

  it("setPaywallOpen can close the paywall", () => {
    const canUse = vi.fn(() => false);
    mockUseAuth.mockReturnValue(makeAuthContext({ canUse }));
    const { result } = renderHook(() => useFeatureGate());

    act(() => {
      result.current.checkAccess("pdfExport");
    });
    expect(result.current.paywallOpen).toBe(true);

    act(() => {
      result.current.setPaywallOpen(false);
    });
    expect(result.current.paywallOpen).toBe(false);
  });

  it("multiple checkAccess calls update paywallFeature to the latest", () => {
    const canUse = vi.fn(() => false);
    mockUseAuth.mockReturnValue(makeAuthContext({ canUse }));
    const { result } = renderHook(() => useFeatureGate());

    act(() => {
      result.current.checkAccess("pdfExport", "pro");
    });
    act(() => {
      result.current.checkAccess("templatePublishing", "business");
    });

    expect(result.current.paywallFeature).toBe("templatePublishing");
    expect(result.current.paywallTier).toBe("business");
  });
});
