// Calendar Palette Engine
// Applies Hebrew-calendar-aware subtle palette modulations.
// Shifts ONLY --cor-opportunity and --cor-success tokens.
// The three locked brand anchors (--brand-navy, --brand-growth, --brand-canvas) are NEVER touched.
//
// Source: src/data/hebrew-calendar-2026.json (hand-curated, annual refresh).
// Annual refresh task: update the JSON every September before Rosh Hashana.
// Pure function: inject `today` for testability.

import type calendarData from "@/data/hebrew-calendar-2026.json";

type CalendarEntry = typeof calendarData[number];

interface PaletteEffect {
  type: "mute" | "celebration" | "warm" | "vibrant";
  corOpportunityShift: number;   // HSL L delta in percentage points
  corSuccessShift: number;       // HSL L delta in percentage points
  saturationDeltaPercent: number; // applied to --cor-opportunity and --cor-success S
  description: string;
}

interface CalendarPaletteResult {
  active: boolean;
  entry: CalendarEntry | null;
  cssVarOverrides: Record<string, string>;
}

// Base values for --cor-opportunity and --cor-success (light mode)
const BASE_COR_OPPORTUNITY_HSL = { h: 32, s: 92, l: 52 };
const BASE_COR_SUCCESS_HSL      = { h: 142, s: 60, l: 42 };

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function dateInRange(today: Date, start: string, end: string): boolean {
  const t = today.getTime();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return t >= s && t <= e;
}

/**
 * Get active Hebrew calendar palette effect for today.
 * Returns the most "significant" active entry (lowest saturation delta wins
 * for mute events; highest wins for celebration events).
 */
export function getActivePaletteEffect(
  today: Date = new Date(),
  entries: CalendarEntry[] = [],
): CalendarPaletteResult {
  const active = entries.filter((e) =>
    dateInRange(today, e.gregorianStart, e.gregorianEnd)
  );

  if (active.length === 0) {
    return { active: false, entry: null, cssVarOverrides: {} };
  }

  // Priority: mute effects take precedence (solemn > celebration)
  const mutes = active.filter((e) => e.paletteEffect.type === "mute");
  const chosen: CalendarEntry = mutes.length > 0
    ? mutes.reduce((a, b) =>
        a.paletteEffect.saturationDeltaPercent < b.paletteEffect.saturationDeltaPercent ? a : b
      )
    : active[0];

  const effect = chosen.paletteEffect as PaletteEffect;

  const oppS = clamp(BASE_COR_OPPORTUNITY_HSL.s + effect.saturationDeltaPercent, 10, 100);
  const oppL = clamp(BASE_COR_OPPORTUNITY_HSL.l + effect.corOpportunityShift, 20, 80);
  const sucS = clamp(BASE_COR_SUCCESS_HSL.s + effect.saturationDeltaPercent, 10, 100);
  const sucL = clamp(BASE_COR_SUCCESS_HSL.l + effect.corSuccessShift, 20, 80);

  const cssVarOverrides: Record<string, string> = {
    "--cor-opportunity": `${BASE_COR_OPPORTUNITY_HSL.h} ${oppS}% ${oppL}%`,
    "--cor-success":     `${BASE_COR_SUCCESS_HSL.h} ${sucS}% ${sucL}%`,
  };

  return { active: true, entry: chosen, cssVarOverrides };
}

/**
 * Apply (or remove) calendar palette overrides to document.documentElement.
 * Call once per day or when the calendar date changes.
 * Designed for use in a top-level provider component.
 */
export function applyCalendarPalette(
  today: Date = new Date(),
  entries: CalendarEntry[] = [],
): void {
  const el = document.documentElement;
  const result = getActivePaletteEffect(today, entries);

  if (!result.active) {
    el.style.removeProperty("--cor-opportunity");
    el.style.removeProperty("--cor-success");
    return;
  }

  for (const [prop, value] of Object.entries(result.cssVarOverrides)) {
    el.style.setProperty(prop, value);
  }
}
