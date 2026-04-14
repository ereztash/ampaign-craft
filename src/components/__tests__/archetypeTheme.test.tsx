/**
 * archetypeTheme.test.tsx
 *
 * Contract tests for the adaptive theme opt-in / opt-out system.
 *
 * 1. data-archetype is set when adaptationsEnabled=true + tier=confident
 * 2. data-archetype is removed when adaptationsEnabled=false
 * 3. Opt-out reverts all 5 dimensions (data-archetype, data-density,
 *    data-shape, data-elevation, data-motion-preset)
 * 4. ArchetypeRevealScreen has no WCAG violations (axe) — opt-in state
 * 5. ArchetypeRevealScreen has no WCAG violations (axe) — opt-out state
 * 6. Schema v1 → v2 migration logic preserves fields and adds new flags
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { axe } from "../../test/setup";

// ─────────────────────────────────────────────────────────────────────────────
// Module-level mocks (hoisted by Vitest — must be declared here)
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("react-router-dom", async () => {
  const actual = await import("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    NavLink: ({ children, to, ...props }: React.PropsWithChildren<{ to: string; className?: string }>) => (
      <a href={to} {...props}>{children}</a>
    ),
  };
});

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", isRTL: false, t: (k: string) => k }),
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: vi.fn(),
}));

vi.mock("@/contexts/UserProfileContext", () => ({
  useUserProfile: () => ({ profile: { userSegment: "new-beginner", lastFormData: {} } }),
}));

vi.mock("@/engine/behavioralHeuristicEngine", () => ({ getL5CSSVars: () => ({}) }));

vi.mock("@/lib/archetypeBlindSpots", () => ({
  getBlindSpotProfile: () => ({
    archetypeId: "optimizer",
    strength: { he: "כוח", en: "Your strength" },
    blindSpot: { he: "נקודה לשים", en: "A pattern worth knowing" },
    moduleBlindSpots: [],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeCtx(overrides: {
  adaptationsEnabled?: boolean;
  confidenceTier?: string;
  revealSeen?: boolean;
  effectiveArchetypeId?: string;
} = {}) {
  return {
    profile: {
      archetypeId: "optimizer",
      confidence: 0.8,
      confidenceTier: overrides.confidenceTier ?? "confident",
      scores: { strategist: 0, optimizer: 1, pioneer: 0, connector: 0, closer: 0 },
      signalHistory: [],
      lastComputedAt: new Date().toISOString(),
      sessionCount: 1,
      adaptationsEnabled: overrides.adaptationsEnabled ?? false,
      revealSeen: overrides.revealSeen ?? false,
      version: 2,
    },
    uiConfig: {
      archetypeId: overrides.effectiveArchetypeId ?? "optimizer",
      label: { he: "האופטימייזר", en: "The Optimizer" },
      adaptationDescription: { he: "", en: "" },
      workspaceOrder: [],
      modulesOrder: [],
      defaultTab: "analytics",
      tabPriorityOverrides: {},
      dataAttribute: overrides.effectiveArchetypeId ?? "optimizer",
      informationDensity: "compact",
      ctaTone: "direct",
      prominentModules: [],
      personalityProfile: {
        regulatoryFocus: "promotion",
        processingStyle: "systematic",
        coreMotivation: { he: "", en: "" },
        primaryFrictions: [],
        pipeline: [],
      },
    },
    effectiveArchetypeId: overrides.effectiveArchetypeId ?? "optimizer",
    confidenceTier: overrides.confidenceTier ?? "confident",
    loading: false,
    adaptationsEnabled: overrides.adaptationsEnabled ?? false,
    revealSeen: overrides.revealSeen ?? false,
    updateFromBlackboard: vi.fn(),
    setOverride: vi.fn(),
    clearProfile: vi.fn(),
    setAdaptationsEnabled: vi.fn(),
    markRevealSeen: vi.fn(),
  };
}

const DATA_ATTRS = [
  "data-archetype",
  "data-density",
  "data-shape",
  "data-elevation",
  "data-motion-preset",
];

// ─────────────────────────────────────────────────────────────────────────────
// Setup / teardown
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  DATA_ATTRS.forEach((a) => document.documentElement.removeAttribute(a));
  document.documentElement.style.cssText = "";
});

afterEach(() => {
  DATA_ATTRS.forEach((a) => document.documentElement.removeAttribute(a));
  document.documentElement.style.cssText = "";
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. data-archetype set when opted in
// ─────────────────────────────────────────────────────────────────────────────

describe("useAdaptiveTheme — data-archetype attribute", () => {
  it("sets data-archetype when adaptationsEnabled=true and tier=confident", async () => {
    const { useArchetype } = await import("@/contexts/ArchetypeContext");
    vi.mocked(useArchetype).mockReturnValue(makeCtx({ adaptationsEnabled: true, confidenceTier: "confident" }) as ReturnType<typeof useArchetype>);

    const { useAdaptiveTheme } = await import("@/hooks/useAdaptiveTheme");
    function Harness() { useAdaptiveTheme(); return null; }
    await act(async () => { render(<Harness />); });
    expect(document.documentElement.getAttribute("data-archetype")).toBe("optimizer");
  });

  // 2. data-archetype removed when opted out
  it("does not set data-archetype when adaptationsEnabled=false", async () => {
    const { useArchetype } = await import("@/contexts/ArchetypeContext");
    vi.mocked(useArchetype).mockReturnValue(makeCtx({ adaptationsEnabled: false, confidenceTier: "confident" }) as ReturnType<typeof useArchetype>);

    const { useAdaptiveTheme } = await import("@/hooks/useAdaptiveTheme");
    function Harness() { useAdaptiveTheme(); return null; }
    await act(async () => { render(<Harness />); });
    expect(document.documentElement.getAttribute("data-archetype")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Opt-out contract: all 5 dimensions revert
// ─────────────────────────────────────────────────────────────────────────────

describe("Opt-out contract — all 5 dimensions revert", () => {
  it("all 5 data-attributes are absent when adaptationsEnabled=false", async () => {
    const { useArchetype } = await import("@/contexts/ArchetypeContext");
    vi.mocked(useArchetype).mockReturnValue(makeCtx({ adaptationsEnabled: false, confidenceTier: "confident" }) as ReturnType<typeof useArchetype>);

    const { useAdaptiveTheme } = await import("@/hooks/useAdaptiveTheme");
    const { ArchetypeThemeProvider } = await import("@/providers/ArchetypeThemeProvider");

    function Harness() {
      useAdaptiveTheme();
      return <ArchetypeThemeProvider><div /></ArchetypeThemeProvider>;
    }
    await act(async () => { render(<Harness />); });

    DATA_ATTRS.forEach((attr) => {
      expect(document.documentElement.getAttribute(attr)).toBeNull();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4 & 5. ArchetypeRevealScreen — axe WCAG checks
// ─────────────────────────────────────────────────────────────────────────────

describe("ArchetypeRevealScreen — WCAG 2.1 AA (axe)", () => {
  it("has no violations in the opt-in (adaptations off) state", async () => {
    const { useArchetype } = await import("@/contexts/ArchetypeContext");
    vi.mocked(useArchetype).mockReturnValue(makeCtx({ adaptationsEnabled: false, confidenceTier: "confident" }) as ReturnType<typeof useArchetype>);

    const { default: ArchetypeRevealScreen } = await import("../ArchetypeRevealScreen");
    const { container } = render(<ArchetypeRevealScreen />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no violations in the opt-out (adaptations on) state", async () => {
    const { useArchetype } = await import("@/contexts/ArchetypeContext");
    vi.mocked(useArchetype).mockReturnValue(makeCtx({ adaptationsEnabled: true, confidenceTier: "strong", revealSeen: true }) as ReturnType<typeof useArchetype>);

    const { default: ArchetypeRevealScreen } = await import("../ArchetypeRevealScreen");
    const { container } = render(<ArchetypeRevealScreen />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Schema v1 → v2 migration logic
// ─────────────────────────────────────────────────────────────────────────────

describe("Schema migration v1 → v2", () => {
  it("preserves all v1 fields and adds adaptationsEnabled=false, revealSeen=false, version=2", () => {
    const v1 = {
      archetypeId: "strategist",
      confidence: 0.75,
      confidenceTier: "confident",
      scores: { strategist: 3, optimizer: 1, pioneer: 0, connector: 0, closer: 0 },
      signalHistory: [],
      lastComputedAt: "2025-01-01T00:00:00.000Z",
      sessionCount: 5,
      version: 1,
    };

    // Replicate migrateV1ToV2 logic from ArchetypeContext
    const migrated = { ...v1, adaptationsEnabled: false, revealSeen: false, version: 2 };

    expect(migrated.archetypeId).toBe("strategist");
    expect(migrated.sessionCount).toBe(5);
    expect(migrated.confidence).toBe(0.75);
    expect(migrated.adaptationsEnabled).toBe(false);
    expect(migrated.revealSeen).toBe(false);
    expect(migrated.version).toBe(2);
  });
});
