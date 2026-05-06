// ═══════════════════════════════════════════════════════════════════════════
// Wedge Mode — Module Visibility Flag System
//
// Hides modules from the main navigation so the app can ship one wedge at
// a time. Hidden modules render a "locked" CTA whose click is telemetered
// (phantom-interest signal). Default mode is "all"; "pricing-only" exposes
// just the Pricing wedge.
//
// Resolution order (first wins):
//   1. localStorage  — runtime override for admins/dev (key: WEDGE_MODE_KEY)
//   2. URL ?wedge=…  — easy testing without persistence
//   3. import.meta.env.VITE_WEDGE_MODE — build-time override
//   4. DEFAULT_MODE fallback — flipped to "pricing-only" 2026-05-06 to ship
//      the focused single-wedge experience by default. Override via /admin/wedge.
// ═══════════════════════════════════════════════════════════════════════════

import { safeStorage } from "@/lib/safeStorage";

export type WedgeModule =
  | "differentiate"
  | "wizard"
  | "sales"
  | "pricing"
  | "retention";

export type WedgeMode = "all" | "pricing-only" | "marketing-only" | "differentiate-only";

export const WEDGE_MODES: WedgeMode[] = ["all", "pricing-only", "marketing-only", "differentiate-only"];

const STORAGE_KEY = "funnelforge.wedge.mode";
const ALL_MODULES: WedgeModule[] = ["differentiate", "wizard", "sales", "pricing", "retention"];
const DEFAULT_MODE: WedgeMode = "pricing-only";

const ENABLED_MAP: Record<WedgeMode, WedgeModule[]> = {
  "all": ALL_MODULES,
  "pricing-only": ["pricing"],
  "marketing-only": ["wizard"], // wizard is the Marketing/Content entry
  "differentiate-only": ["differentiate"],
};

const MODULE_LABELS: Record<WedgeModule, { he: string; en: string }> = {
  differentiate: { he: "בידול", en: "Differentiation" },
  wizard:        { he: "שיווק ותוכן", en: "Marketing & Content" },
  sales:         { he: "מכירות", en: "Sales" },
  pricing:       { he: "תמחור", en: "Pricing" },
  retention:     { he: "שימור", en: "Retention" },
};

// ── Resolution ──────────────────────────────────────────────────────────────

function readLocalStorageMode(): WedgeMode | null {
  const raw = safeStorage.getString(STORAGE_KEY, "");
  if (!raw) return null;
  return WEDGE_MODES.includes(raw as WedgeMode) ? (raw as WedgeMode) : null;
}

function readUrlMode(): WedgeMode | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("wedge");
  if (!raw) return null;
  return WEDGE_MODES.includes(raw as WedgeMode) ? (raw as WedgeMode) : null;
}

function readEnvMode(): WedgeMode | null {
  const raw = import.meta.env.VITE_WEDGE_MODE as string | undefined;
  if (!raw) return null;
  return WEDGE_MODES.includes(raw as WedgeMode) ? (raw as WedgeMode) : null;
}

export function getWedgeMode(): WedgeMode {
  return readLocalStorageMode() ?? readUrlMode() ?? readEnvMode() ?? DEFAULT_MODE;
}

export function setWedgeMode(mode: WedgeMode): void {
  safeStorage.setString(STORAGE_KEY, mode);
}

export function clearWedgeMode(): void {
  safeStorage.remove(STORAGE_KEY);
}

// ── Queries ─────────────────────────────────────────────────────────────────

export function isWedgeMode(): boolean {
  return getWedgeMode() !== "all";
}

export function getEnabledModules(): WedgeModule[] {
  return ENABLED_MAP[getWedgeMode()];
}

export function getLockedModules(): WedgeModule[] {
  const enabled = new Set(getEnabledModules());
  return ALL_MODULES.filter((m) => !enabled.has(m));
}

export function isModuleEnabled(module: WedgeModule): boolean {
  return getEnabledModules().includes(module);
}

export function getModuleLabel(module: WedgeModule, lang: "he" | "en"): string {
  return MODULE_LABELS[module][lang];
}

export function getActiveWedgeLabel(lang: "he" | "en"): string {
  const enabled = getEnabledModules();
  if (enabled.length === 1) return MODULE_LABELS[enabled[0]][lang];
  return lang === "he" ? "כל המודולים" : "All modules";
}
