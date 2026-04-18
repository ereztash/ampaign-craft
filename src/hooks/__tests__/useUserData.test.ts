import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

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

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { safeStorage } from "@/lib/safeStorage";
import { useUserData } from "../useUserData";

const mockSupabase = vi.mocked(supabase);
const mockUseAuth = vi.mocked(useAuth);
const mockSafeStorage = vi.mocked(safeStorage);

function buildSupabaseChain(result: unknown = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.upsert = vi.fn(() => Promise.resolve({ error: null }));
  chain.insert = vi.fn(() => Promise.resolve({ error: null }));
  chain.order = vi.fn(() => Promise.resolve({ data: [], error: null }));
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain as never;
}

describe("useUserData (unauthenticated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    mockSafeStorage.getJSON.mockImplementation((_key, fallback) => fallback);
  });

  it("isAuthenticated is false when user is null", () => {
    const { result } = renderHook(() => useUserData());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("exposes saveFormData, loadFormData, saveDifferentiationResult, loadDifferentiationResults, checkIsAdmin", () => {
    const { result } = renderHook(() => useUserData());
    expect(typeof result.current.saveFormData).toBe("function");
    expect(typeof result.current.loadFormData).toBe("function");
    expect(typeof result.current.saveDifferentiationResult).toBe("function");
    expect(typeof result.current.loadDifferentiationResults).toBe("function");
    expect(typeof result.current.checkIsAdmin).toBe("function");
  });

  it("saveFormData saves to localStorage when unauthenticated", async () => {
    const { result } = renderHook(() => useUserData());
    await act(async () => {
      await result.current.saveFormData("wizard", { businessField: "tech" });
    });
    expect(mockSafeStorage.setJSON).toHaveBeenCalledWith(
      "funnelforge-wizard",
      { businessField: "tech" }
    );
  });

  it("loadFormData returns from localStorage when unauthenticated", async () => {
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-wizard") return { businessField: "stored" };
      return fallback;
    });

    const { result } = renderHook(() => useUserData());
    let data: Record<string, unknown>;
    await act(async () => {
      data = await result.current.loadFormData("wizard", {});
    });
    expect(data!).toEqual({ businessField: "stored" });
  });

  it("loadFormData returns fallback when localStorage is empty", async () => {
    const { result } = renderHook(() => useUserData());
    let data: Record<string, unknown>;
    await act(async () => {
      data = await result.current.loadFormData("wizard", { default: true });
    });
    expect(data!).toEqual({ default: true });
  });

  it("saveDifferentiationResult saves result to localStorage when unauthenticated", async () => {
    const { result } = renderHook(() => useUserData());
    await act(async () => {
      await result.current.saveDifferentiationResult({ field: "test" }, { score: 90 });
    });
    expect(mockSafeStorage.setJSON).toHaveBeenCalledWith(
      "funnelforge-differentiation-result",
      { score: 90 }
    );
  });

  it("loadDifferentiationResults returns empty array when no cached data", async () => {
    mockSafeStorage.getJSON.mockReturnValue(null);
    const { result } = renderHook(() => useUserData());
    let data: unknown[];
    await act(async () => {
      data = await result.current.loadDifferentiationResults();
    });
    expect(data!).toEqual([]);
  });

  it("loadDifferentiationResults returns cached result wrapped in array", async () => {
    const cached = { score: 85 };
    mockSafeStorage.getJSON.mockImplementation((key) => {
      if (key === "funnelforge-differentiation-result") return cached;
      return null;
    });

    const { result } = renderHook(() => useUserData());
    let data: unknown[];
    await act(async () => {
      data = await result.current.loadDifferentiationResults();
    });
    expect(data!).toEqual([cached]);
  });

  it("checkIsAdmin returns false when unauthenticated", async () => {
    const { result } = renderHook(() => useUserData());
    let isAdmin: boolean;
    await act(async () => {
      isAdmin = await result.current.checkIsAdmin();
    });
    expect(isAdmin!).toBe(false);
  });
});

describe("useUserData (authenticated)", () => {
  const mockUser = { id: "user-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser } as ReturnType<typeof useAuth>);
    mockSafeStorage.getJSON.mockImplementation((_key, fallback) => fallback);
  });

  it("isAuthenticated is true when user is present", () => {
    const { result } = renderHook(() => useUserData());
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("saveFormData upserts to supabase when authenticated", async () => {
    const chain = buildSupabaseChain();
    mockSupabase.from = vi.fn(() => chain as never);

    const { result } = renderHook(() => useUserData());
    await act(async () => {
      await result.current.saveFormData("wizard", { field: "value" });
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("user_form_data");
  });

  it("loadFormData reads from supabase when authenticated", async () => {
    const chain = buildSupabaseChain({ data: { data: { field: "from-db" } }, error: null });
    mockSupabase.from = vi.fn(() => chain as never);

    const { result } = renderHook(() => useUserData());
    let data: Record<string, unknown>;
    await act(async () => {
      data = await result.current.loadFormData("wizard", {});
    });
    expect(data!).toEqual({ field: "from-db" });
  });

  it("checkIsAdmin queries user_roles table", async () => {
    const chain = buildSupabaseChain({ data: { role: "admin" }, error: null });
    mockSupabase.from = vi.fn(() => chain as never);

    const { result } = renderHook(() => useUserData());
    let isAdmin: boolean;
    await act(async () => {
      isAdmin = await result.current.checkIsAdmin();
    });
    expect(mockSupabase.from).toHaveBeenCalledWith("user_roles");
    expect(isAdmin!).toBe(true);
  });

  it("checkIsAdmin returns false when no admin role found", async () => {
    const chain = buildSupabaseChain({ data: null, error: null });
    mockSupabase.from = vi.fn(() => chain as never);

    const { result } = renderHook(() => useUserData());
    let isAdmin: boolean;
    await act(async () => {
      isAdmin = await result.current.checkIsAdmin();
    });
    expect(isAdmin!).toBe(false);
  });
});
