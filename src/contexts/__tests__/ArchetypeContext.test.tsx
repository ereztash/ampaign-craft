import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useContext, ReactNode } from "react";
import { ArchetypeProvider, useArchetype, ArchetypeContextValue } from "../ArchetypeContext";

// Mock dependencies
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({ user: null })),
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

vi.mock("@/engine/archetypeClassifier", () => ({
  classifyArchetype: vi.fn(() => ({
    archetypeId: "strategist",
    confidence: 0.85,
    confidenceTier: "strong",
    scores: { strategist: 85, optimizer: 10, pioneer: 5, connector: 0, closer: 0 },
    signals: [],
  })),
  blendScores: vi.fn((_newScores: Record<string, number>, _prevScores: Record<string, number>) => ({
    strategist: 85, optimizer: 10, pioneer: 5, connector: 0, closer: 0,
  })),
}));

vi.mock("@/lib/archetypeUIConfig", () => ({
  getArchetypeUIConfig: vi.fn(() => ({
    ctaTone: "authority",
    informationDensity: "comfortable",
    personalityProfile: {
      pipeline: [],
    },
    themePack: {},
  })),
}));

// Import mocked modules for assertion
import { useAuth } from "@/contexts/AuthContext";
import { safeStorage } from "@/lib/safeStorage";

const mockUseAuth = vi.mocked(useAuth);
const mockSafeStorage = vi.mocked(safeStorage);

// ─── Test Consumer ───────────────────────────────────────────────────────────

const TestConsumer = ({ onCtx }: { onCtx?: (ctx: ArchetypeContextValue) => void }) => {
  const ctx = useArchetype();
  onCtx?.(ctx);
  return (
    <div>
      <span data-testid="archetype">{ctx.effectiveArchetypeId}</span>
      <span data-testid="tier">{ctx.confidenceTier}</span>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="adaptations">{String(ctx.adaptationsEnabled)}</span>
      <span data-testid="reveal">{String(ctx.revealSeen)}</span>
    </div>
  );
};

function renderWithProvider(ui: ReactNode) {
  return render(<ArchetypeProvider>{ui}</ArchetypeProvider>);
}

// ─────────────────────────────────────────────────────────────────────────────

describe("ArchetypeContext — default (cold start, no user)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    mockSafeStorage.getJSON.mockReturnValue(null);
  });

  it("renders with cold-start defaults — optimizer archetype", () => {
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("archetype").textContent).toBe("optimizer");
  });

  it("confidenceTier is 'none' at cold start", () => {
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("tier").textContent).toBe("none");
  });

  it("adaptationsEnabled is false at cold start", () => {
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("adaptations").textContent).toBe("false");
  });

  it("revealSeen is false at cold start", () => {
    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("reveal").textContent).toBe("false");
  });

  it("loading transitions to false after hydration", () => {
    renderWithProvider(<TestConsumer />);
    // After render effect runs
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });
});

describe("ArchetypeContext — with stored profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } } as ReturnType<typeof useAuth>);
  });

  it("loads stored v2 profile from localStorage", () => {
    const storedProfile = {
      archetypeId: "strategist",
      confidence: 0.9,
      confidenceTier: "strong",
      scores: { strategist: 90, optimizer: 5, pioneer: 3, connector: 1, closer: 1 },
      signalHistory: [],
      lastComputedAt: new Date().toISOString(),
      sessionCount: 5,
      adaptationsEnabled: true,
      revealSeen: true,
      version: 2,
    };
    mockSafeStorage.getJSON.mockReturnValue(storedProfile);

    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("archetype").textContent).toBe("strategist");
    expect(screen.getByTestId("tier").textContent).toBe("strong");
    expect(screen.getByTestId("adaptations").textContent).toBe("true");
  });

  it("overrideByUser takes precedence over archetypeId", () => {
    const storedProfile = {
      archetypeId: "optimizer",
      confidenceTier: "tentative",
      overrideByUser: "pioneer",
      scores: { strategist: 0, optimizer: 50, pioneer: 0, connector: 0, closer: 0 },
      signalHistory: [],
      lastComputedAt: new Date().toISOString(),
      sessionCount: 1,
      adaptationsEnabled: false,
      revealSeen: false,
      version: 2,
    };
    mockSafeStorage.getJSON.mockReturnValue(storedProfile);

    renderWithProvider(<TestConsumer />);
    expect(screen.getByTestId("archetype").textContent).toBe("pioneer");
    // Override forces "strong" tier
    expect(screen.getByTestId("tier").textContent).toBe("strong");
  });
});

describe("ArchetypeContext — actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } } as ReturnType<typeof useAuth>);
    mockSafeStorage.getJSON.mockReturnValue(null);
  });

  it("setAdaptationsEnabled updates adaptationsEnabled to true", async () => {
    let ctx!: ArchetypeContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.setAdaptationsEnabled(true);
    });

    expect(screen.getByTestId("adaptations").textContent).toBe("true");
  });

  it("markRevealSeen updates revealSeen to true", async () => {
    let ctx!: ArchetypeContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.markRevealSeen();
    });

    expect(screen.getByTestId("reveal").textContent).toBe("true");
  });

  it("markRevealSeen is idempotent", async () => {
    let ctx!: ArchetypeContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.markRevealSeen();
      ctx.markRevealSeen();
    });

    expect(screen.getByTestId("reveal").textContent).toBe("true");
  });

  it("setOverride changes effectiveArchetypeId", async () => {
    let ctx!: ArchetypeContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.setOverride("closer");
    });

    expect(screen.getByTestId("archetype").textContent).toBe("closer");
  });

  it("setOverride(null) clears the override", async () => {
    let ctx!: ArchetypeContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.setOverride("closer");
    });
    expect(screen.getByTestId("archetype").textContent).toBe("closer");

    await act(async () => {
      ctx.setOverride(null);
    });
    // Reverts to base archetypeId (optimizer cold-start)
    expect(screen.getByTestId("archetype").textContent).toBe("optimizer");
  });

  it("clearProfile resets to cold-start state", async () => {
    const storedProfile = {
      archetypeId: "strategist",
      confidence: 0.9,
      confidenceTier: "strong",
      scores: { strategist: 90, optimizer: 5, pioneer: 3, connector: 1, closer: 1 },
      signalHistory: [],
      lastComputedAt: new Date().toISOString(),
      sessionCount: 5,
      adaptationsEnabled: true,
      revealSeen: true,
      version: 2,
    };
    mockSafeStorage.getJSON.mockReturnValue(storedProfile);

    let ctx!: ArchetypeContextValue;
    renderWithProvider(<TestConsumer onCtx={(c) => { ctx = c; }} />);

    await act(async () => {
      ctx.clearProfile();
    });

    expect(screen.getByTestId("archetype").textContent).toBe("optimizer");
    expect(screen.getByTestId("tier").textContent).toBe("none");
  });
});

describe("ArchetypeContext — useArchetype guard", () => {
  it("throws when used outside provider", () => {
    const ThrowingComponent = () => {
      useArchetype();
      return null;
    };
    expect(() => render(<ThrowingComponent />)).toThrow(
      "useArchetype must be used within ArchetypeProvider"
    );
  });
});
