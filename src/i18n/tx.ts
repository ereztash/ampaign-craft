// ═══════════════════════════════════════════════
// tx() — Bilingual text selector
//
// Replaces scattered `isHe ? "..." : "..."` ternaries with a typed,
// traceable helper. All new code should use this instead of inline ternaries.
//
// Usage:
//   tx({ he: "שמור", en: "Save" }, language)
//   tx(myBilingualObject, language)
//
// The Language type is re-exported so callers don't need two imports.
// ═══════════════════════════════════════════════

export type { Language } from "./translations";

export interface BilingualStr {
  he: string;
  en: string;
}

/**
 * Select the correct language string from a bilingual object.
 * Falls back to `en` if the requested language string is empty.
 *
 * Accepts `string` for `lang` so callers don't need to narrow first;
 * any value other than "he" is treated as "en".
 */
export function tx<T extends string = string>(text: { he: T; en: T }, lang: string): T {
  const key: "he" | "en" = lang === "he" ? "he" : "en";
  return (text[key] || text.en || text.he || ("" as T));
}

/**
 * Convenience: build a bilingual string inline.
 * tx.b({ he: "...", en: "..." }) — identical to a plain object but keeps
 * the creation site searchable.
 */
tx.b = (text: BilingualStr): BilingualStr => text;
