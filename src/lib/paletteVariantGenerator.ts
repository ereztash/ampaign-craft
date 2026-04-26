// Palette Variant Generator
// Produces A/B-testable accent variants for each archetype by traversing
// the L-axis of the brand-growth anchor (OKLCH).
//
// KEY INVARIANT: Only L (lightness) varies between variants.
// H (148) and C (0.14) are LOCKED to --brand-growth-anchor-oklch.
// This means each experiment isolates exactly ONE perceptual variable,
// making the cohort_benchmarks lookup table interpretable.
//
// Variants are pre-validated: WCAG 2.1 AA + APCA Lc + CB-safe.
// Any candidate that fails a gate is excluded before registration.

import { validatePaletteVariant, type ValidationResult } from "./colorMath";

export interface PaletteVariant {
  id: string;
  label: string;
  // HSL representation for CSS (compatible with hsl(var(--accent)) convention)
  hsl: string;
  // OKLCH for progressive enhancement
  oklch: string;
  validation: ValidationResult;
  promotionEligible: boolean;
}

// Background HSL (light mode): 210 22% 98% → approx [210, 22, 98]
const BG_LIGHT_HSL: [number, number, number] = [210, 22, 98];
// Background HSL (dark mode): 222 24% 7% → approx [222, 24, 7]
const BG_DARK_HSL: [number, number, number] = [222, 24, 7];

// Current default accent HSL (light): 152 58% 40%
const DEFAULT_ACCENT_LIGHT: [number, number, number] = [152, 58, 40];

// L candidates relative to base L=0.52 (oklch equiv of HSL 152 58% 40%)
// Only L varies. H=148, C=0.14 locked.
const L_CANDIDATES = [
  { id: "control",    oklchL: 0.52, label: "Default (control)" },
  { id: "lighter_1",  oklchL: 0.57, label: "Lighter +5%" },
  { id: "lighter_2",  oklchL: 0.62, label: "Lighter +10%" },
  { id: "darker_1",   oklchL: 0.47, label: "Darker -5%" },
  { id: "darker_2",   oklchL: 0.42, label: "Darker -10%" },
];

// OKLCH L → approximate HSL L (for CSS hsl() compatibility)
function oklchLToHslL(oklchL: number): number {
  // Linear approximation: oklch L 0.52 ≈ HSL 40%, scaling factor ≈ 77
  return Math.round(oklchL * 77);
}

function generateVariantForArchetype(
  archetypeH: number,
  archetypeC: number,
  archetypeHslH: number,
  archetypeHslS: number,
  candidate: typeof L_CANDIDATES[number],
): PaletteVariant {
  const hslL = oklchLToHslL(candidate.oklchL);
  const fgHsl: [number, number, number] = [archetypeHslH, archetypeHslS, hslL];

  const validation = validatePaletteVariant(
    fgHsl,
    BG_LIGHT_HSL,
    DEFAULT_ACCENT_LIGHT,
    { fontWeight: 400, isLargeText: false }
  );

  return {
    id: candidate.id,
    label: candidate.label,
    hsl: `${archetypeHslH} ${archetypeHslS}% ${hslL}%`,
    oklch: `oklch(${candidate.oklchL} ${archetypeC} ${archetypeH})`,
    validation,
    promotionEligible: validation.passesAll,
  };
}

// Archetype anchor definitions (H + C in OKLCH, H + S in HSL for CSS compat)
// LOCKED H and C — only L varies for variants
const ARCHETYPE_ANCHORS: Record<string, { oklchH: number; oklchC: number; hslH: number; hslS: number }> = {
  pioneer:    { oklchH: 28,  oklchC: 0.18, hslH: 28,  hslS: 80 },
  closer:     { oklchH: 22,  oklchC: 0.16, hslH: 22,  hslS: 80 },
  strategist: { oklchH: 192, oklchC: 0.10, hslH: 192, hslS: 46 },
  optimizer:  { oklchH: 148, oklchC: 0.14, hslH: 152,  hslS: 56 },
  connector:  { oklchH: 172, oklchC: 0.12, hslH: 172, hslS: 52 },
};

/**
 * Generate all validated variants for a given archetype.
 * Returns only variants that pass ALL validation gates.
 */
export function generateArchetypeVariants(archetype: keyof typeof ARCHETYPE_ANCHORS): PaletteVariant[] {
  const anchor = ARCHETYPE_ANCHORS[archetype];
  if (!anchor) return [];

  return L_CANDIDATES
    .map((c) => generateVariantForArchetype(anchor.oklchH, anchor.oklchC, anchor.hslH, anchor.hslS, c))
    .filter((v) => v.promotionEligible);
}

/**
 * Get variant HSL value for direct CSS injection.
 * Returns null if variant fails validation (safe guard).
 */
export function getVariantAccentHsl(
  archetype: keyof typeof ARCHETYPE_ANCHORS,
  variantId: string,
): string | null {
  const variants = generateArchetypeVariants(archetype);
  const match = variants.find((v) => v.id === variantId);
  return match ? match.hsl : null;
}

/**
 * Get all archetype → valid variant IDs mapping.
 * Used to initialize VARIANTS_PER_EXPERIMENT entries.
 */
export function getAllArchetypeVariantIds(): Record<string, string[]> {
  return Object.fromEntries(
    Object.keys(ARCHETYPE_ANCHORS).map((arch) => [
      `palette_accent_${arch}`,
      generateArchetypeVariants(arch as keyof typeof ARCHETYPE_ANCHORS).map((v) => v.id),
    ])
  );
}
