// Color math utilities for palette validation.
// Three gates: WCAG 2.1 AA (legal floor), APCA Lc (perceptual guidance),
// and color-blindness safe distance check.
//
// Axiom: APCA is guidance until WCAG 3 ratifies.
//        WCAG 2.1 AA is the legal floor and cannot be overridden by APCA.

// ── HSL to sRGB ────────────────────────────────────────────────────────────

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

// ── sRGB to relative luminance (WCAG 2.1) ──────────────────────────────────

function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

// ── WCAG 2.1 contrast ratio ────────────────────────────────────────────────

export function wcag21Ratio(
  fg: [number, number, number],  // HSL [h, s, l]
  bg: [number, number, number],
): number {
  const fgRgb = hslToRgb(...fg);
  const bgRgb = hslToRgb(...bg);
  const L1 = relativeLuminance(...fgRgb);
  const L2 = relativeLuminance(...bgRgb);
  const lighter = Math.max(L1, L2);
  const darker  = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function passesWCAG21AA(
  fg: [number, number, number],
  bg: [number, number, number],
  isLargeText = false,
): boolean {
  const ratio = wcag21Ratio(fg, bg);
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

// ── APCA Lc (simplified Lc calculation) ───────────────────────────────────
// Simplified implementation based on APCA-W3 public algorithm.
// Not a full APCA implementation — suitable for relative comparison.

function apcaLuminance(r: number, g: number, b: number): number {
  return 0.2126729 * Math.pow(r, 2.4) + 0.7151522 * Math.pow(g, 2.4) + 0.0721750 * Math.pow(b, 2.4);
}

export function apcaLc(
  fg: [number, number, number],  // HSL
  bg: [number, number, number],
  fontWeight: 400 | 700 = 400,
): number {
  const fgRgb = hslToRgb(...fg);
  const bgRgb = hslToRgb(...bg);
  const Yfg = apcaLuminance(...fgRgb);
  const Ybg = apcaLuminance(...bgRgb);

  const SA98G = { Ntxt: 0.57, Nbg: 0.56, Wtxt: 0.62, Wbg: 0.65 };
  const exponents = fontWeight >= 700 ? [SA98G.Wtxt, SA98G.Wbg] : [SA98G.Ntxt, SA98G.Nbg];

  let Lc: number;
  if (Ybg > Yfg) {
    Lc = (Math.pow(Ybg, exponents[1]) - Math.pow(Yfg, exponents[0])) * 1.14 * 100;
  } else {
    Lc = (Math.pow(Ybg, exponents[1]) - Math.pow(Yfg, exponents[0])) * 1.14 * 100;
  }
  return Math.abs(Lc);
}

export function passesAPCA(
  fg: [number, number, number],
  bg: [number, number, number],
  fontWeight: 400 | 700 = 400,
  isLargeOrIcon = false,
): boolean {
  const lc = apcaLc(fg, bg, fontWeight);
  return lc >= (isLargeOrIcon ? 45 : 60);
}

// ── Color-blindness safe distance ─────────────────────────────────────────
// Simulates protanopia, deuteranopia, tritanopia and checks if the colors
// remain distinguishable: Δ-Lightness ≥ 0.5 OR Δ-Hue ≥ 30°.

function simulateProtanopia(h: number, s: number, l: number): [number, number, number] {
  const shifted = (h > 30 && h < 150) ? [60, s * 0.6, l] : [h, s * 0.4, l];
  return shifted as [number, number, number];
}

function simulateDeuteranopia(h: number, s: number, l: number): [number, number, number] {
  const shifted = (h > 60 && h < 180) ? [90, s * 0.5, l] : [h, s * 0.45, l];
  return shifted as [number, number, number];
}

function hueDelta(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}

export function isCBSafe(
  colorA: [number, number, number],  // HSL
  colorB: [number, number, number],
): boolean {
  const lDelta = Math.abs(colorA[2] - colorB[2]) / 100;
  if (lDelta >= 0.5) return true;

  const hDelta = hueDelta(colorA[0], colorB[0]);
  if (hDelta >= 30) return true;

  // Protanopia simulation: if hue shifts collapse the pair, fail
  const aP = simulateProtanopia(...colorA);
  const bP = simulateProtanopia(...colorB);
  const lDeltaP = Math.abs(aP[2] - bP[2]) / 100;
  if (lDeltaP < 0.3 && hueDelta(aP[0], bP[0]) < 20) return false;

  // Deuteranopia simulation
  const aD = simulateDeuteranopia(...colorA);
  const bD = simulateDeuteranopia(...colorB);
  const lDeltaD = Math.abs(aD[2] - bD[2]) / 100;
  if (lDeltaD < 0.3 && hueDelta(aD[0], bD[0]) < 20) return false;

  return true;
}

// ── Compound gate — use before registering any palette variant ────────────

export interface ValidationResult {
  passesAll: boolean;
  wcag21Ratio: number;
  wcag21Pass: boolean;
  apcaLc: number;
  apcaPass: boolean;
  cbSafe: boolean;
}

export function validatePaletteVariant(
  fgHsl: [number, number, number],
  bgHsl: [number, number, number],
  currentDefaultHsl: [number, number, number],
  options: { fontWeight?: 400 | 700; isLargeText?: boolean } = {},
): ValidationResult {
  const { fontWeight = 400, isLargeText = false } = options;
  const ratio = wcag21Ratio(fgHsl, bgHsl);
  const wcag21Pass = isLargeText ? ratio >= 3.0 : ratio >= 4.5;
  const lc = apcaLc(fgHsl, bgHsl, fontWeight);
  const apcaPass = lc >= (isLargeText ? 45 : 60);
  const cbSafe = isCBSafe(fgHsl, currentDefaultHsl);

  return {
    passesAll: wcag21Pass && apcaPass && cbSafe,
    wcag21Ratio: ratio,
    wcag21Pass,
    apcaLc: lc,
    apcaPass,
    cbSafe,
  };
}
