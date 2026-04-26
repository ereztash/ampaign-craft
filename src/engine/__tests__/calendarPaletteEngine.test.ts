import { describe, it, expect } from "vitest";
import { getActivePaletteEffect } from "../calendarPaletteEngine";
import calendarData from "@/data/hebrew-calendar-2026.json";

// Base HSL values (mirrors the constants in calendarPaletteEngine.ts)
const BASE_OPP  = { h: 32,  s: 92,  l: 52 };
const BASE_SUCC = { h: 142, s: 60,  l: 42 };

type CalendarEntry = typeof calendarData[number];
const ENTRIES: CalendarEntry[] = calendarData as CalendarEntry[];

// Helpers
function d(dateStr: string): Date { return new Date(dateStr); }

describe("calendarPaletteEngine", () => {

  // ── Outside all holidays ──────────────────────────────────────────────────

  describe("outside all holidays", () => {
    it("returns active=false when no entries overlap", () => {
      const result = getActivePaletteEffect(d("2026-01-15"), ENTRIES);
      expect(result.active).toBe(false);
    });

    it("returns null entry when no entries overlap", () => {
      const result = getActivePaletteEffect(d("2026-01-15"), ENTRIES);
      expect(result.entry).toBeNull();
    });

    it("returns empty cssVarOverrides when no entries overlap", () => {
      const result = getActivePaletteEffect(d("2026-01-15"), ENTRIES);
      expect(result.cssVarOverrides).toEqual({});
    });

    it("returns active=false for empty entries array", () => {
      const result = getActivePaletteEffect(d("2026-09-20"), []);
      expect(result.active).toBe(false);
    });
  });

  // ── Single celebration event: Rosh Hashana 2026 ───────────────────────────

  describe("Rosh Hashana 2026 (2026-09-11 to 2026-09-13, celebration)", () => {
    const DATE_IN = d("2026-09-12");
    const DATE_BEFORE = d("2026-09-10");
    const DATE_AFTER  = d("2026-09-14");

    it("is active on 2026-09-12", () => {
      expect(getActivePaletteEffect(DATE_IN, ENTRIES).active).toBe(true);
    });

    it("is not active on 2026-09-10 (day before)", () => {
      expect(getActivePaletteEffect(DATE_BEFORE, ENTRIES).active).toBe(false);
    });

    it("is not active on 2026-09-14 (day after)", () => {
      expect(getActivePaletteEffect(DATE_AFTER, ENTRIES).active).toBe(false);
    });

    it("emits --cor-opportunity and --cor-success overrides", () => {
      const { cssVarOverrides } = getActivePaletteEffect(DATE_IN, ENTRIES);
      expect("--cor-opportunity" in cssVarOverrides).toBe(true);
      expect("--cor-success"     in cssVarOverrides).toBe(true);
    });

    it("matches rosh_hashana_2026 entry (saturationDelta = 0)", () => {
      const { entry } = getActivePaletteEffect(DATE_IN, ENTRIES);
      expect(entry?.id).toBe("rosh_hashana_2026");
    });
  });

  // ── Mute event: Yom Kippur 2026 ──────────────────────────────────────────

  describe("Yom Kippur 2026 (2026-09-20, mute, saturationDelta = -15)", () => {
    const DATE = d("2026-09-20");

    it("is active", () => {
      expect(getActivePaletteEffect(DATE, ENTRIES).active).toBe(true);
    });

    it("chooses the mute entry when both yom_kippur and yom_kippur_week overlap", () => {
      // Both yom_kippur_2026 (20-21) and yom_kippur_week_2026 (18-21) overlap on 09-20
      // Both are mute with same saturationDelta — either is valid; entry must be a mute
      const { entry } = getActivePaletteEffect(DATE, ENTRIES);
      expect(entry?.paletteEffect.type).toBe("mute");
    });

    it("reduces --cor-opportunity saturation from base 92", () => {
      const { cssVarOverrides } = getActivePaletteEffect(DATE, ENTRIES);
      const oppParts = cssVarOverrides["--cor-opportunity"].split(" ");
      const oppS = parseFloat(oppParts[1]);
      // saturationDelta = -15, so 92 - 15 = 77
      expect(oppS).toBe(77);
    });

    it("reduces --cor-success saturation from base 60", () => {
      const { cssVarOverrides } = getActivePaletteEffect(DATE, ENTRIES);
      const succParts = cssVarOverrides["--cor-success"].split(" ");
      const succS = parseFloat(succParts[1]);
      // saturationDelta = -15, so 60 - 15 = 45
      expect(succS).toBe(45);
    });

    it("preserves the hue component for --cor-opportunity", () => {
      const { cssVarOverrides } = getActivePaletteEffect(DATE, ENTRIES);
      const oppH = cssVarOverrides["--cor-opportunity"].split(" ")[0];
      expect(Number(oppH)).toBe(BASE_OPP.h);
    });

    it("preserves the hue component for --cor-success", () => {
      const { cssVarOverrides } = getActivePaletteEffect(DATE, ENTRIES);
      const succH = cssVarOverrides["--cor-success"].split(" ")[0];
      expect(Number(succH)).toBe(BASE_SUCC.h);
    });
  });

  // ── Mute wins over celebration when overlapping ───────────────────────────

  describe("mute priority over celebration", () => {
    it("prefers mute over celebration when both active simultaneously", () => {
      // Yom HaZikaron (2027-04-21, mute -20) overlaps with Independence Day (2027-04-22, celebration +10)
      // On 2027-04-22 both are active — mute must win
      const DATE = d("2027-04-22");
      const { entry } = getActivePaletteEffect(DATE, ENTRIES);
      expect(entry?.paletteEffect.type).toBe("mute");
    });

    it("mute entry has saturationDelta = -20 (most negative)", () => {
      const DATE = d("2027-04-22");
      const { entry } = getActivePaletteEffect(DATE, ENTRIES);
      expect(entry?.paletteEffect.saturationDeltaPercent).toBe(-20);
    });
  });

  // ── Vibrant event: Purim 2027 ────────────────────────────────────────────

  describe("Purim 2027 (2027-03-02, vibrant, saturationDelta = +12)", () => {
    const DATE = d("2027-03-02");

    it("is active", () => {
      expect(getActivePaletteEffect(DATE, ENTRIES).active).toBe(true);
    });

    it("increases --cor-opportunity saturation", () => {
      const { cssVarOverrides } = getActivePaletteEffect(DATE, ENTRIES);
      const oppS = parseFloat(cssVarOverrides["--cor-opportunity"].split(" ")[1]);
      // base 92 + 12 = 104 → clamped to 100
      expect(oppS).toBe(100);
    });

    it("increases --cor-success saturation", () => {
      const { cssVarOverrides } = getActivePaletteEffect(DATE, ENTRIES);
      const succS = parseFloat(cssVarOverrides["--cor-success"].split(" ")[1]);
      // base 60 + 12 = 72
      expect(succS).toBe(72);
    });
  });

  // ── Clamping ─────────────────────────────────────────────────────────────

  describe("saturation clamping [10, 100]", () => {
    it("clamps saturation to 100 when base+delta > 100", () => {
      // Purim: 92 + 12 = 104 → should clamp to 100
      const { cssVarOverrides } = getActivePaletteEffect(d("2027-03-02"), ENTRIES);
      const oppS = parseFloat(cssVarOverrides["--cor-opportunity"].split(" ")[1]);
      expect(oppS).toBeLessThanOrEqual(100);
    });

    it("all cssVar S values are within [10, 100]", () => {
      const testDates = [
        "2026-09-20", // Yom Kippur (mute -15)
        "2027-04-22", // Yom HaZikaron/Independence overlap
        "2026-12-20", // Hanukkah (celebration +8)
        "2027-03-02", // Purim (vibrant +12)
      ];
      for (const dateStr of testDates) {
        const { cssVarOverrides } = getActivePaletteEffect(d(dateStr), ENTRIES);
        for (const val of Object.values(cssVarOverrides)) {
          const parts = val.split(" ");
          const s = parseFloat(parts[1]);
          expect(s).toBeGreaterThanOrEqual(10);
          expect(s).toBeLessThanOrEqual(100);
        }
      }
    });

    it("all cssVar L values are within [20, 80]", () => {
      const testDates = [
        "2026-09-20",
        "2027-04-22",
        "2026-12-20",
        "2027-03-02",
      ];
      for (const dateStr of testDates) {
        const { cssVarOverrides } = getActivePaletteEffect(d(dateStr), ENTRIES);
        for (const val of Object.values(cssVarOverrides)) {
          const parts = val.split(" ");
          const l = parseFloat(parts[2]);
          expect(l).toBeGreaterThanOrEqual(20);
          expect(l).toBeLessThanOrEqual(80);
        }
      }
    });
  });

  // ── CSS var format ────────────────────────────────────────────────────────

  describe("cssVarOverrides format", () => {
    it("overrides are in 'H S% L%' format", () => {
      const { cssVarOverrides } = getActivePaletteEffect(d("2026-09-12"), ENTRIES);
      for (const val of Object.values(cssVarOverrides)) {
        expect(val).toMatch(/^\d+ \d+% \d+%$/);
      }
    });

    it("always provides exactly 2 overrides when active", () => {
      const { cssVarOverrides } = getActivePaletteEffect(d("2026-09-12"), ENTRIES);
      expect(Object.keys(cssVarOverrides)).toHaveLength(2);
    });
  });

});
