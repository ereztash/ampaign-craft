import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { ReactNode } from "react";

// Force AuthContext.checkSupabase() -> false so init() takes the local-auth
// path. vitest.config.ts defines a placeholder VITE_SUPABASE_URL so Supabase
// client instantiation does not throw; this test needs the opposite.
beforeAll(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
});
afterAll(() => {
  vi.unstubAllEnvs();
});

import { AuthProvider, useAuth } from "../AuthContext";

// Mock Supabase with a controlled head response
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
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

vi.mock("@/lib/validateEnv", () => ({
  ALLOW_LOCAL_AUTH: true,
}));

vi.mock("@/lib/analytics", () => ({
  Analytics: {
    signupFromShare: vi.fn(),
  },
  getUTM: vi.fn(() => ({})),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Force Supabase check to return false (unavailable) so we use local auth
globalThis.fetch = vi.fn(() =>
  Promise.resolve({ ok: false, status: 503 } as Response)
) as typeof fetch;

import { safeStorage } from "@/lib/safeStorage";
const mockSafeStorage = vi.mocked(safeStorage);

// ─── Test Consumer ────────────────────────────────────────────────────────────

const TestConsumer = () => {
  const ctx = useAuth();
  return (
    <div>
      <span data-testid="user">{ctx.user?.email ?? "null"}</span>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="tier">{ctx.tier}</span>
      <span data-testid="isLocalAuth">{String(ctx.isLocalAuth)}</span>
    </div>
  );
};

function renderWithProvider(ui: ReactNode) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

describe("AuthContext — initial state (no session)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No stored session or users
    mockSafeStorage.getJSON.mockImplementation((_key, fallback) => fallback);
    mockSafeStorage.getString.mockReturnValue("");
  });

  it("renders without crashing", async () => {
    renderWithProvider(<TestConsumer />);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
  });

  it("user is null when no session is stored", async () => {
    renderWithProvider(<TestConsumer />);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("tier defaults to 'free'", async () => {
    renderWithProvider(<TestConsumer />);
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("tier").textContent).toBe("free");
  });

  it("exposes canUse, canPerform, signUp, signIn, signOut, setTier, refreshTier functions", async () => {
    let ctx!: ReturnType<typeof useAuth>;
    const Capture = () => {
      ctx = useAuth();
      return null;
    };
    renderWithProvider(<Capture />);
    await waitFor(() => expect(ctx.loading).toBe(false));
    expect(typeof ctx.canUse).toBe("function");
    expect(typeof ctx.canPerform).toBe("function");
    expect(typeof ctx.signUp).toBe("function");
    expect(typeof ctx.signIn).toBe("function");
    expect(typeof ctx.signOut).toBe("function");
    expect(typeof ctx.setTier).toBe("function");
    expect(typeof ctx.refreshTier).toBe("function");
  });
});

describe("AuthContext — local auth sign up / sign in / sign out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure PBKDF2 is available in jsdom
    mockSafeStorage.getJSON.mockImplementation((_key, fallback) => fallback);
    mockSafeStorage.getString.mockReturnValue("");
  });

  it("signUp returns { error: null } for a new user", async () => {
    let ctx!: ReturnType<typeof useAuth>;
    const Capture = () => {
      ctx = useAuth();
      return null;
    };
    renderWithProvider(<Capture />);
    await waitFor(() => expect(ctx.loading).toBe(false));

    let result!: { error: string | null };
    await act(async () => {
      result = await ctx.signUp("test@example.com", "password123");
    });
    expect(result.error).toBeNull();
  });

  it("signUp registers user and sets user state", async () => {
    let ctx!: ReturnType<typeof useAuth>;
    const Capture = () => {
      ctx = useAuth();
      return null;
    };
    renderWithProvider(<Capture />);
    await waitFor(() => expect(ctx.loading).toBe(false));

    await act(async () => {
      await ctx.signUp("newuser@example.com", "pass123");
    });

    expect(ctx.user?.email).toBe("newuser@example.com");
  });

  it("signUp returns error when email already registered", async () => {
    // Simulate existing user in storage
    const existingUser = {
      id: "existing-id",
      email: "dup@example.com",
      displayName: "Dup",
      passwordHash: "some-hash",
      tier: "free",
      createdAt: new Date().toISOString(),
    };
    mockSafeStorage.getJSON.mockImplementation((key, fallback) => {
      if (key === "funnelforge-users") return [existingUser];
      if (key === "funnelforge-auth-version") return "v2";
      return fallback;
    });

    let ctx!: ReturnType<typeof useAuth>;
    const Capture = () => {
      ctx = useAuth();
      return null;
    };
    renderWithProvider(<Capture />);
    await waitFor(() => expect(ctx.loading).toBe(false));

    let result!: { error: string | null };
    await act(async () => {
      result = await ctx.signUp("dup@example.com", "password");
    });
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("already");
  });

  it("signIn returns error when user not found", async () => {
    let ctx!: ReturnType<typeof useAuth>;
    const Capture = () => {
      ctx = useAuth();
      return null;
    };
    renderWithProvider(<Capture />);
    await waitFor(() => expect(ctx.loading).toBe(false));

    let result!: { error: string | null };
    await act(async () => {
      result = await ctx.signIn("nobody@example.com", "password");
    });
    expect(result.error).toBeTruthy();
  });

  it("signOut clears user and resets tier to free", async () => {
    let ctx!: ReturnType<typeof useAuth>;
    const Capture = () => {
      ctx = useAuth();
      return null;
    };
    renderWithProvider(<Capture />);
    await waitFor(() => expect(ctx.loading).toBe(false));

    // Sign up first
    await act(async () => {
      await ctx.signUp("logout@example.com", "pass");
    });
    expect(ctx.user).not.toBeNull();

    await act(async () => {
      await ctx.signOut();
    });
    expect(ctx.user).toBeNull();
    expect(ctx.tier).toBe("free");
  });

  it("canUse returns true for features available on free tier", async () => {
    let ctx!: ReturnType<typeof useAuth>;
    const Capture = () => {
      ctx = useAuth();
      return null;
    };
    renderWithProvider(<Capture />);
    await waitFor(() => expect(ctx.loading).toBe(false));
    // maxFunnels is available on free tier (limited but > 0)
    expect(typeof ctx.canUse("maxFunnels")).toBe("boolean");
  });

  it("setTier changes the tier value", async () => {
    let ctx!: ReturnType<typeof useAuth>;
    const Capture = () => {
      ctx = useAuth();
      return null;
    };
    renderWithProvider(<Capture />);
    await waitFor(() => expect(ctx.loading).toBe(false));

    act(() => {
      ctx.setTier("pro");
    });
    expect(ctx.tier).toBe("pro");
  });
});

describe("AuthContext — useAuth guard", () => {
  it("throws when used outside AuthProvider", () => {
    const Thrower = () => {
      useAuth();
      return null;
    };
    expect(() => render(<Thrower />)).toThrow(
      "useAuth must be used within AuthProvider"
    );
  });
});
