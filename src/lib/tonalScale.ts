// Tonal Scale Generator — OKLCH-based
// Converts a brand anchor (H, C in OKLCH) into a full 50-900 tonal palette.
// L (lightness) is computed mathematically; H and C are the locked dimensions.
//
// LOCKED: H and C values for --brand-navy and --brand-growth must match
// brand-locked-tokens.css. Only L varies across tonal steps.

export interface TonalAnchor {
  h: number;    // Hue (locked for brand anchors)
  c: number;    // Chroma (locked for brand anchors)
  label: string;
}

export type TonalStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

// L values per step (0-1 scale). Tuned for WCAG AA readability.
const STEP_L: Record<TonalStep, number> = {
  50:  0.97,
  100: 0.93,
  200: 0.86,
  300: 0.76,
  400: 0.65,
  500: 0.55,
  600: 0.46,
  700: 0.37,
  800: 0.27,
  900: 0.18,
};

export const TONAL_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

// 5 brand anchor families
export const BRAND_ANCHORS: Record<string, TonalAnchor> = {
  navy: {
    label: "--brand-navy",
    h: 255,
    c: 0.12,
  },
  growth: {
    label: "--brand-growth",
    h: 148,
    c: 0.14,
  },
  canvas: {
    label: "--brand-canvas",
    h: 255,
    c: 0.02,  // near-neutral; slight navy tint for harmony (Albers)
  },
  success: {
    label: "--semantic-success",
    h: 142,
    c: 0.16,
  },
  warning: {
    label: "--semantic-warning",
    h: 45,
    c: 0.18,
  },
  error: {
    label: "--semantic-error",
    h: 12,
    c: 0.20,
  },
};

/**
 * Generate OKLCH color string for a given anchor + tonal step.
 * @supports (color: oklch(0% 0 0)) required at call site.
 */
export function oklchStep(anchor: TonalAnchor, step: TonalStep): string {
  const l = STEP_L[step];
  return `oklch(${l} ${anchor.c} ${anchor.h})`;
}

/**
 * Generate the full tonal palette as CSS custom properties.
 * Returns an object mapping `--{name}-{step}` → oklch() value.
 */
export function generateTonalPalette(
  name: string,
  anchor: TonalAnchor,
): Record<string, string> {
  return Object.fromEntries(
    TONAL_STEPS.map((step) => [`--${name}-${step}`, oklchStep(anchor, step)])
  );
}

/**
 * Generate HSL fallback for a given anchor + step.
 * Used in @supports not (oklch) blocks.
 * Approximates L via lightness mapping; H stays close to anchor equivalent.
 */
export function hslFallbackStep(anchorHslH: number, anchorHslS: number, step: TonalStep): string {
  // Map OKLCH L (0-1) to HSL L (0-100%) — approximate linear mapping
  const hslL = Math.round(STEP_L[step] * 100);
  // Scale saturation: higher steps (dark) keep full saturation; lower (light) reduce
  const scaledS = Math.round(anchorHslS * (step <= 200 ? 0.4 : step <= 400 ? 0.7 : 1.0));
  return `${anchorHslH} ${scaledS}% ${hslL}%`;
}

/**
 * All tonal palettes for the design system.
 * Call generateAllPalettes() to get the full CSS var map.
 */
export function generateAllPalettes(): Record<string, string> {
  return Object.entries(BRAND_ANCHORS).reduce<Record<string, string>>(
    (acc, [name, anchor]) => ({ ...acc, ...generateTonalPalette(name, anchor) }),
    {}
  );
}
