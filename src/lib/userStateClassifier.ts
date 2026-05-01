import { safeStorage } from "@/lib/safeStorage";

export type CoachMode =
  | "HOLD"
  | "CLARIFY"
  | "STRUCTURE"
  | "CHALLENGE"
  | "OPERATIONALIZE";

export type UserState = "confused" | "resistant" | "ready" | "disbelieving";

const COACH_MODE_KEY = "funnelforge-coach-mode";

export function persistCoachMode(mode: CoachMode): void {
  safeStorage.setJSON(COACH_MODE_KEY, mode);
}

export function coachModeToUserState(mode: CoachMode): UserState {
  switch (mode) {
    case "HOLD":          return "confused";
    case "CLARIFY":       return "confused";
    case "STRUCTURE":     return "ready";
    case "CHALLENGE":     return "resistant";
    case "OPERATIONALIZE": return "ready";
  }
}

export function getPersistedUserState(): UserState {
  const mode = safeStorage.getJSON<CoachMode | null>(COACH_MODE_KEY, null);
  return mode ? coachModeToUserState(mode) : "ready";
}

export interface ClassificationInput {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  messageCount: number;
}

export interface ClassificationResult {
  mode: CoachMode;
  triggerKeywords: string[];
}

const HOLD_PATTERNS =
  /עייף|מוצף|לא יודע לאן|קשה לי|נשברתי|פגוע|מותש|overwhelmed|exhausted|burnt out/i;

const STRUCTURE_PATTERNS =
  /מבולבל|אני לא יודע מאיפה|יש הרבה|יש המון|confused|too many|don't know where to start/i;

const OPERATIONALIZE_PATTERNS =
  /אני מוכן|בסדר[,.]?\s*מה עושים|תעשה מזה|לבצע|איך מתחיל|let's do|ready to start|make it a|operationalize/i;

const CHALLENGE_PATTERNS =
  /תאתגר|challenge me|תפריע לי|תפריע לחשיבה|push back|תתנגד/i;

const CLARIFY_PATTERNS =
  /בהירות|ערך|אסטרטגיה|חכם יותר|clarity|value|strategy|smarter|what do you mean|what exactly/i;

function extractTriggers(message: string, pattern: RegExp): string[] {
  const matches = message.match(pattern);
  return matches ? [...new Set(matches)] : [];
}

export function classifyUserState(
  input: ClassificationInput,
): ClassificationResult {
  const { message, messageCount } = input;

  if (HOLD_PATTERNS.test(message)) {
    return { mode: "HOLD", triggerKeywords: extractTriggers(message, HOLD_PATTERNS) };
  }

  if (OPERATIONALIZE_PATTERNS.test(message)) {
    return { mode: "OPERATIONALIZE", triggerKeywords: extractTriggers(message, OPERATIONALIZE_PATTERNS) };
  }

  if (CHALLENGE_PATTERNS.test(message)) {
    return { mode: "CHALLENGE", triggerKeywords: extractTriggers(message, CHALLENGE_PATTERNS) };
  }

  if (STRUCTURE_PATTERNS.test(message)) {
    return { mode: "STRUCTURE", triggerKeywords: extractTriggers(message, STRUCTURE_PATTERNS) };
  }

  if (CLARIFY_PATTERNS.test(message)) {
    return { mode: "CLARIFY", triggerKeywords: extractTriggers(message, CLARIFY_PATTERNS) };
  }

  // Default by conversation length
  if (messageCount <= 2) return { mode: "CLARIFY", triggerKeywords: [] };
  if (messageCount >= 8) return { mode: "OPERATIONALIZE", triggerKeywords: [] };
  return { mode: "STRUCTURE", triggerKeywords: [] };
}
