// ═══════════════════════════════════════════════
// Differentiation Conversation Stages (14-stage state machine)
// Derived from CLAUDE.md "Layer 1 — 14-Stage State Machine" spec.
//
// Two uses:
// 1. Reference definitions (for UI hints, facilitator guidance).
// 2. Transcript auto-detection (flag which stages appear in a session).
// ═══════════════════════════════════════════════

export type StageId =
  | "FRAME_RESET"
  | "RECONTAINMENT"
  | "SURFACE_ANSWER_REJECT"
  | "FUNCTION_TO_MOTIVATION"
  | "COMPRESSION_DEMAND"
  | "REGRESSION_CHAIN"
  | "COMPARATIVE_DIFFERENTIATION"
  | "EVIDENCE_EXTRACTION"
  | "META_OBSERVATION"
  | "RESEARCH_VALIDATION"
  | "CLIENT_NAMING_MOMENT"
  | "NARRATIVE_WEAVING"
  | "MARKET_POSITIONING_CHECK"
  | "CONTAINER_CLOSE";

export interface ConversationStage {
  id: StageId;
  number: number;
  name: { he: string; en: string };
  description: { he: string; en: string };
  /** Suggested facilitator prompt, if any. */
  promptTemplate?: { he: string; en: string };
  /** Whether this stage is critical (missing it weakens the whole session). */
  critical?: boolean;
  /** Heuristic keyword/phrase matchers used by `detectStagesInTranscript`. */
  detectionPatterns: {
    he: RegExp[];
    en: RegExp[];
  };
}

// Keyword sets chosen to be restrictive: a match is a strong signal, not a guess.
// Hebrew patterns are written without word boundaries since Hebrew doesn't have
// reliable \b in JS regex; we rely on distinctive multi-char phrases.

export const STAGES: readonly ConversationStage[] = [
  {
    id: "FRAME_RESET", number: 1,
    name: { he: "איפוס מסגרת", en: "Frame Reset" },
    description: {
      he: "הלקוח דוחה את המסגרת הקיימת — המאמן מקבל את הביקורת בלי הגנה",
      en: "Client rejects current framework — facilitator accepts critique without defense",
    },
    detectionPatterns: {
      he: [/זה לא מתאים לי/i, /זה לא נכון/i, /אני לא מסכים/i, /המסגרת הזו/i],
      en: [/that doesn'?t fit/i, /that'?s not right/i, /i disagree with (the )?fram(e|ing)/i],
    },
  },
  {
    id: "RECONTAINMENT", number: 2,
    name: { he: "הכלה מחדש", en: "Recontainment" },
    description: {
      he: "המאמן מזיז את המוקד מהאובייקט (המוצר/השירות) אל הסובייקט (הלקוח עצמו)",
      en: "Facilitator shifts focus from the object (product/service) to the subject (client themselves)",
    },
    promptTemplate: { he: "מה מניע אותך לעבוד?", en: "What drives you to work?" },
    detectionPatterns: {
      he: [/מה מניע אותך/i, /מה מניע אותך לעבוד/i, /למה את(ה)? עושה/i],
      en: [/what drives you/i, /why do you (do|work)/i, /what motivates you/i],
    },
  },
  {
    id: "SURFACE_ANSWER_REJECT", number: 3,
    name: { he: "דחיית תשובה שטחית", en: "Surface Answer Reject" },
    description: {
      he: "הלקוח נתן תשובה מוכנה/כללית — המאמן דוחף לתשובה אישית",
      en: "Client gave a prepared/generic answer — facilitator pushes for a personal one",
    },
    detectionPatterns: {
      he: [/תשובה אישית/i, /מה את(ה)? באמת/i, /לא תשובה מוכנה/i, /לא בקלישאה/i],
      en: [/personal answer/i, /what do you really/i, /not the prepared/i, /without the cliché/i],
    },
  },
  {
    id: "FUNCTION_TO_MOTIVATION", number: 4,
    name: { he: "מפונקציה למוטיבציה", en: "Function to Motivation" },
    description: {
      he: "מעבר מהשאלה 'מה אתה עושה' לשאלה 'מה זה נותן לך'",
      en: "Shift from 'what do you do' to 'what does it give you'",
    },
    promptTemplate: { he: "מה בזה עושה לך טוב?", en: "What about this feels good to you?" },
    detectionPatterns: {
      he: [/מה (בזה )?עושה לך טוב/i, /מה זה נותן לך/i, /מה נותן לך סיפוק/i],
      en: [/what (about this )?feels good/i, /what does this give you/i, /what satisfies/i],
    },
  },
  {
    id: "COMPRESSION_DEMAND", number: 5,
    name: { he: "דרישת כיווץ", en: "Compression Demand" },
    description: {
      he: "המאמן דורש מהלקוח לתמצת הכל במשפט אחד — כישלון הוא דאטה, לא כישלון",
      en: "Facilitator demands one-sentence compression — failure is data, not failure",
    },
    promptTemplate: { he: "תמשיג את זה במשפט אחד", en: "Conceptualize this in one sentence" },
    detectionPatterns: {
      he: [/במשפט אחד/i, /תמשיג/i, /תמצת/i, /בשורה אחת/i],
      en: [/in one sentence/i, /conceptualize/i, /summarize this in/i, /one line/i],
    },
  },
  {
    id: "REGRESSION_CHAIN", number: 6,
    name: { he: "שרשרת נסיגה", en: "Regression Chain" },
    description: {
      he: "דפוס: צעד אחד אחורה בזמן בכל שאלה — עד למקור",
      en: "Pattern: one step back in time per question, down to the origin",
    },
    detectionPatterns: {
      he: [/ולפני זה/i, /ומה היה לפני/i, /מתי זה התחיל/i, /מתי זה נולד/i],
      en: [/and before that/i, /when did this start/i, /when was this born/i, /earlier than that/i],
    },
  },
  {
    id: "COMPARATIVE_DIFFERENTIATION", number: 7,
    name: { he: "בידול השוואתי", en: "Comparative Differentiation" },
    description: {
      he: "שואלים למה אתה ספציפית ולא מישהו מסוים אחר",
      en: "Ask why you specifically and not a specific other person",
    },
    promptTemplate: {
      he: "למה אתה ולא מישהו ספציפי אחר?",
      en: "Why you and not a specific other person?",
    },
    detectionPatterns: {
      he: [/למה את(ה)? ולא/i, /ולא מישהו אחר/i, /מה אתה נותן ש[^ ]* לא/i],
      en: [/why you and not/i, /not someone else/i, /what do you offer that .* doesn'?t/i],
    },
  },
  {
    id: "EVIDENCE_EXTRACTION", number: 8,
    name: { he: "חילוץ ראיות", en: "Evidence Extraction" },
    description: {
      he: "דורשים דוגמה קונקרטית: איך זה בא לידי ביטוי בפועל",
      en: "Demand a concrete example: how does this actually manifest",
    },
    promptTemplate: { he: "איך זה בא לידי ביטוי?", en: "How does this manifest?" },
    detectionPatterns: {
      he: [/איך זה בא לידי ביטוי/i, /תן לי דוגמה/i, /מקרה ספציפי/i],
      en: [/how does (this|that) manifest/i, /give me an example/i, /specific case/i],
    },
  },
  {
    id: "META_OBSERVATION", number: 9,
    name: { he: "תצפית מטא", en: "Meta Observation" },
    description: {
      he: "המאמן מציע דפוס שהוא שומע + 'תקן אותי אם אני טועה'",
      en: "Facilitator proposes a pattern they're hearing + 'correct me if I'm wrong'",
    },
    detectionPatterns: {
      he: [/תקן אותי אם/i, /אם אני טועה/i, /אני שומע(ת)? דפוס/i, /אני שם(ה)? לב ש/i],
      en: [/correct me if (i'?m )?wrong/i, /i('?m)? hearing a pattern/i, /i notice that/i],
    },
  },
  {
    id: "RESEARCH_VALIDATION", number: 10,
    name: { he: "עיגון במחקר", en: "Research Validation" },
    description: {
      he: "המאמן מחבר את האינטואיציה למקור מחקרי",
      en: "Facilitator anchors intuition in research",
    },
    detectionPatterns: {
      he: [/יש מחקר/i, /מחקרים מראים/i, /לפי (המחקר|ה-research)/i, /במחקר של/i],
      en: [/research shows/i, /studies (show|indicate)/i, /according to research/i, /the literature/i],
    },
  },
  {
    id: "CLIENT_NAMING_MOMENT", number: 11,
    name: { he: "רגע ההשמה של הלקוח", en: "Client Naming Moment" },
    description: {
      he: "הלקוח נותן שם/מונח משלו — המאמן מקבל בלי לשנות",
      en: "Client gives their own term/name — facilitator receives without renaming",
    },
    critical: true,
    detectionPatterns: {
      he: [/אני קורא(ת)? לזה/i, /אני מכנה את זה/i, /לקרוא לזה/i, /זה בשבילי/i],
      en: [/i call (it|this)/i, /i name (it|this)/i, /for me (it'?s|this is)/i, /my term for/i],
    },
  },
  {
    id: "NARRATIVE_WEAVING", number: 12,
    name: { he: "שזירת נרטיב", en: "Narrative Weaving" },
    description: {
      he: "המאמן מחבר את המונח של הלקוח לכל הסיפורים שעלו קודם",
      en: "Facilitator connects the client's term back to all prior stories",
    },
    detectionPatterns: {
      he: [/זה מתחבר למה שאמרת/i, /זה בדיוק כמו/i, /כמו שסיפרת/i, /זה חוזר ל/i],
      en: [/this connects to what you said/i, /just like you (told|said)/i, /this goes back to/i],
    },
  },
  {
    id: "MARKET_POSITIONING_CHECK", number: 13,
    name: { he: "בדיקת מיצוב שוק", en: "Market Positioning Check" },
    description: {
      he: "השוואה לשוק: איך המונח/הנרטיב עומד מול המתחרים",
      en: "Market check: how the term/narrative holds up against competitors",
    },
    detectionPatterns: {
      he: [/מול השוק/i, /מול המתחרים/i, /בשוק אין/i, /אף אחד בשוק/i],
      en: [/versus the market/i, /against competitors/i, /nobody in the (market|space)/i],
    },
  },
  {
    id: "CONTAINER_CLOSE", number: 14,
    name: { he: "סגירת מיכל", en: "Container Close" },
    description: {
      he: "סוגרים עם וקטור (כיוון), לא עם מוצר סופי",
      en: "Close with a vector (direction), not a finished product",
    },
    detectionPatterns: {
      he: [/וקטור/i, /כיוון/i, /לא מוצר סופי/i, /המשך הדרך/i],
      en: [/vector/i, /direction/i, /not a (final|finished) product/i, /next step/i],
    },
  },
] as const;

export function getStageById(id: StageId): ConversationStage | undefined {
  return STAGES.find((s) => s.id === id);
}

// ───────────────────────────────────────────────
// Transcript auto-detection
// ───────────────────────────────────────────────

export interface DetectedStage {
  stageId: StageId;
  detected: boolean;
  matchedPhrases: string[];
  /** Byte offset of first match (for UI snippet preview). */
  firstMatchIndex: number | null;
}

export interface StageDetectionReport {
  detectedStages: DetectedStage[];
  missingStages: StageId[];
  criticalMissing: StageId[];
  coverage: number; // 0..1 — share of 14 stages that fired
}

/**
 * Run all 14 stage patterns against a transcript.
 * Pure function — no I/O. Safe to call in render paths (cheap regex).
 */
export function detectStagesInTranscript(transcript: string): StageDetectionReport {
  const text = transcript || "";
  const detected: DetectedStage[] = STAGES.map((stage) => {
    const patterns = [...stage.detectionPatterns.he, ...stage.detectionPatterns.en];
    const matched: string[] = [];
    let firstIdx: number | null = null;
    for (const re of patterns) {
      const m = text.match(re);
      if (m && m[0]) {
        matched.push(m[0]);
        if (firstIdx === null && m.index !== undefined) firstIdx = m.index;
      }
    }
    return {
      stageId: stage.id,
      detected: matched.length > 0,
      matchedPhrases: matched,
      firstMatchIndex: firstIdx,
    };
  });

  const missingStages = detected.filter((d) => !d.detected).map((d) => d.stageId);
  const criticalMissing = detected
    .filter((d) => !d.detected && STAGES.find((s) => s.id === d.stageId)?.critical)
    .map((d) => d.stageId);
  const firedCount = detected.filter((d) => d.detected).length;

  return {
    detectedStages: detected,
    missingStages,
    criticalMissing,
    coverage: firedCount / STAGES.length,
  };
}

/**
 * Extract a context snippet around the first match of a stage.
 * Returns `null` if stage was not detected.
 */
export function getStageSnippet(
  transcript: string,
  stageId: StageId,
  window: number = 120,
): string | null {
  const report = detectStagesInTranscript(transcript);
  const found = report.detectedStages.find((d) => d.stageId === stageId);
  if (!found || !found.detected || found.firstMatchIndex === null) return null;
  const start = Math.max(0, found.firstMatchIndex - window);
  const end = Math.min(transcript.length, found.firstMatchIndex + window);
  return (start > 0 ? "..." : "") + transcript.slice(start, end) + (end < transcript.length ? "..." : "");
}
