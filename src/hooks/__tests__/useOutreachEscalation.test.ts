import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(() => Promise.resolve({ error: null })),
    },
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: vi.fn(() => ({ language: "he" })),
}));

vi.mock("../useModuleDwell", () => ({
  useModuleDwell: vi.fn(),
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
import { useArchetype } from "@/contexts/ArchetypeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useModuleDwell } from "../useModuleDwell";
import { safeStorage } from "@/lib/safeStorage";
import { useOutreachEscalation } from "../useOutreachEscalation";

const mockSupabase = vi.mocked(supabase);
const mockUseArchetype = vi.mocked(useArchetype);
const mockUseAuth = vi.mocked(useAuth);
const mockUseModuleDwell = vi.mocked(useModuleDwell);
const mockSafeStorage = vi.mocked(safeStorage);

function makeArchetypeContext(overrides = {}) {
  return {
    effectiveArchetypeId: "optimizer",
    adaptationsEnabled: true,
    confidenceTier: "confident",
    ...overrides,
  } as unknown as ReturnType<typeof useArchetype>;
}

function makeModuleDwellResult(overrides = {}) {
  return {
    moduleId: "wizard",
    daysSinceFirstVisit: 10,
    isCompleted: false,
    shouldNudge: true,
    blindSpotEntry: null,
    ...overrides,
  } as ReturnType<typeof useModuleDwell>;
}

describe("useOutreachEscalation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } } as ReturnType<typeof useAuth>);
    mockUseArchetype.mockReturnValue(makeArchetypeContext());
    mockUseModuleDwell.mockReturnValue(makeModuleDwellResult());
    mockSafeStorage.getJSON.mockReturnValue(null); // no recent outreach
    mockSupabase.functions.invoke = vi.fn().mockResolvedValue({ error: null });
  });

  it("does not call supabase when user is not logged in", async () => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    renderHook(() => useOutreachEscalation());
    await waitFor(() => {});
    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("does not call supabase when adaptationsEnabled is false", async () => {
    mockUseArchetype.mockReturnValue(makeArchetypeContext({ adaptationsEnabled: false }));
    renderHook(() => useOutreachEscalation());
    await waitFor(() => {});
    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("does not call supabase when moduleId is null", async () => {
    mockUseModuleDwell.mockReturnValue(makeModuleDwellResult({ moduleId: null }));
    renderHook(() => useOutreachEscalation());
    await waitFor(() => {});
    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("does not call supabase when isCompleted is true", async () => {
    mockUseModuleDwell.mockReturnValue(makeModuleDwellResult({ isCompleted: true }));
    renderHook(() => useOutreachEscalation());
    await waitFor(() => {});
    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("does not call supabase when shouldNudge is false", async () => {
    mockUseModuleDwell.mockReturnValue(makeModuleDwellResult({ shouldNudge: false }));
    renderHook(() => useOutreachEscalation());
    await waitFor(() => {});
    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("does not call supabase when daysSinceFirstVisit < 7", async () => {
    mockUseModuleDwell.mockReturnValue(makeModuleDwellResult({ daysSinceFirstVisit: 5 }));
    renderHook(() => useOutreachEscalation());
    await waitFor(() => {});
    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("does not call supabase when user was recently outreached", async () => {
    const recentOutreach = {
      moduleId: "wizard",
      channel: "in_app",
      dispatchedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    };
    mockSafeStorage.getJSON.mockImplementation((key) => {
      if (key.includes("outreach-sent-user-1-wizard")) return recentOutreach;
      return null;
    });

    renderHook(() => useOutreachEscalation());
    await waitFor(() => {});
    expect(mockSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("calls supabase outreach-agent when all conditions are met", async () => {
    renderHook(() => useOutreachEscalation());
    await waitFor(() => expect(mockSupabase.functions.invoke).toHaveBeenCalled());

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
      "outreach-agent",
      expect.objectContaining({
        body: expect.objectContaining({
          moduleId: "wizard",
          channel: "in_app",
        }),
      })
    );
  });

  it("marks outreach record in storage after successful invoke", async () => {
    renderHook(() => useOutreachEscalation());
    await waitFor(() => expect(mockSupabase.functions.invoke).toHaveBeenCalled());
    // Wait for async post-invoke storage write
    await waitFor(() =>
      expect(mockSafeStorage.setJSON).toHaveBeenCalledWith(
        expect.stringContaining("outreach-sent-user-1-wizard"),
        expect.objectContaining({ moduleId: "wizard" })
      )
    );
  });

  it("does not double-fire for the same module on rerender", async () => {
    const { rerender } = renderHook(() => useOutreachEscalation());
    await waitFor(() => expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(1));
    rerender();
    expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(1);
  });

  it("uses the provided channel argument", async () => {
    renderHook(() => useOutreachEscalation("email"));
    await waitFor(() => expect(mockSupabase.functions.invoke).toHaveBeenCalled());
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
      "outreach-agent",
      expect.objectContaining({
        body: expect.objectContaining({ channel: "email" }),
      })
    );
  });
});
