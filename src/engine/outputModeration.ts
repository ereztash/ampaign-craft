// ═══════════════════════════════════════════════
// Output Content Moderation
// Post-generation check on LLM output before displaying to user.
// Catches: excessive negativity, brand-damaging language, cultural issues.
// Pure function — no I/O, no dependencies.
// ═══════════════════════════════════════════════

export interface ModerationResult {
  safe: boolean;
  flags: string[];
  severity: "none" | "warning" | "blocked";
  sanitizedText: string | null;
}

// Blocklist patterns for harmful content
// Hebrew word boundaries (\b) don't work with Unicode — use lookahead/lookbehind
// against Hebrew letter range instead.
const HB = "(?<![א-ת])"; // not preceded by Hebrew letter
const HA = "(?![א-ת])";  // not followed by Hebrew letter
const BLOCKLIST_HE = [
  new RegExp(`${HB}נאצי${HA}`, "i"),
  new RegExp(`${HB}היטלר${HA}`, "i"),
  new RegExp(`${HB}טרור${HA}`, "i"),
  new RegExp(`${HB}התאבדות${HA}`, "i"),
  /גזענ/i,
  new RegExp(`${HB}סמים${HA}`, "i"),
];

const BLOCKLIST_EN = [
  /\bnazi\b/i,
  /\bhitler\b/i,
  /\bterrorism\b/i,
  /\bsuicid/i,
  /\bracis[mt]/i,
  /\billegal\s+drugs?\b/i,
  /\bkill\s+(yourself|themselves)\b/i,
];

// Excessive negativity indicators
const NEGATIVITY_PATTERNS = [
  /\b(worthless|hopeless|terrible|awful|disaster|catastroph)/i,
  /\b(חסר תקווה|אסון|נורא|קטסטרופ)/i,
];

// Excessive urgency / pressure patterns
const HIGH_PRESSURE = /[!]{3,}|BUY NOW|ACT NOW|LAST CHANCE|LIMITED TIME/i;

/**
 * Moderate LLM-generated text before displaying to user.
 * Returns `safe: false` + `sanitizedText` when content needs replacement.
 */
export function moderateOutput(text: string): ModerationResult {
  if (!text || typeof text !== "string") {
    return { safe: true, flags: [], severity: "none", sanitizedText: null };
  }

  const flags: string[] = [];

  // Check blocklist
  for (const pattern of [...BLOCKLIST_HE, ...BLOCKLIST_EN]) {
    if (pattern.test(text)) {
      flags.push("blocked_content");
      return {
        safe: false,
        flags,
        severity: "blocked",
        sanitizedText: null, // caller should use fallback template
      };
    }
  }

  // Check excessive negativity (count individual matches across all patterns)
  let negativityCount = 0;
  for (const pattern of NEGATIVITY_PATTERNS) {
    const globalPattern = new RegExp(pattern.source, "gi");
    const matches = text.match(globalPattern);
    if (matches) negativityCount += matches.length;
  }
  if (negativityCount >= 2) {
    flags.push("excessive_negativity");
  }

  // Check high-pressure tactics
  if (HIGH_PRESSURE.test(text)) {
    flags.push("high_pressure");
  }

  // Check cortisol overload (>3 fear/urgency words per 100 words)
  const words = text.split(/\s+/).length;
  const fearWords = (text.match(/\b(danger|risk|lose|miss|fail|urgent|now|last|הפסד|סכנה|מפסיד|דחוף)\b/gi) || []).length;
  if (words > 20 && fearWords / words > 0.03) {
    flags.push("cortisol_overload");
  }

  const severity = flags.length >= 2 ? "warning" : flags.length === 1 ? "warning" : "none";

  return {
    safe: flags.length === 0,
    flags,
    severity,
    sanitizedText: null,
  };
}
