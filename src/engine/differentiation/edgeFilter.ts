// ═══════════════════════════════════════════════
// Edge Filter (CLAUDE.md — Rule 2)
//
// Before emitting any output in a business_meeting context,
// strip clinical recommendations (diagnosis, medication, testing).
// Replace with a reading_recommendation frame or drop entirely.
// ═══════════════════════════════════════════════

export type OutputContext = "business_meeting" | "clinical" | "educational";

export interface EdgeFilterResult<T> {
  value: T;
  replaced: boolean;
  dropped: boolean;
  reason?: string;
}

// Case-insensitive; uses word fragments that survive Hebrew/English.
const CLINICAL_PATTERNS: RegExp[] = [
  // English clinical verbs
  /\bdiagnos(is|e|ed|ing)\b/i,
  /\bprescrib(e|ed|ing|tion)\b/i,
  /\bmedicat(e|ion|ing)\b/i,
  /\b(medical|clinical) (test|testing|screening)\b/i,
  /\btreatment plan\b/i,
  /\b(symptom|syndrome)\b/i,
  // Hebrew clinical verbs
  /אבחנה/,
  /אבחון רפואי/,
  /לרשום (תרופה|מרשם)/,
  /בדיקה רפואית/,
  /תסמונת/,
  /טיפול תרופתי/,
];

const READING_PREFIX = {
  he: "המלצת קריאה (לא המלצה רפואית):",
  en: "Reading recommendation (not medical advice):",
};

/**
 * Scan a string. If it contains a clinical recommendation in a business
 * context, either rewrite it as a reading recommendation or return dropped=true.
 */
export function filterTextForContext(
  input: string,
  context: OutputContext = "business_meeting",
): EdgeFilterResult<string> {
  if (context !== "business_meeting") {
    return { value: input, replaced: false, dropped: false };
  }
  const hit = CLINICAL_PATTERNS.find((re) => re.test(input));
  if (!hit) return { value: input, replaced: false, dropped: false };

  const isHebrew = /[\u0590-\u05FF]/.test(input);
  const prefix = isHebrew ? READING_PREFIX.he : READING_PREFIX.en;

  // If the whole input is a short clinical sentence (<40 chars after prefix),
  // drop it — no useful content to rewrite.
  const trimmed = input.trim();
  if (trimmed.length < 40) {
    return {
      value: "",
      replaced: false,
      dropped: true,
      reason: `Clinical content detected (${hit.source}) and too short to rewrite.`,
    };
  }

  // Otherwise, prefix with a reading-recommendation frame so it reads as
  // a pointer to literature rather than as a prescription.
  return {
    value: `${prefix} ${input}`,
    replaced: true,
    dropped: false,
    reason: `Clinical content detected (${hit.source}); reframed as reading recommendation.`,
  };
}

/**
 * Recursively filter string leaves of an arbitrary JSON-like object.
 * Dropped values become empty strings (array slots preserved).
 */
export function filterOutputTree<T>(
  input: T,
  context: OutputContext = "business_meeting",
): { output: T; transformations: number } {
  let transformations = 0;

  function walk(value: unknown): unknown {
    if (typeof value === "string") {
      const result = filterTextForContext(value, context);
      if (result.replaced || result.dropped) transformations += 1;
      return result.value;
    }
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = walk(v);
      }
      return out;
    }
    return value;
  }

  return { output: walk(input) as T, transformations };
}
