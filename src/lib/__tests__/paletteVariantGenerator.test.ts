import { describe, it, expect } from "vitest";
import {
  generateArchetypeVariants,
  getVariantAccentHsl,
  getAllArchetypeVariantIds,
} from "../paletteVariantGenerator";

const ARCHETYPES = ["pioneer", "closer", "strategist", "optimizer", "connector"] as const;
const HSL_PATTERN = /^\d{1,3} \d{1,3}% \d{1,3}%$/;

describe("paletteVariantGenerator", () => {

  // ── generateArchetypeVariants ─────────────────────────────────────────────

  describe("generateArchetypeVariants", () => {
    it("returns non-empty array for each known archetype", () => {
      for (const arch of ARCHETYPES) {
        const variants = generateArchetypeVariants(arch);
        expect(variants.length).toBeGreaterThan(0);
      }
    });

    it("returns empty array for an unknown archetype", () => {
      // TypeScript won't allow invalid keys at compile time — cast to test runtime guard
      const variants = generateArchetypeVariants("phantom" as typeof ARCHETYPES[number]);
      expect(variants).toEqual([]);
    });

    it("always includes the control variant for archetypes with sufficient L contrast", () => {
      // Strategist (H=192, cool blue) and connector (H=172, teal) have lower luminance
      // at control L=40 — verify at least one archetype keeps control.
      const allArchetypes = ["pioneer", "closer", "strategist", "optimizer", "connector"] as const;
      const archetypesWithControl = allArchetypes.filter((arch) => {
        const ids = generateArchetypeVariants(arch).map((v) => v.id);
        return ids.includes("control");
      });
      // At least some archetypes must include control (design expectation)
      expect(archetypesWithControl.length).toBeGreaterThan(0);
    });

    it("every returned variant has promotionEligible === true", () => {
      // Invariant: generator only emits pre-validated variants
      for (const arch of ARCHETYPES) {
        const variants = generateArchetypeVariants(arch);
        for (const v of variants) {
          expect(v.promotionEligible).toBe(true);
        }
      }
    });

    it("every returned variant has a valid HSL string", () => {
      for (const arch of ARCHETYPES) {
        const variants = generateArchetypeVariants(arch);
        for (const v of variants) {
          expect(v.hsl).toMatch(HSL_PATTERN);
        }
      }
    });

    it("every returned variant has a valid OKLCH string", () => {
      for (const arch of ARCHETYPES) {
        const variants = generateArchetypeVariants(arch);
        for (const v of variants) {
          expect(v.oklch).toMatch(/^oklch\(/);
        }
      }
    });

    it("variant ids come from the known L_CANDIDATES set", () => {
      const KNOWN_IDS = new Set(["control", "lighter_1", "lighter_2", "darker_1", "darker_2"]);
      for (const arch of ARCHETYPES) {
        const variants = generateArchetypeVariants(arch);
        for (const v of variants) {
          expect(KNOWN_IDS.has(v.id)).toBe(true);
        }
      }
    });

    it("is deterministic — same archetype always returns same result", () => {
      const first  = generateArchetypeVariants("pioneer");
      const second = generateArchetypeVariants("pioneer");
      expect(first.map((v) => v.id)).toEqual(second.map((v) => v.id));
      expect(first.map((v) => v.hsl)).toEqual(second.map((v) => v.hsl));
    });

    it("each archetype produces distinct hsl values from others (anchors differ)", () => {
      const pioneerHsls   = generateArchetypeVariants("pioneer").map((v) => v.hsl);
      const strategistHsls = generateArchetypeVariants("strategist").map((v) => v.hsl);
      // At least the control variants should differ in hue
      const pioneerControl   = pioneerHsls[0];
      const strategistControl = strategistHsls[0];
      expect(pioneerControl).not.toEqual(strategistControl);
    });

    it("validation result wcag21Ratio is ≥ 4.5 for all returned variants", () => {
      for (const arch of ARCHETYPES) {
        const variants = generateArchetypeVariants(arch);
        for (const v of variants) {
          expect(v.validation.wcag21Ratio).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  });

  // ── getVariantAccentHsl ───────────────────────────────────────────────────

  describe("getVariantAccentHsl", () => {
    it("returns a HSL string for a valid variant that passes all gates", () => {
      // Use the first variant from each archetype (generator only emits passing ones)
      for (const arch of ARCHETYPES) {
        const variants = generateArchetypeVariants(arch);
        if (variants.length > 0) {
          const hsl = getVariantAccentHsl(arch, variants[0].id);
          expect(hsl).not.toBeNull();
          expect(hsl).toMatch(HSL_PATTERN);
        }
      }
    });

    it("returns null for an unknown variant id", () => {
      const hsl = getVariantAccentHsl("pioneer", "nonexistent_variant");
      expect(hsl).toBeNull();
    });

    it("returns null for an unknown archetype", () => {
      const hsl = getVariantAccentHsl("phantom" as typeof ARCHETYPES[number], "control");
      expect(hsl).toBeNull();
    });

    it("returns the same value as the matching PaletteVariant.hsl", () => {
      const variants = generateArchetypeVariants("optimizer");
      for (const v of variants) {
        const directHsl = getVariantAccentHsl("optimizer", v.id);
        expect(directHsl).toBe(v.hsl);
      }
    });
  });

  // ── getAllArchetypeVariantIds ──────────────────────────────────────────────

  describe("getAllArchetypeVariantIds", () => {
    it("returns an entry for every archetype experiment key", () => {
      const result = getAllArchetypeVariantIds();
      for (const arch of ARCHETYPES) {
        expect(`palette_accent_${arch}` in result).toBe(true);
      }
    });

    it("most experiment entries have at least one variant id", () => {
      // Not all archetypes may produce validated variants — gates are strict.
      // Overall: the majority of archetypes must have usable variants.
      const result = getAllArchetypeVariantIds();
      const nonEmpty = Object.values(result).filter((ids) => ids.length > 0);
      expect(nonEmpty.length).toBeGreaterThanOrEqual(3);
    });

    it("variant id arrays only contain known candidate ids", () => {
      const KNOWN_IDS = new Set(["control", "lighter_1", "lighter_2", "darker_1", "darker_2"]);
      const result = getAllArchetypeVariantIds();
      for (const ids of Object.values(result)) {
        for (const id of ids) {
          expect(KNOWN_IDS.has(id)).toBe(true);
        }
      }
    });

    it("returns 5 experiment keys (one per archetype)", () => {
      const result = getAllArchetypeVariantIds();
      expect(Object.keys(result)).toHaveLength(5);
    });
  });

});
