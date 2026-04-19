import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
      })),
      auth: {
        getSession: vi.fn(),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    },
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { useAuth } from "@/contexts/AuthContext";
import { useTemplateMarketplace } from "../useTemplateMarketplace";

const mockUseAuth = vi.mocked(useAuth);

const mockTemplateRow = {
  id: "tmpl-1",
  author_id: "user-1",
  plan_id: "plan-1",
  title: "Great Template",
  description: "A really useful plan",
  business_field: "tech",
  main_goal: "sales",
  budget_range: "medium",
  upvotes: 10,
  use_count: 5,
  is_public: true,
  created_at: "2026-01-01T00:00:00Z",
};

function setupSelectChain(data: unknown[] | null = [mockTemplateRow]) {
  const orderMock = vi.fn().mockResolvedValue({ data, error: null });
  const eqMock = vi.fn();
  eqMock.mockReturnValue({ eq: eqMock, order: orderMock });
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock, order: orderMock });

  // Assign to the shared mocks for inspection
  mockSelect.mockImplementation(() => ({ eq: eqMock, order: orderMock }));
  mockOrder.mockImplementation(orderMock);
  mockEq.mockImplementation(eqMock);

  return { orderMock, eqMock, selectMock };
}

describe("useTemplateMarketplace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    setupSelectChain();
  });

  it("starts with empty templates and loading=false after initial load", async () => {
    const { result } = renderHook(() => useTemplateMarketplace());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("loads templates on mount", async () => {
    const { result } = renderHook(() => useTemplateMarketplace());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Templates should be loaded (mapped from the mock row)
    expect(result.current.templates).toHaveLength(1);
    expect(result.current.templates[0].id).toBe("tmpl-1");
  });

  it("maps row fields correctly to camelCase", async () => {
    const { result } = renderHook(() => useTemplateMarketplace());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const tmpl = result.current.templates[0];
    expect(tmpl.authorId).toBe("user-1");
    expect(tmpl.planId).toBe("plan-1");
    expect(tmpl.businessField).toBe("tech");
    expect(tmpl.mainGoal).toBe("sales");
    expect(tmpl.budgetRange).toBe("medium");
    expect(tmpl.upvotes).toBe(10);
    expect(tmpl.useCount).toBe(5);
    expect(tmpl.isPublic).toBe(true);
    expect(tmpl.createdAt).toBe("2026-01-01T00:00:00Z");
  });

  it("exposes loadTemplates, publishTemplate, upvoteTemplate, useTemplate functions", () => {
    const { result } = renderHook(() => useTemplateMarketplace());
    expect(typeof result.current.loadTemplates).toBe("function");
    expect(typeof result.current.publishTemplate).toBe("function");
    expect(typeof result.current.upvoteTemplate).toBe("function");
    expect(typeof result.current.useTemplate).toBe("function");
  });

  it("publishTemplate returns null when user is not logged in", async () => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    const { result } = renderHook(() => useTemplateMarketplace());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: string | null;
    await act(async () => {
      returned = await result.current.publishTemplate(
        { id: "plan-x", name: "Test", result: { formData: {} } } as never,
        "Title",
        "Description"
      );
    });
    expect(returned!).toBeNull();
  });

  it("upvoteTemplate increments upvotes optimistically", async () => {
    const { result } = renderHook(() => useTemplateMarketplace());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.templates[0].upvotes).toBe(10);

    // Mock the update chain
    const updateEqMock = vi.fn().mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: updateEqMock });

    await act(async () => {
      await result.current.upvoteTemplate("tmpl-1");
    });

    expect(result.current.templates[0].upvotes).toBe(11);
  });

  it("useTemplate returns null for unknown template", async () => {
    const { result } = renderHook(() => useTemplateMarketplace());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.useTemplate("nonexistent-id");
    });
    expect(returned).toBeNull();
  });

  it("handles null data from supabase gracefully", async () => {
    setupSelectChain(null);
    const { result } = renderHook(() => useTemplateMarketplace());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Templates stays empty when data is null
    expect(result.current.templates).toEqual([]);
  });
});
