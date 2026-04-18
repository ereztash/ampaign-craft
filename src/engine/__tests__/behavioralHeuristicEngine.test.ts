// ═══════════════════════════════════════════════
// behavioralHeuristicEngine.test.ts
// Function + branch coverage for all 5 exported functions,
// all 5 archetypes, and L1–L5 resolution chain.
// ═══════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  deriveHeuristicSet,
  getL5CSSVars,
  getPrimaryCtaVerbs,
  getL3ComponentConfig,
  getActiveHeuristicIds,
  HEURISTIC_LIBRARY,
} from "../behavioralHeuristicEngine";
import type { ArchetypeId } from "@/types/archetype";

const ARCHETYPES: ArchetypeId[] = ["strategist", "optimizer", "pioneer", "connector", "closer"];

// ─────────────────────────────────────────────────────────────────────────────
// deriveHeuristicSet — all archetypes
// ─────────────────────────────────────────────────────────────────────────────

describe("deriveHeuristicSet — structure", () => {
  ARCHETYPES.forEach((archetype) => {
    it(`${archetype}: returns all L1–L5 layers`, () => {
      const set = deriveHeuristicSet(archetype);
      expect(set.archetypeId).toBe(archetype);
      expect(set.L1).toBeDefined();
      expect(set.L2).toBeDefined();
      expect(set.L3).toBeDefined();
      expect(set.L4).toBeDefined();
      expect(set.L5).toBeDefined();
    });

    it(`${archetype}: has at least 1 active heuristic`, () => {
      const set = deriveHeuristicSet(archetype);
      expect(set.activeHeuristics.length).toBeGreaterThan(0);
    });

    it(`${archetype}: activeHeuristics are all from HEURISTIC_LIBRARY`, () => {
      const set = deriveHeuristicSet(archetype);
      const libraryIds = HEURISTIC_LIBRARY.map((h) => h.id);
      for (const h of set.activeHeuristics) {
        expect(libraryIds).toContain(h.id);
      }
    });
  });
});

describe("deriveHeuristicSet — regulatory focus branches", () => {
  it("strategist → prevention focus", () => {
    expect(deriveHeuristicSet("strategist").regulatoryFocus).toBe("prevention");
  });

  it("connector → prevention focus", () => {
    expect(deriveHeuristicSet("connector").regulatoryFocus).toBe("prevention");
  });

  it("optimizer → promotion focus", () => {
    expect(deriveHeuristicSet("optimizer").regulatoryFocus).toBe("promotion");
  });

  it("pioneer → promotion focus", () => {
    expect(deriveHeuristicSet("pioneer").regulatoryFocus).toBe("promotion");
  });

  it("closer → promotion focus", () => {
    expect(deriveHeuristicSet("closer").regulatoryFocus).toBe("promotion");
  });
});

describe("deriveHeuristicSet — processing style branches", () => {
  it("strategist → systematic processing", () => {
    expect(deriveHeuristicSet("strategist").processingStyle).toBe("systematic");
  });

  it("optimizer → systematic processing", () => {
    expect(deriveHeuristicSet("optimizer").processingStyle).toBe("systematic");
  });

  it("pioneer → heuristic processing", () => {
    expect(deriveHeuristicSet("pioneer").processingStyle).toBe("heuristic");
  });

  it("connector → heuristic processing", () => {
    expect(deriveHeuristicSet("connector").processingStyle).toBe("heuristic");
  });

  it("closer → heuristic processing", () => {
    expect(deriveHeuristicSet("closer").processingStyle).toBe("heuristic");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getL5CSSVars
// ─────────────────────────────────────────────────────────────────────────────

describe("getL5CSSVars", () => {
  ARCHETYPES.forEach((archetype) => {
    it(`${archetype}: returns 3 CSS custom properties`, () => {
      const vars = getL5CSSVars(archetype);
      expect(vars["--motion-duration-multiplier"]).toBeDefined();
      expect(vars["--motion-easing"]).toBeDefined();
      expect(vars["--cta-font-weight"]).toBeDefined();
    });

    it(`${archetype}: motion-duration-multiplier is a numeric string`, () => {
      const vars = getL5CSSVars(archetype);
      expect(isNaN(Number(vars["--motion-duration-multiplier"]))).toBe(false);
    });
  });

  it("archetypes have distinct CSS vars (not all identical)", () => {
    const strategist = getL5CSSVars("strategist");
    const pioneer = getL5CSSVars("pioneer");
    // Pioneer is 'playful' — should have different motion from strategic 'minimal'
    expect(
      strategist["--motion-duration-multiplier"] !== pioneer["--motion-duration-multiplier"] ||
      strategist["--motion-easing"] !== pioneer["--motion-easing"]
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPrimaryCtaVerbs
// ─────────────────────────────────────────────────────────────────────────────

describe("getPrimaryCtaVerbs", () => {
  ARCHETYPES.forEach((archetype) => {
    it(`${archetype}: returns bilingual CTA verbs with primary and action`, () => {
      const verbs = getPrimaryCtaVerbs(archetype);
      expect(verbs.primary.he.length).toBeGreaterThan(0);
      expect(verbs.primary.en.length).toBeGreaterThan(0);
      expect(verbs.action.he.length).toBeGreaterThan(0);
      expect(verbs.action.en.length).toBeGreaterThan(0);
    });
  });

  it("closer CTA verbs are different from strategist CTA verbs", () => {
    const closer = getPrimaryCtaVerbs("closer");
    const strategist = getPrimaryCtaVerbs("strategist");
    expect(closer.primary.en).not.toBe(strategist.primary.en);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getL3ComponentConfig
// ─────────────────────────────────────────────────────────────────────────────

describe("getL3ComponentConfig", () => {
  ARCHETYPES.forEach((archetype) => {
    it(`${archetype}: returns a valid L3 component config`, () => {
      const config = getL3ComponentConfig(archetype);
      expect(config).toBeDefined();
      expect(typeof config).toBe("object");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getActiveHeuristicIds
// ─────────────────────────────────────────────────────────────────────────────

describe("getActiveHeuristicIds", () => {
  ARCHETYPES.forEach((archetype) => {
    it(`${archetype}: returns non-empty array of heuristic IDs`, () => {
      const ids = getActiveHeuristicIds(archetype);
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBeGreaterThan(0);
    });

    it(`${archetype}: all IDs start with 'H' (H1–H8 convention)`, () => {
      const ids = getActiveHeuristicIds(archetype);
      for (const id of ids) {
        expect(id.startsWith("H")).toBe(true);
      }
    });
  });

  it("different archetypes activate different heuristic subsets", () => {
    const strategistIds = getActiveHeuristicIds("strategist");
    const closerIds = getActiveHeuristicIds("closer");
    // Sets must differ in at least one ID
    const strategistSet = new Set(strategistIds);
    const closerSet = new Set(closerIds);
    const identical = strategistSet.size === closerSet.size &&
      [...strategistSet].every((id) => closerSet.has(id));
    expect(identical).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HEURISTIC_LIBRARY export
// ─────────────────────────────────────────────────────────────────────────────

describe("HEURISTIC_LIBRARY", () => {
  it("contains 8 heuristics (one per H1–H8 category)", () => {
    expect(HEURISTIC_LIBRARY.length).toBe(8);
  });

  it("each heuristic has id starting with H[1-8] and a principle", () => {
    for (const h of HEURISTIC_LIBRARY) {
      expect(h.id).toMatch(/^H[1-8]/);
      expect(h.principle.length).toBeGreaterThan(0);
    }
  });

  it("heuristic IDs are unique", () => {
    const ids = HEURISTIC_LIBRARY.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
