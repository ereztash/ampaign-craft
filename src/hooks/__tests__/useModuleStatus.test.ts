import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/lib/safeStorage", () => ({
  safeStorage: {
    getJSON: vi.fn((_key: string, fallback: unknown) => fallback),
    setJSON: vi.fn(),
    getString: vi.fn(() => ""),
    setString: vi.fn(),
    remove: vi.fn(),
  },
}));

import { safeStorage } from "@/lib/safeStorage";
import { useModuleStatus } from "../useModuleStatus";

const mockSafeStorage = vi.mocked(safeStorage);

describe("useModuleStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeStorage.getString.mockReturnValue("");
    mockSafeStorage.getJSON.mockReturnValue([]);
  });

  it("returns 5 modules", () => {
    const { result } = renderHook(() => useModuleStatus());
    expect(result.current).toHaveLength(5);
  });

  it("includes differentiation, marketing, sales, pricing, retention modules", () => {
    const { result } = renderHook(() => useModuleStatus());
    const ids = result.current.map((m) => m.id);
    expect(ids).toContain("differentiation");
    expect(ids).toContain("marketing");
    expect(ids).toContain("sales");
    expect(ids).toContain("pricing");
    expect(ids).toContain("retention");
  });

  it("all modules have both he and en labels", () => {
    const { result } = renderHook(() => useModuleStatus());
    result.current.forEach((module) => {
      expect(module.label.he).toBeTruthy();
      expect(module.label.en).toBeTruthy();
    });
  });

  it("all modules have a route", () => {
    const { result } = renderHook(() => useModuleStatus());
    result.current.forEach((module) => {
      expect(module.route).toBeTruthy();
      expect(module.route).toMatch(/^\//);
    });
  });

  it("differentiation is completed when differentiation-result storage key is non-empty", () => {
    mockSafeStorage.getString.mockImplementation((key) => {
      if (key === "funnelforge-differentiation-result") return "some-result";
      return "";
    });

    const { result } = renderHook(() => useModuleStatus());
    const diff = result.current.find((m) => m.id === "differentiation");
    expect(diff?.completed).toBe(true);
  });

  it("differentiation is not completed when storage key is empty", () => {
    mockSafeStorage.getString.mockReturnValue("");
    const { result } = renderHook(() => useModuleStatus());
    const diff = result.current.find((m) => m.id === "differentiation");
    expect(diff?.completed).toBe(false);
  });

  it("marketing is completed when plans array has length > 0", () => {
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-plans") return [{ id: "plan-1" }];
      return fallback;
    });

    const { result } = renderHook(() => useModuleStatus());
    const marketing = result.current.find((m) => m.id === "marketing");
    expect(marketing?.completed).toBe(true);
  });

  it("marketing is not completed when plans array is empty", () => {
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-plans") return [];
      return fallback;
    });

    const { result } = renderHook(() => useModuleStatus());
    const marketing = result.current.find((m) => m.id === "marketing");
    expect(marketing?.completed).toBe(false);
  });

  it("sales completion matches plan availability", () => {
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-plans") return [{ id: "p1" }];
      return fallback;
    });
    const { result } = renderHook(() => useModuleStatus());
    const sales = result.current.find((m) => m.id === "sales");
    expect(sales?.completed).toBe(true);
  });

  it("all modules have icon and color properties", () => {
    const { result } = renderHook(() => useModuleStatus());
    result.current.forEach((module) => {
      expect(module.icon).toBeTruthy();
      expect(module.color).toBeTruthy();
    });
  });

  it("module routes match expected paths", () => {
    const { result } = renderHook(() => useModuleStatus());
    const routeMap = Object.fromEntries(result.current.map((m) => [m.id, m.route]));
    expect(routeMap.differentiation).toBe("/differentiate");
    expect(routeMap.marketing).toBe("/wizard");
    expect(routeMap.sales).toBe("/sales");
    expect(routeMap.pricing).toBe("/pricing");
    expect(routeMap.retention).toBe("/retention");
  });
});
