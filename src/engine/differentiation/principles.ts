// ═══════════════════════════════════════════════
// 12 Differentiation Principles (P1–P12)
// Each principle has a strict semantic definition grounded in
// existing knowledge files (differentiationKnowledge.ts,
// differentiationEngine.ts). Agents use these definitions to scan
// a client meeting transcript and produce scored observations.
//
// Option B mapping — each P maps 1:1 to an existing concept:
//   P1  ← REAL_DIFFERENTIATION_SIGNALS[0]  (HOW articulation)
//   P2  ← scoreClaimVerification           (evidence specificity)
//   P3  ← FAKE_DIFFERENTIATION_SIGNALS[7]  (anti-tradeoff detection)
//   P4  ← HIDDEN_VALUES[legitimacy]
//   P5  ← HIDDEN_VALUES[risk]
//   P6  ← HIDDEN_VALUES[empathy]
//   P7  ← HIDDEN_VALUES[narrative]
//   P8  ← CONTRARY_METRICS[displacement]
//   P9  ← CONTRARY_METRICS[explanation efficiency]
//   P10 ← HYBRID_CATEGORIES (whitespace hybrids)
//   P11 ← differentiationEngine.ashamedPainInsights
//   P12 ← BUYING_COMMITTEE_ROLES
// ═══════════════════════════════════════════════

export type PrincipleCode =
  | "P1" | "P2" | "P3" | "P4" | "P5" | "P6"
  | "P7" | "P8" | "P9" | "P10" | "P11" | "P12";

export interface PrincipleDefinition {
  code: PrincipleCode;
  name: { he: string; en: string };
  focus: { he: string; en: string };
  /** Questions the agent asks of the transcript. */
  scanQuestions: string[];
  /** Positive signals (high score). */
  positiveSignals: string[];
  /** Negative signals (low score / anti-pattern). */
  negativeSignals: string[];
  /** Source constant in the existing knowledge base. */
  source: string;
}

export const PRINCIPLES: readonly PrincipleDefinition[] = [
  {
    code: "P1",
    name: { he: "בהירות מנגנון", en: "Mechanism Clarity" },
    focus: {
      he: "האם הלקוח מתאר HOW (מנגנון, מתודולוגיה) ולא רק WHAT (תכונות)?",
      en: "Does the client articulate HOW (mechanism, methodology), not just WHAT (features)?",
    },
    scanQuestions: [
      "Does the speaker name a specific mechanism, methodology, or process?",
      "Can you extract a 'we do X through Y which means Z' structure?",
      "Is there a named framework or repeatable procedure mentioned?",
    ],
    positiveSignals: ["named methodology", "numbered steps", "process diagram implied", "uses 'through' or 'via' to link action to outcome"],
    negativeSignals: ["only adjectives", "'innovative'/'best-in-class'/'cutting-edge'", "no verb linking input to output"],
    source: "REAL_DIFFERENTIATION_SIGNALS[0]",
  },
  {
    code: "P2",
    name: { he: "צפיפות ראיות", en: "Evidence Density" },
    focus: {
      he: "האם טענות הבידול נתמכות בלקוח ספציפי, מספר, או תוצאה מדידה?",
      en: "Are differentiation claims backed by a specific client, number, or measurable outcome?",
    },
    scanQuestions: [
      "Does the speaker name a specific customer or case?",
      "Are there concrete metrics (numbers, percentages, timeframes)?",
      "Are outcomes tied to the claim, or is the claim abstract?",
    ],
    positiveSignals: ["named customer", "percentage lift", "case with before/after", "time-bound outcome"],
    negativeSignals: ["'many clients'", "'we help companies'", "no metrics", "evidence is vibes"],
    source: "differentiationEngine.scoreClaimVerification",
  },
  {
    code: "P3",
    name: { he: "הצהרת tradeoff", en: "Tradeoff Declaration" },
    focus: {
      he: "האם הלקוח מצהיר במפורש מה הוא לא עושה / במה ויתר?",
      en: "Does the client explicitly declare what they do NOT do / what they gave up?",
    },
    scanQuestions: [
      "Does the speaker name something they deliberately chose not to do?",
      "Do they acknowledge a weakness that is also a design choice?",
      "Is there a 'we chose X over Y' statement?",
    ],
    positiveSignals: ["'we don't do'", "'we chose depth over breadth'", "explicit non-customer", "naming beneficiary of the tradeoff"],
    negativeSignals: ["'we are good at everything'", "no declared weakness", "all-market positioning"],
    source: "FAKE_DIFFERENTIATION_SIGNALS[7]",
  },
  {
    code: "P4",
    name: { he: "לגיטימציה", en: "Legitimacy Driver" },
    focus: {
      he: "האם עולה צורך של הלקוח ב-'להיראות מוכשר' — אסוציאציות למותגים, תעודות, הצלחות?",
      en: "Does the 'look competent' driver surface — brand associations, certifications, wins?",
    },
    scanQuestions: [
      "Are big/known brand names invoked?",
      "Are certifications or industry credentials mentioned?",
      "Is social proof framed as legitimacy rather than price?",
    ],
    positiveSignals: ["known brand references", "industry awards", "certifications", "advisory board names"],
    negativeSignals: ["legitimacy signals absent", "credentials unaddressed"],
    source: "HIDDEN_VALUES[legitimacy]",
  },
  {
    code: "P5",
    name: { he: "מסגור סיכון", en: "Risk Framing" },
    focus: {
      he: "איך מתוארת הפחתת סיכון — pilot, exit clause, guarantee, phased rollout?",
      en: "How is risk mitigation expressed — pilot, exit clause, guarantee, phased rollout?",
    },
    scanQuestions: [
      "Are risk-mitigation mechanisms named?",
      "Is there language around reversibility or low commitment?",
      "Does the speaker address buyer career risk explicitly?",
    ],
    positiveSignals: ["pilot program", "money-back", "phased rollout", "exit clause", "SLA"],
    negativeSignals: ["'just trust us'", "no reversibility", "big upfront commitment"],
    source: "HIDDEN_VALUES[risk]",
  },
  {
    code: "P6",
    name: { he: "אמפתיה תחומית", en: "Domain Empathy" },
    focus: {
      he: "האם השפה תעשייתית־ספציפית, עם הכרה באילוצים אמיתיים של הלקוח?",
      en: "Is the language industry-specific, acknowledging real constraints of the customer?",
    },
    scanQuestions: [
      "Is jargon used correctly and specifically?",
      "Are realistic timelines / constraints acknowledged?",
      "Does the speaker name the customer's environment accurately?",
    ],
    positiveSignals: ["industry terminology", "acknowledged constraint", "realistic timeline", "specific environment description"],
    negativeSignals: ["generic language", "over-promising timelines", "abstract buyer description"],
    source: "HIDDEN_VALUES[empathy]",
  },
  {
    code: "P7",
    name: { he: "קוהרנטיות נרטיב", en: "Narrative Coherence" },
    focus: {
      he: "האם יש סיפור מקור / transformation arc / before-after ברור?",
      en: "Is there an origin story / transformation arc / clear before-after?",
    },
    scanQuestions: [
      "Is there an origin story?",
      "Is there a before/after transformation arc?",
      "Can a customer retell this as a story?",
    ],
    positiveSignals: ["origin moment", "before/after beats", "personal turning point", "transformation language"],
    negativeSignals: ["no story", "feature list only", "no arc"],
    source: "HIDDEN_VALUES[narrative]",
  },
  {
    code: "P8",
    name: { he: "עקירה תחרותית", en: "Competitive Displacement" },
    focus: {
      he: "האם מוזכר שלקוחות עברו מספק אחר אמצע חוזה? עד כמה זה קורה?",
      en: "Is it mentioned that customers switched mid-contract from another vendor? How often?",
    },
    scanQuestions: [
      "Does the speaker describe mid-contract switches?",
      "Are competitors named with displacement detail?",
      "Is there conviction strength (not just new logos)?",
    ],
    positiveSignals: ["'replaced X mid-contract'", "named competitor with switch reason", "% displacement rate"],
    negativeSignals: ["only new logos mentioned", "no switches", "competitor nameless"],
    source: "CONTRARY_METRICS[displacement]",
  },
  {
    code: "P9",
    name: { he: "יעילות הסבר", en: "Explanation Efficiency" },
    focus: {
      he: "האם יש משפט אחד קצר שלקוח יכול לצטט? האם ההגדרה בהירה?",
      en: "Is there a crisp one-line definition a customer could quote?",
    },
    scanQuestions: [
      "Is there a <15-second pitch the speaker converges on?",
      "Does the same phrasing recur across turns (verbal consistency)?",
      "Can you extract a single sentence that defines the offer?",
    ],
    positiveSignals: ["repeated one-liner", "crisp definition", "memorable phrase", "under 15 sec to explain"],
    negativeSignals: ["definition drifts each turn", "requires 2-minute preamble", "different framing each time"],
    source: "CONTRARY_METRICS[explanation efficiency]",
  },
  {
    code: "P10",
    name: { he: "היברידיות קטגוריה", en: "Category Hybridity" },
    focus: {
      he: "האם המיצוב חוצה בין שתי קטגוריות קיימות (כמו 'יועץ-מוצר' / 'נתונים-נרטיב')?",
      en: "Does the positioning straddle two existing categories (e.g., 'Consultant-Product', 'Data-Narrative')?",
    },
    scanQuestions: [
      "Are two distinct categories invoked together?",
      "Is whitespace between them articulated?",
      "Is the hybrid presented intentionally, not by accident?",
    ],
    positiveSignals: ["'X meets Y'", "two category labels", "whitespace articulation", "intentional hybrid"],
    negativeSignals: ["single category only", "'we are like competitor-name'"],
    source: "HYBRID_CATEGORIES",
  },
  {
    code: "P11",
    name: { he: "כאב מבוייש כיתרון", en: "Ashamed Pain as Edge" },
    focus: {
      he: "האם עולה תהליך/פער שהלקוח מתבייש בו אבל בעצם ייחודי לו?",
      en: "Does a process/gap the client is embarrassed about surface as actually unique to them?",
    },
    scanQuestions: [
      "Is there a 'we're not proud of this but...' admission?",
      "Can that admission be reframed as distinctive mechanism?",
      "Does the speaker acknowledge internal friction that outsiders don't see?",
    ],
    positiveSignals: ["'embarrassed about'", "internal process revealed", "raw admission", "'this is the part we hide'"],
    negativeSignals: ["polished narrative only", "no vulnerability", "all-positive framing"],
    source: "differentiationEngine.ashamedPainInsights",
  },
  {
    code: "P12",
    name: { he: "מפת ועדת קנייה", en: "Buying Committee Map" },
    focus: {
      he: "אילו תפקידים מתוארים בהחלטה — champion, technical, economic, user, legal, exec, saboteur?",
      en: "Which roles are described in the decision — champion, technical, economic, user, legal, exec, saboteur?",
    },
    scanQuestions: [
      "Are multiple buyer roles described?",
      "Is decision latency / committee size implied?",
      "Are any saboteurs or blockers named?",
    ],
    positiveSignals: ["champion / technical / economic / exec roles named", "saboteur identified", "committee size described"],
    negativeSignals: ["single buyer assumption", "no decision process detail"],
    source: "BUYING_COMMITTEE_ROLES",
  },
] as const;

export const PRINCIPLES_BY_CODE: ReadonlyMap<PrincipleCode, PrincipleDefinition> = new Map(
  PRINCIPLES.map((p) => [p.code, p] as const),
);

export function getPrincipleByCode(code: PrincipleCode): PrincipleDefinition | undefined {
  return PRINCIPLES_BY_CODE.get(code);
}

// ───────────────────────────────────────────────
// Agent output contract + aggregation
// ───────────────────────────────────────────────

export interface PrincipleAgentOutput {
  principleCode: PrincipleCode;
  principleName: string;
  relevanceScore: number; // 0..10
  evidenceQuotes: string[];
  summaryObservation: string;
  differentiationHypothesis: string;
  /** True if the LLM call failed and this is a placeholder. */
  failed?: boolean;
  error?: string;
}

export interface ConvergenceReport {
  strongSignals: PrincipleAgentOutput[]; // score >= 8
  weakSignals: PrincipleAgentOutput[];   // 6 <= score < 8
  belowThreshold: PrincipleAgentOutput[]; // < 6
  /** Per CLAUDE.md aggregation rule. */
  convergence: "strong" | "weak";
  /** The principle codes that cleared the high-score bar. */
  corePrinciples: string[];
}

const STRONG_THRESHOLD = 8;
const MIN_STRONG_FOR_CONVERGENCE = 3;
const WEAK_THRESHOLD = 6;

export function aggregatePrincipleOutputs(outputs: PrincipleAgentOutput[]): ConvergenceReport {
  const valid = outputs.filter((o) => !o.failed);
  const strongSignals = valid
    .filter((o) => o.relevanceScore >= STRONG_THRESHOLD)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
  const weakSignals = valid
    .filter((o) => o.relevanceScore >= WEAK_THRESHOLD && o.relevanceScore < STRONG_THRESHOLD)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
  const belowThreshold = valid
    .filter((o) => o.relevanceScore < WEAK_THRESHOLD)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const convergence: "strong" | "weak" =
    strongSignals.length >= MIN_STRONG_FOR_CONVERGENCE ? "strong" : "weak";

  return {
    strongSignals,
    weakSignals,
    belowThreshold,
    convergence,
    corePrinciples: strongSignals.map((o) => o.principleCode),
  };
}
