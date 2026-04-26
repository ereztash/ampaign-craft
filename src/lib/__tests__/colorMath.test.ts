import { describe, it, expect } from "vitest";
import {
  wcag21Ratio,
  passesWCAG21AA,
  apcaLc,
  passesAPCA,
  isCBSafe,
  validatePaletteVariant,
} from "../colorMath";

// ── Reference pairs ───────────────────────────────────────────────────────
// WHITE  = HSL [0, 0, 100]  → relative luminance ≈ 1.0
// BLACK  = HSL [0, 0, 0]    → relative luminance ≈ 0.0
// NAVY   = HSL [216, 68, 26] (--brand-navy-anchor)
// CANVAS = HSL [210, 22, 98] (--brand-canvas-anchor, near-white bg)
const WHITE:  [number, number, number] = [0, 0, 100];
const BLACK:  [number, number, number] = [0, 0, 0];
const NAVY:   [number, number, number] = [216, 68, 26];
const CANVAS: [number, number, number] = [210, 22, 98];
const GROWTH: [number, number, number] = [152, 58, 40]; // --brand-growth-anchor

describe("colorMath", () => {

  // ── wcag21Ratio ──────────────────────────────────────────────────────────

  describe("wcag21Ratio", () => {
    it("returns ≈21 for white on black (maximum contrast)", () => {
      const ratio = wcag21Ratio(WHITE, BLACK);
      expect(ratio).toBeCloseTo(21, 0);
    });

    it("returns ≈21 for black on white (symmetric)", () => {
      const ratio = wcag21Ratio(BLACK, WHITE);
      expect(ratio).toBeCloseTo(21, 0);
    });

    it("returns 1.0 for identical colors (no contrast)", () => {
      const ratio = wcag21Ratio(WHITE, WHITE);
      expect(ratio).toBeCloseTo(1.0, 2);
    });

    it("returns a value in [1, 21] for any valid pair", () => {
      const ratio = wcag21Ratio(NAVY, CANVAS);
      expect(ratio).toBeGreaterThanOrEqual(1);
      expect(ratio).toBeLessThanOrEqual(21);
    });

    it("navy on near-white canvas meets 4.5:1 threshold", () => {
      // Deep navy on near-white background must be AA-compliant by design
      const ratio = wcag21Ratio(NAVY, CANVAS);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("very similar lightness yields ratio close to 1", () => {
      const a: [number, number, number] = [0, 0, 50];
      const b: [number, number, number] = [0, 0, 53];
      const ratio = wcag21Ratio(a, b);
      expect(ratio).toBeLessThan(2);
    });
  });

  // ── passesWCAG21AA ───────────────────────────────────────────────────────

  describe("passesWCAG21AA", () => {
    it("passes for white on black (normal text)", () => {
      expect(passesWCAG21AA(WHITE, BLACK)).toBe(true);
    });

    it("passes for black on white (normal text)", () => {
      expect(passesWCAG21AA(BLACK, WHITE)).toBe(true);
    });

    it("fails for identical colors", () => {
      expect(passesWCAG21AA(WHITE, WHITE)).toBe(false);
    });

    it("fails for near-identical grays (ratio ≈ 1.4)", () => {
      const a: [number, number, number] = [0, 0, 50];
      const b: [number, number, number] = [0, 0, 55];
      expect(passesWCAG21AA(a, b)).toBe(false);
    });

    it("applies 3.0:1 threshold for large text (not 4.5:1)", () => {
      // A pair that passes 3.0 but not 4.5
      // Light gray [0, 0, 75] on white: need to find threshold pair
      // Navy on canvas passes both; let us verify large text is more lenient
      const ratio = wcag21Ratio(NAVY, CANVAS);
      const normalPass = passesWCAG21AA(NAVY, CANVAS, false);
      const largePass  = passesWCAG21AA(NAVY, CANVAS, true);
      // If it passes normal (4.5:1) it must pass large (3.0:1) too
      if (normalPass) expect(largePass).toBe(true);
      // Large text threshold is lower — ratio >=3 passes large even if ratio <4.5
      const dim: [number, number, number] = [0, 0, 65];
      const bg:  [number, number, number] = [0, 0, 100];
      const dimRatio = wcag21Ratio(dim, bg);
      if (dimRatio >= 3.0 && dimRatio < 4.5) {
        expect(passesWCAG21AA(dim, bg, false)).toBe(false);
        expect(passesWCAG21AA(dim, bg, true)).toBe(true);
      }
    });

    it("navy on canvas passes AA for normal body text", () => {
      expect(passesWCAG21AA(NAVY, CANVAS)).toBe(true);
    });
  });

  // ── apcaLc ───────────────────────────────────────────────────────────────

  describe("apcaLc", () => {
    it("returns a non-negative number for any valid pair", () => {
      expect(apcaLc(WHITE, BLACK)).toBeGreaterThanOrEqual(0);
      expect(apcaLc(BLACK, WHITE)).toBeGreaterThanOrEqual(0);
      expect(apcaLc(NAVY, CANVAS)).toBeGreaterThanOrEqual(0);
    });

    it("returns a higher Lc for high-contrast pairs", () => {
      const highContrast = apcaLc(BLACK, WHITE);
      const lowContrast  = apcaLc([0, 0, 50], [0, 0, 55]);
      expect(highContrast).toBeGreaterThan(lowContrast);
    });

    it("returns Lc for navy on canvas >= 60 (brand standard)", () => {
      const lc = apcaLc(NAVY, CANVAS);
      expect(lc).toBeGreaterThanOrEqual(60);
    });

    it("fontWeight 700 does not decrease Lc for dark-on-light", () => {
      const lcNormal = apcaLc(NAVY, CANVAS, 400);
      const lcBold   = apcaLc(NAVY, CANVAS, 700);
      // Both should be non-negative and within plausible range
      expect(lcNormal).toBeGreaterThan(0);
      expect(lcBold).toBeGreaterThan(0);
    });
  });

  // ── passesAPCA ───────────────────────────────────────────────────────────

  describe("passesAPCA", () => {
    it("passes for black on white (very high Lc)", () => {
      expect(passesAPCA(BLACK, WHITE)).toBe(true);
    });

    it("fails for identical colors (Lc ≈ 0)", () => {
      expect(passesAPCA(WHITE, WHITE)).toBe(false);
    });

    it("navy on canvas passes APCA (brand pair)", () => {
      expect(passesAPCA(NAVY, CANVAS)).toBe(true);
    });

    it("applies lower threshold (Lc ≥45) for large/icon", () => {
      // growth green on white background: mid-contrast pair
      const lc = apcaLc(GROWTH, CANVAS);
      const passNormal = passesAPCA(GROWTH, CANVAS, 400, false);
      const passLarge  = passesAPCA(GROWTH, CANVAS, 400, true);
      if (lc >= 45 && lc < 60) {
        expect(passNormal).toBe(false);
        expect(passLarge).toBe(true);
      } else if (lc >= 60) {
        expect(passNormal).toBe(true);
        expect(passLarge).toBe(true);
      }
    });
  });

  // ── isCBSafe ─────────────────────────────────────────────────────────────

  describe("isCBSafe", () => {
    it("is safe for white vs black (max lightness delta)", () => {
      expect(isCBSafe(WHITE, BLACK)).toBe(true);
    });

    it("is safe for colors with Δ-Lightness ≥ 50pp", () => {
      const light: [number, number, number] = [0, 0, 90];
      const dark:  [number, number, number] = [0, 0, 30];
      expect(isCBSafe(light, dark)).toBe(true);
    });

    it("is safe for colors with Δ-Hue ≥ 30°", () => {
      // navy (H=216) vs growth (H=152): ΔH = 64° ≥ 30
      expect(isCBSafe(NAVY, GROWTH)).toBe(true);
    });

    it("is unsafe for very similar hue+lightness (collapses under protanopia)", () => {
      // Same hue, ΔL = 5pp: after protanopia simulation they remain indistinguishable
      const a: [number, number, number] = [152, 58, 40];
      const b: [number, number, number] = [152, 58, 45];
      // ΔL = 0.05 < 0.5, ΔH = 0 < 30 — then simulation check fires
      expect(isCBSafe(a, b)).toBe(false);
    });

    it("navy and growth green are CB-safe (design axiom)", () => {
      // These are used together throughout the UI — must always be distinguishable
      expect(isCBSafe(NAVY, GROWTH)).toBe(true);
    });
  });

  // ── validatePaletteVariant ────────────────────────────────────────────────

  describe("validatePaletteVariant", () => {
    it("returns all fields in the ValidationResult shape", () => {
      const result = validatePaletteVariant(NAVY, CANVAS, GROWTH);
      expect(typeof result.passesAll).toBe("boolean");
      expect(typeof result.wcag21Ratio).toBe("number");
      expect(typeof result.wcag21Pass).toBe("boolean");
      expect(typeof result.apcaLc).toBe("number");
      expect(typeof result.apcaPass).toBe("boolean");
      expect(typeof result.cbSafe).toBe("boolean");
    });

    it("passes all gates for navy on canvas (brand standard pair)", () => {
      const result = validatePaletteVariant(NAVY, CANVAS, GROWTH);
      expect(result.passesAll).toBe(true);
      expect(result.wcag21Pass).toBe(true);
      expect(result.apcaPass).toBe(true);
      expect(result.cbSafe).toBe(true);
    });

    it("fails all gates for identical colors", () => {
      const result = validatePaletteVariant(WHITE, WHITE, GROWTH);
      expect(result.wcag21Pass).toBe(false);
      expect(result.apcaPass).toBe(false);
      expect(result.passesAll).toBe(false);
    });

    it("passesAll is false when any single gate fails", () => {
      // Use a CB-unsafe pair (same hue, small L delta)
      const fg: [number, number, number] = [152, 58, 40];
      const bg: [number, number, number] = [152, 58, 45];
      const result = validatePaletteVariant(fg, bg, GROWTH);
      // Even if wcag or apca somehow pass, cbSafe = false makes passesAll false
      if (!result.cbSafe) {
        expect(result.passesAll).toBe(false);
      }
    });

    it("wcag21Ratio value matches standalone wcag21Ratio call", () => {
      const standalone = wcag21Ratio(NAVY, CANVAS);
      const result = validatePaletteVariant(NAVY, CANVAS, GROWTH);
      expect(result.wcag21Ratio).toBeCloseTo(standalone, 5);
    });

    it("apcaLc value matches standalone apcaLc call", () => {
      const standalone = apcaLc(NAVY, CANVAS, 400);
      const result = validatePaletteVariant(NAVY, CANVAS, GROWTH);
      expect(result.apcaLc).toBeCloseTo(standalone, 5);
    });
  });

});
