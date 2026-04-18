import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  safeParseJson: vi.fn((_key: string, fallback: unknown) => fallback),
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
import { safeParseJson } from "@/lib/utils";
import { useCampaignTracking } from "../useCampaignTracking";

const mockUseAuth = vi.mocked(useAuth);
const mockSafeParseJson = vi.mocked(safeParseJson);

const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
  insert: vi.fn().mockResolvedValue({ error: null }),
};

describe("useCampaignTracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    mockSafeParseJson.mockImplementation((_key, fallback) => fallback);
  });

  it("starts with empty metrics and loading false when planId is null", async () => {
    const { result } = renderHook(() => useCampaignTracking(null));
    expect(result.current.metrics).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("loads metrics from localStorage when user is not logged in", async () => {
    mockSafeParseJson.mockImplementation((key, fallback) => {
      if (key === "funnelforge-tracking") {
        return [
          {
            id: "m1",
            planId: "plan-1",
            stageId: "stage-1",
            channel: "email",
            metric: "opens",
            projectedValue: "1000",
            actualValue: 950,
            date: "2026-04-01",
          },
        ];
      }
      return fallback;
    });

    const { result } = renderHook(() => useCampaignTracking("plan-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics).toHaveLength(1);
    expect(result.current.metrics[0].planId).toBe("plan-1");
  });

  it("exposes addMetric function", () => {
    const { result } = renderHook(() => useCampaignTracking("plan-1"));
    expect(typeof result.current.addMetric).toBe("function");
  });

  it("exposes getComparison function", () => {
    const { result } = renderHook(() => useCampaignTracking("plan-1"));
    expect(typeof result.current.getComparison).toBe("function");
  });

  it("getComparison returns empty array when no metrics", () => {
    const { result } = renderHook(() => useCampaignTracking("plan-1"));
    expect(result.current.getComparison()).toEqual([]);
  });

  it("addMetric adds a metric to the local state when no user", async () => {
    mockSafeParseJson.mockImplementation((_key, fallback) => fallback);
    const { result } = renderHook(() => useCampaignTracking("plan-1"));

    await act(async () => {
      await result.current.addMetric("stage-1", "email", "clicks", "500", 480, "2026-04-01");
    });

    expect(result.current.metrics).toHaveLength(1);
    expect(result.current.metrics[0].channel).toBe("email");
    expect(result.current.metrics[0].metric).toBe("clicks");
  });

  it("getComparison calculates status correctly — outperforming", async () => {
    const { result } = renderHook(() => useCampaignTracking("plan-1"));

    await act(async () => {
      await result.current.addMetric("s1", "email", "opens", "1000", 1100, "2026-04-01");
    });

    const comparisons = result.current.getComparison();
    expect(comparisons).toHaveLength(1);
    expect(comparisons[0].status).toBe("outperforming");
    expect(comparisons[0].delta).toContain("+");
  });

  it("getComparison calculates status correctly — underperforming", async () => {
    const { result } = renderHook(() => useCampaignTracking("plan-1"));

    await act(async () => {
      await result.current.addMetric("s1", "email", "clicks", "1000", 800, "2026-04-01");
    });

    const comparisons = result.current.getComparison();
    expect(comparisons[0].status).toBe("underperforming");
  });

  it("getComparison calculates status correctly — on-target", async () => {
    const { result } = renderHook(() => useCampaignTracking("plan-1"));

    await act(async () => {
      await result.current.addMetric("s1", "email", "opens", "1000", 1000, "2026-04-01");
    });

    const comparisons = result.current.getComparison();
    expect(comparisons[0].status).toBe("on-target");
  });

  it("does not load metrics when planId is null", async () => {
    const { result } = renderHook(() => useCampaignTracking(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.metrics).toHaveLength(0);
  });

  it("addMetric does nothing when planId is null", async () => {
    const { result } = renderHook(() => useCampaignTracking(null));
    await act(async () => {
      await result.current.addMetric("s1", "email", "opens", "1000", 900, "2026-04-01");
    });
    expect(result.current.metrics).toHaveLength(0);
  });
});
