// ═══════════════════════════════════════════════
// i18n — Canonical Bilingual Type Definitions
// Single source of truth for any { he, en } object shape.
// Prefer importing BilingualText from here instead of
// redefining it locally.
// ═══════════════════════════════════════════════

export type { Language } from "@/i18n/translations";

/**
 * A pair of strings, one in Hebrew and one in English.
 * Used throughout the codebase wherever user-facing copy
 * needs to be available in both supported languages.
 */
export interface BilingualText {
  he: string;
  en: string;
}
