import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
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

import { useAuth } from "@/contexts/AuthContext";
import { safeStorage } from "@/lib/safeStorage";
import { useSavedPlans } from "../useSavedPlans";
import type { FunnelResult, SavedPlan } from "@/types/funnel";

const mockUseAuth = vi.mocked(useAuth);
const mockSafeStorage = vi.mocked(safeStorage);

function makePlan(overrides = {}): SavedPlan {
  return {
    id: "plan-1",
    name: "My Plan",
    result: { id: "plan-1", formData: {}, stages: [] } as unknown as FunnelResult,
    savedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("useSavedPlans (unauthenticated / local mode)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    mockSafeStorage.getJSON.mockImplementation((_key, fallback) => fallback);
  });

  it("starts loading=true and transitions to loading=false", async () => {
    const { result } = renderHook(() => useSavedPlans());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("returns empty plans list when storage is empty", async () => {
    const { result } = renderHook(() => useSavedPlans());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.plans).toEqual([]);
  });

  it("loads plans from localStorage when unauthenticated", async () => {
    const storedPlans = [makePlan({ id: "local-1" })];
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-plans") return storedPlans;
      return fallback;
    });

    const { result } = renderHook(() => useSavedPlans());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.plans).toHaveLength(1);
    expect(result.current.plans[0].id).toBe("local-1");
  });

  it("exposes savePlan, deletePlan, and reload functions", async () => {
    const { result } = renderHook(() => useSavedPlans());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.savePlan).toBe("function");
    expect(typeof result.current.deletePlan).toBe("function");
    expect(typeof result.current.reload).toBe("function");
  });

  it("savePlan adds plan to state when unauthenticated", async () => {
    const { result } = renderHook(() => useSavedPlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const fakeResult = { id: "plan-2", formData: {}, stages: [] } as unknown as FunnelResult;
    await act(async () => {
      await result.current.savePlan(fakeResult, "New Plan");
    });

    expect(result.current.plans).toHaveLength(1);
    expect(result.current.plans[0].name).toBe("New Plan");
  });

  it("savePlan persists to localStorage", async () => {
    const { result } = renderHook(() => useSavedPlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const fakeResult = { id: "plan-3", formData: {}, stages: [] } as unknown as FunnelResult;
    await act(async () => {
      await result.current.savePlan(fakeResult, "Persisted");
    });

    expect(mockSafeStorage.setJSON).toHaveBeenCalledWith(
      "funnelforge-plans",
      expect.arrayContaining([expect.objectContaining({ name: "Persisted" })])
    );
  });

  it("savePlan returns the new plan object", async () => {
    const { result } = renderHook(() => useSavedPlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const fakeResult = { id: "plan-4", formData: {}, stages: [] } as unknown as FunnelResult;
    let savedPlan: SavedPlan | undefined;
    await act(async () => {
      savedPlan = await result.current.savePlan(fakeResult, "Return Test");
    });

    expect(savedPlan?.id).toBe("plan-4");
    expect(savedPlan?.name).toBe("Return Test");
  });

  it("deletePlan removes plan from state", async () => {
    const storedPlans = [makePlan({ id: "del-1" }), makePlan({ id: "del-2" })];
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-plans") return storedPlans;
      return fallback;
    });

    const { result } = renderHook(() => useSavedPlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deletePlan("del-1");
    });

    expect(result.current.plans.find((p) => p.id === "del-1")).toBeUndefined();
    expect(result.current.plans.find((p) => p.id === "del-2")).toBeDefined();
  });

  it("deletePlan persists updated list to localStorage", async () => {
    const storedPlans = [makePlan({ id: "plan-x" })];
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-plans") return storedPlans;
      return fallback;
    });

    const { result } = renderHook(() => useSavedPlans());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deletePlan("plan-x");
    });

    expect(mockSafeStorage.setJSON).toHaveBeenCalledWith("funnelforge-plans", []);
  });
});
