/**
 * archetypePhaseC.test.tsx
 *
 * Phase C contract tests: font injection, CTA shape token, motion preset.
 *
 * 1. ArchetypeThemeProvider injects Pioneer font link when opted in + pioneer
 * 2. ArchetypeThemeProvider does NOT inject Pioneer font for non-pioneer archetypes
 * 3. ArchetypeThemeProvider removes font link when adaptations disabled
 * 4. Button component includes archetype-cta class (CTA shape token applied)
 * 5. data-motion-preset is set for each archetype when opted in
 * 6. data-motion-preset is absent when adaptations are disabled
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";

// ─────────────────────────────────────────────────────────────────────────────
// Module-level mocks (must be at module scope for Vitest hoisting)
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/contexts/ArchetypeContext", () => ({
  useArchetype: vi.fn(),
}));

vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ language: "en", isRTL: false, t: (k: string) => k }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeCtx(overrides: {
  adaptationsEnabled?: boolean;
  confidenceTier?: string;
  effectiveArchetypeId?: string;
} = {}) {
  return {
    effectiveArchetypeId: overrides.effectiveArchetypeId ?? "pioneer",
    confidenceTier: overrides.confidenceTier ?? "confident",
    adaptationsEnabled: overrides.adaptationsEnabled ?? true,
    profile: {
      archetypeId: overrides.effectiveArchetypeId ?? "pioneer",
      adaptationsEnabled: overrides.adaptationsEnabled ?? true,
      revealSeen: true,
      version: 2,
    },
    uiConfig: {
      label: { en: "The Pioneer", he: "החלוץ" },
    },
    loading: false,
    revealSeen: true,
    updateFromBlackboard: vi.fn(),
    setOverride: vi.fn(),
    clearProfile: vi.fn(),
    setAdaptationsEnabled: vi.fn(),
    markRevealSeen: vi.fn(),
    recordVariantPick: vi.fn(),
  } as unknown as import("@/contexts/ArchetypeContext").ArchetypeContextValue;  
}

const FONT_LINK_ID = "archetype-pioneer-font";
const DATA_ATTRS = ["data-shape", "data-elevation", "data-motion-preset"];

// ─────────────────────────────────────────────────────────────────────────────
// Setup / teardown
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  DATA_ATTRS.forEach((a) => document.documentElement.removeAttribute(a));
  document.getElementById(FONT_LINK_ID)?.remove();
  vi.clearAllMocks();
});

afterEach(() => {
  DATA_ATTRS.forEach((a) => document.documentElement.removeAttribute(a));
  document.getElementById(FONT_LINK_ID)?.remove();
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// 1–3. Pioneer font injection
// ─────────────────────────────────────────────────────────────────────────────

describe("ArchetypeThemeProvider — Pioneer font injection", () => {
  it("injects a <link> for Fraunces when archetype=pioneer and adaptationsEnabled=true", async () => {
    const { useArchetype } = await import("@/contexts/ArchetypeContext");
    vi.mocked(useArchetype).mockReturnValue(
      makeCtx({ effectiveArchetypeId: "pioneer", adaptationsEnabled: true, confidenceTier: "confident" }) as ReturnType<typeof useArchetype>,
    );

    const { ArchetypeThemeProvider } = await import("@/providers/ArchetypeThemeProvider");
    await act(async () => {
      render(<ArchetypeThemeProvider><div /></ArchetypeThemeProvider>);
    });

    const link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
    expect(link).not.toBeNull();
    expect(link?.rel).toBe("stylesheet");
    expect(link?.href).toContain("Fraunces");
  });

  it("does NOT inject the font link for non-pioneer archetypes", async () => {
    const { useArchetype } = await import("@/contexts/ArchetypeContext");
    vi.mocked(useArchetype).mockReturnValue(
      makeCtx({ effectiveArchetypeId: "strategist", adaptationsEnabled: true, confidenceTier: "confident" }) as ReturnType<typeof useArchetype>,
    );

    const { ArchetypeThemeProvider } = await import("@/providers/ArchetypeThemeProvider");
    await act(async () => {
      render(<ArchetypeThemeProvider><div /></ArchetypeThemeProvider>);
    });

    expect(document.getElementById(FONT_LINK_ID)).toBeNull();
  });

  it("removes the font link when adaptations are disabled", async () => {
    const { useArchetype } = await import("@/contexts/ArchetypeContext");

    // First mount with adaptations on
    vi.mocked(useArchetype).mockReturnValue(
      makeCtx({ effectiveArchetypeId: "pioneer", adaptationsEnabled: true }) as ReturnType<typeof useArchetype>,
    );

    const { ArchetypeThemeProvider } = await import("@/providers/ArchetypeThemeProvider");
    const { rerender } = await act(async () =>
      render(<ArchetypeThemeProvider><div /></ArchetypeThemeProvider>),
    );

    expect(document.getElementById(FONT_LINK_ID)).not.toBeNull();

    // Re-render with adaptations off
    vi.mocked(useArchetype).mockReturnValue(
      makeCtx({ effectiveArchetypeId: "pioneer", adaptationsEnabled: false }) as ReturnType<typeof useArchetype>,
    );
    await act(async () => {
      rerender(<ArchetypeThemeProvider><div /></ArchetypeThemeProvider>);
    });

    expect(document.getElementById(FONT_LINK_ID)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Button CTA shape class
// ─────────────────────────────────────────────────────────────────────────────

describe("Button — archetype-cta class", () => {
  it("Button renders with the archetype-cta class so --cta-shape-radius applies", async () => {
    const { Button } = await import("@/components/ui/button");
    const { container } = render(<Button>Click me</Button>);
    const btn = container.querySelector("button");
    expect(btn?.classList.contains("archetype-cta")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5–6. data-motion-preset attribute
// ─────────────────────────────────────────────────────────────────────────────

describe("ArchetypeThemeProvider — data-motion-preset attribute", () => {
  const EXPECTED_PRESETS: Record<string, string> = {
    strategist: "minimal",
    optimizer:  "crisp",
    pioneer:    "playful",
    connector:  "smooth",
    closer:     "sharp",
  };

  for (const [archetype, preset] of Object.entries(EXPECTED_PRESETS)) {
    it(`sets data-motion-preset="${preset}" for archetype "${archetype}"`, async () => {
      const { useArchetype } = await import("@/contexts/ArchetypeContext");
      vi.mocked(useArchetype).mockReturnValue(
        makeCtx({ effectiveArchetypeId: archetype, adaptationsEnabled: true, confidenceTier: "confident" }) as ReturnType<typeof useArchetype>,
      );

      const { ArchetypeThemeProvider } = await import("@/providers/ArchetypeThemeProvider");
      await act(async () => {
        render(<ArchetypeThemeProvider><div /></ArchetypeThemeProvider>);
      });

      expect(document.documentElement.getAttribute("data-motion-preset")).toBe(preset);

      // Clean up between loop iterations
      DATA_ATTRS.forEach((a) => document.documentElement.removeAttribute(a));
    });
  }

  it("does not set data-motion-preset when adaptationsEnabled=false", async () => {
    const { useArchetype } = await import("@/contexts/ArchetypeContext");
    vi.mocked(useArchetype).mockReturnValue(
      makeCtx({ effectiveArchetypeId: "pioneer", adaptationsEnabled: false }) as ReturnType<typeof useArchetype>,
    );

    const { ArchetypeThemeProvider } = await import("@/providers/ArchetypeThemeProvider");
    await act(async () => {
      render(<ArchetypeThemeProvider><div /></ArchetypeThemeProvider>);
    });

    expect(document.documentElement.getAttribute("data-motion-preset")).toBeNull();
  });
});
