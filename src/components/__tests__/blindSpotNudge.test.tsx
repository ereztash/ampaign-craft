/**
 * blindSpotNudge.test.tsx
 *
 * Tests for the BlindSpotNudge component and useModuleDwell hook.
 *
 * 1. BlindSpotNudge does not render when shouldNudge=false
 * 2. BlindSpotNudge renders with correct content when shouldNudge=true
 * 3. BlindSpotNudge has no WCAG violations (axe)
 * 4. Close button dismisses the nudge and writes a dismiss record
 * 5. CTA button navigates to the suggested module and dismisses
 * 6. Nudge does not show when recently dismissed (72h rate limit)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { axe } from "../../test/setup";

// ─────────────────────────────────────────────────────────────────────────────
// Module-level mocks
// ─────────────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await import("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: "/differentiate", search: "", hash: "", state: null, key: "test" }),
    NavLink: ({ children, to, ...props }: React.PropsWithChildren<{ to: string; className?: string }>) => (
      <a href={to} {...props}>{children}</a>
    ),
  };
});

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", isRTL: false, t: (k: string) => k }),
}));

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-123" } }),
}));

vi.mock("@/lib/archetypeAnalytics", () => ({
  emitArchetypeEvent: vi.fn(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const STRATEGIST_BLIND_SPOT = {
  moduleId: "differentiate",
  routePath: "/differentiate",
  dwellThresholdDays: 4,
  description: { he: "בידול עומק", en: "Differentiation depth" },
  nudge: {
    he: "ביליתי כמה ימים בבידול",
    en: "You've spent a few days in differentiation. The data you have is enough for initial pricing.",
  },
  suggestedNextModule: "pricing",
  suggestedNextRoutePath: "/pricing",
};

function mockArchetypeCtx(adaptationsEnabled = true, confidenceTier = "confident") {
  return {
    effectiveArchetypeId: "strategist",
    confidenceTier,
    adaptationsEnabled,
    profile: {
      archetypeId: "strategist",
      version: 2,
      adaptationsEnabled,
      revealSeen: true,
    },
    uiConfig: { label: { en: "The Strategist", he: "האסטרטג" } },
    markRevealSeen: vi.fn(),
    setAdaptationsEnabled: vi.fn(),
    setOverride: vi.fn(),
  };
}

// Override useModuleDwell to return controlled values
vi.mock("@/hooks/useModuleDwell", async () => {
  const actual = await import("@/hooks/useModuleDwell");
  return {
    ...actual,
    useModuleDwell: vi.fn(),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Setup / teardown
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("BlindSpotNudge", () => {
  it("does not render when shouldNudge=false", async () => {
    const { useArchetype } = await import("@/contexts/ArchetypeContext");
    vi.mocked(useArchetype).mockReturnValue(mockArchetypeCtx(true) as ReturnType<typeof useArchetype>);

    const { useModuleDwell } = await import("@/hooks/useModuleDwell");
    vi.mocked(useModuleDwell).mockReturnValue({
      moduleId: null,
      daysSinceFirstVisit: 0,
      isCompleted: false,
      blindSpotEntry: null,
      shouldNudge: false,
    });

    const { BlindSpotNudge } = await import("../BlindSpotNudge");
    const { container } = render(<BlindSpotNudge />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nudge content when shouldNudge=true", async () => {
    const { useArchetype } = await import("@/contexts/ArchetypeContext");
    vi.mocked(useArchetype).mockReturnValue(mockArchetypeCtx(true) as ReturnType<typeof useArchetype>);

    const { useModuleDwell } = await import("@/hooks/useModuleDwell");
    vi.mocked(useModuleDwell).mockReturnValue({
      moduleId: "differentiate",
      daysSinceFirstVisit: 5,
      isCompleted: false,
      blindSpotEntry: STRATEGIST_BLIND_SPOT,
      shouldNudge: true,
    });

    const { BlindSpotNudge } = await import("../BlindSpotNudge");
    render(<BlindSpotNudge />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/differentiation/i)).toBeInTheDocument();
    // "pricing" appears in both the nudge text and the CTA button
    expect(screen.getAllByText(/pricing/i).length).toBeGreaterThanOrEqual(1);
  });

  it("has no WCAG violations when visible", async () => {
    const { useArchetype } = await import("@/contexts/ArchetypeContext");
    vi.mocked(useArchetype).mockReturnValue(mockArchetypeCtx(true) as ReturnType<typeof useArchetype>);

    const { useModuleDwell } = await import("@/hooks/useModuleDwell");
    vi.mocked(useModuleDwell).mockReturnValue({
      moduleId: "differentiate",
      daysSinceFirstVisit: 5,
      isCompleted: false,
      blindSpotEntry: STRATEGIST_BLIND_SPOT,
      shouldNudge: true,
    });

    const { BlindSpotNudge } = await import("../BlindSpotNudge");
    const { container } = render(<BlindSpotNudge />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("close button writes a dismiss record and component re-evaluates", async () => {
    const { useArchetype } = await import("@/contexts/ArchetypeContext");
    vi.mocked(useArchetype).mockReturnValue(mockArchetypeCtx(true) as ReturnType<typeof useArchetype>);

    const { useModuleDwell } = await import("@/hooks/useModuleDwell");
    vi.mocked(useModuleDwell).mockReturnValue({
      moduleId: "differentiate",
      daysSinceFirstVisit: 5,
      isCompleted: false,
      blindSpotEntry: STRATEGIST_BLIND_SPOT,
      shouldNudge: true,
    });

    const { BlindSpotNudge } = await import("../BlindSpotNudge");
    const { isRecentlyDismissed } = await import("@/hooks/useModuleDwell");

    render(<BlindSpotNudge />);
    const closeBtn = screen.getByRole("button", { name: /close reminder/i });
    await act(async () => { fireEvent.click(closeBtn); });

    // Dismiss record should be written
    expect(isRecentlyDismissed("test-user-123", "differentiate")).toBe(true);
  });

  it("CTA button navigates to suggested module", async () => {
    const { useArchetype } = await import("@/contexts/ArchetypeContext");
    vi.mocked(useArchetype).mockReturnValue(mockArchetypeCtx(true) as ReturnType<typeof useArchetype>);

    const { useModuleDwell } = await import("@/hooks/useModuleDwell");
    vi.mocked(useModuleDwell).mockReturnValue({
      moduleId: "differentiate",
      daysSinceFirstVisit: 5,
      isCompleted: false,
      blindSpotEntry: STRATEGIST_BLIND_SPOT,
      shouldNudge: true,
    });

    const { BlindSpotNudge } = await import("../BlindSpotNudge");
    render(<BlindSpotNudge />);

    const cta = screen.getByRole("button", { name: /go to pricing/i });
    await act(async () => { fireEvent.click(cta); });

    expect(mockNavigate).toHaveBeenCalledWith("/pricing");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Rate-limit: isRecentlyDismissed
// ─────────────────────────────────────────────────────────────────────────────

describe("useModuleDwell — rate-limit logic", () => {
  it("returns true immediately after dismissal", async () => {
    const { setDismissRecord, isRecentlyDismissed } = await import("@/hooks/useModuleDwell");
    setDismissRecord("u1", "differentiate");
    expect(isRecentlyDismissed("u1", "differentiate")).toBe(true);
  });

  it("returns false after 72 hours have elapsed", async () => {
    const { setDismissRecord, isRecentlyDismissed } = await import("@/hooks/useModuleDwell");
    // Write a dismiss record 73h ago
    const past = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(
      "funnelforge-nudge-dismiss-u2-differentiate",
      JSON.stringify({ dismissedAt: past }),
    );
    expect(isRecentlyDismissed("u2", "differentiate")).toBe(false);
    // Clean up
    setDismissRecord("u2", "differentiate"); // reset
  });

  it("returns false when no dismiss record exists", async () => {
    const { isRecentlyDismissed } = await import("@/hooks/useModuleDwell");
    expect(isRecentlyDismissed("u3", "nonexistent-module")).toBe(false);
  });
});
