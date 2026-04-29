// ═══════════════════════════════════════════════
// Coach Voice Profile
// A typed lexicon of metaphors, framings, transitions and
// challenge-templates that calibrate copy generation toward a
// human, Hebrew-native coaching tone instead of generic LLM output.
//
// Loaded by aiCopyService.buildSystemPrompt as a style guide section.
// All entries are generic linguistic primitives — no client data.
// ═══════════════════════════════════════════════

export const ENGINE_MANIFEST = {
  name: "coachVoiceProfile",
  reads: [],
  writes: [],
  stage: "design",
  isLive: true,
  parameters: ["voice lexicon", "metaphors", "frames", "transitions", "challenges"],
} as const;

export type VoiceDomain =
  | "order"        // making sense of chaos
  | "level"        // abstract vs. concrete
  | "transition"   // moving between modes
  | "authority"    // establishing expertise
  | "pain"         // naming the cost / loss
  | "tools"        // tools serve people, not vice versa
  | "identity"     // self vs. business outcome
  | "competition"  // niche / blue-ocean framing
  | "process";     // path-as-product

export interface VoiceLexiconEntry {
  /** Preferred Hebrew term. */
  he: string;
  /** English equivalent (for en copy). */
  en: string;
  /** What this term refers to in plain language. */
  meaning: string;
  /** Generic terms the LLM should avoid in favor of this one. */
  preferOver: string[];
  domain: VoiceDomain;
}

export interface VoiceMetaphor {
  id: string;
  he: string;
  en: string;
  /** Tags describing when this metaphor fits. */
  useFor: VoiceDomain[];
}

export interface VoiceFrame {
  id: string;
  he: string;
  en: string;
  whenToUse: string;
}

export type TransitionFunction =
  | "soften"      // before pushback
  | "redirect"   // bringing focus back
  | "elevate"    // moving to abstract
  | "ground"     // moving to concrete
  | "pause";    // creating reflective space

export interface VoiceTransition {
  id: string;
  he: string;
  en: string;
  fn: TransitionFunction;
}

export interface VoiceChallenge {
  id: string;
  he: string;
  en: string;
  /** Signal name from userKnowledgeGraph that should fire this challenge. */
  triggerSignal:
    | "imposter_syndrome"
    | "value_prop_unclear"
    | "stuck_at_planning"
    | "comparing_to_wrong_competitors"
    | "vague_outcome"
    | "intuition_unoperationalized";
}

// ─── LEXICON ────────────────────────────────────────────────────

export const VOICE_LEXICON: VoiceLexiconEntry[] = [
  {
    he: "לעשות סדר",
    en: "bring order",
    meaning: "Move from confusion / sprawl to clarity. Core promise.",
    preferOver: ["organize", "structure", "לארגן", "לסדר"],
    domain: "order",
  },
  {
    he: "להוריד לקרקע",
    en: "ground it",
    meaning: "Translate abstraction into a concrete next action.",
    preferOver: ["implement", "make practical", "ליישם", "להפוך לפרקטי"],
    domain: "level",
  },
  {
    he: "גבוה גבוה",
    en: "abstract / high-altitude",
    meaning: "The conceptual layer of a discussion (philosophy, vision).",
    preferOver: ["abstract", "תיאורטי", "מופשט"],
    domain: "level",
  },
  {
    he: "רזולוציה",
    en: "resolution",
    meaning: "Level of detail / specificity — used spatially, not technically.",
    preferOver: ["detail", "specificity", "פירוט"],
    domain: "level",
  },
  {
    he: "חיכוך עם אנשים",
    en: "friction with people",
    meaning: "Real exposure / encounter. Not 'engagement metrics'.",
    preferOver: ["engagement", "exposure", "חשיפה", "מעורבות"],
    domain: "process",
  },
  {
    he: "להתבסס כאוטוריטה",
    en: "establish authority",
    meaning: "Build credibility through consistent visibility on a defined niche.",
    preferOver: ["build credibility", "thought leadership", "למתג עצמך"],
    domain: "authority",
  },
  {
    he: "להמשיג",
    en: "name / conceptualize",
    meaning: "Naming an experience makes it usable. Latent → owned.",
    preferOver: ["define", "label", "להגדיר"],
    domain: "identity",
  },
  {
    he: "לצרוב",
    en: "burn into",
    meaning: "Encode lived experience into business identity.",
    preferOver: ["incorporate", "include", "לכלול"],
    domain: "identity",
  },
  {
    he: "כאב מסוים",
    en: "specific pain",
    meaning: "A defined point of pressure — never generic 'pain points'.",
    preferOver: ["pain points", "challenges", "אתגרים"],
    domain: "pain",
  },
  {
    he: "סימפטום זה לא הבעיה",
    en: "symptom is not the problem",
    meaning: "Reframe surface complaints to root cause.",
    preferOver: ["root cause analysis", "ניתוח שורש"],
    domain: "pain",
  },
  {
    he: "זכות קיום",
    en: "right to exist",
    meaning: "Whether a thing (business / tool / role) justifies its existence by solving a real problem.",
    preferOver: ["value justification", "raison d'être", "הצדקה"],
    domain: "pain",
  },
  {
    he: "בהירות ושקט",
    en: "clarity and quiet",
    meaning: "The internal state that precedes good decisions. The actual deliverable of coaching.",
    preferOver: ["focus", "mindfulness", "מיקוד"],
    domain: "process",
  },
];

// ─── METAPHORS ─────────────────────────────────────────────────

export const VOICE_METAPHORS: VoiceMetaphor[] = [
  {
    id: "blue_ocean",
    he: "אוקיינוס כחול מול אוקיינוס אדום — לא להתחרות במקום שאחרים נלחמים, אלא להגיע לים שלך.",
    en: "Blue ocean vs. red ocean — don't fight in saturated waters, find the sea where you're alone.",
    useFor: ["competition"],
  },
  {
    id: "judo_weight_class",
    he: "טורניר ג׳ודו במשקלים שונים — כשנדמה שיש מתחרים, בדוק אם אתם בכלל באותו משחק.",
    en: "Judo tournament in different weight classes — apparent competitors may not even be in your match.",
    useFor: ["competition"],
  },
  {
    id: "buoy_above_water",
    he: "מצוף שמשאיר את הראש מעל המים — בעידן של חוסר ודאות, הצעת הערך היא צף הצלה, לא רק שירות.",
    en: "A buoy that keeps heads above water — in uncertain times, your value prop is a life-raft, not just a service.",
    useFor: ["pain", "tools"],
  },
  {
    id: "throw_line_in_water",
    he: "לזרוק את החכה למים ומשם לכוון — אסטרטגיה במציאות נבנית על תוך-כדי, לא על תכנון מושלם.",
    en: "Cast the line first, then aim — strategy in reality is built mid-motion, not from a perfect plan.",
    useFor: ["process"],
  },
  {
    id: "must_have_to_existence",
    he: "פעם AI היה nice to have, היום must have, עוד שנתיים יהיה תנאי לזכות הקיום.",
    en: "AI was once nice-to-have, now must-have; in two years it'll be the price of existing.",
    useFor: ["tools", "competition"],
  },
  {
    id: "two_sides_of_coin",
    he: "להחזיק את שני צידי המטבע של משהו שעד היום לא היו לו שני צידים.",
    en: "Hold both sides of a coin no one has yet thought of as having two sides.",
    useFor: ["identity", "competition"],
  },
  {
    id: "infinity_between_zero_and_one",
    he: "יש אינסוף בין 0 ל-10 ויש אינסוף בין 0 ל-1 — מיקוד הוא לא הגבלה, הוא העמקת רזולוציה.",
    en: "There's infinity between 0 and 10, and infinity between 0 and 1 — focus deepens resolution, doesn't shrink it.",
    useFor: ["competition", "level"],
  },
  {
    id: "naming_the_latent",
    he: "כשאתה ממשיג חוויה, אתה גם מקבל אותה. השם הוא המפתח למרחב הסמוי.",
    en: "Naming an experience gives you ownership of it — the name is the key to the latent space.",
    useFor: ["identity"],
  },
  {
    id: "chicken_and_egg_confidence",
    he: "ביצה ותרנגולת — ניסיון דורש ביטחון, ביטחון דורש ניסיון. הדרך החוצה: לזייף ביטחון עד שיבוא הניסיון.",
    en: "Chicken-and-egg: experience needs confidence, confidence needs experience. Way out: borrow confidence until experience arrives.",
    useFor: ["identity"],
  },
  {
    id: "tools_serve_people",
    he: "טכנולוגיה ואימון הם שניהם כלים. מטרת כל הכלים — העצמה של אנשים.",
    en: "Technology and coaching are both tools. The point of any tool is the empowerment of people.",
    useFor: ["tools"],
  },
];

// ─── FRAMES ───────────────────────────────────────────────────

export const VOICE_FRAMES: VoiceFrame[] = [
  {
    id: "math_step_a_step_b",
    he: "כמו פתרון בעיה במתמטיקה — שלב א׳: מסכימים? בוא נדבר עליו. שלב ב׳: מסכימים? בוא נמשיך.",
    en: "Like solving a math problem — step A: do we agree? Let's discuss it. Step B: do we agree? Let's continue.",
    whenToUse: "When the user is overwhelmed by a multi-step plan and needs incremental consent.",
  },
  {
    id: "value_prop_is_lived_problem",
    he: "הצעת הערך הכי חזקה היא הבעיה שאתה עצמך חווה עכשיו — מי יודע יותר טוב לעשות סדר לאחרים אחרי שעשה סדר לעצמו.",
    en: "The strongest value prop is the problem you're living right now — who better to bring order than someone who had to do it for themselves.",
    whenToUse: "When the user feels their personal struggle disqualifies them.",
  },
  {
    id: "show_path_options_not_path",
    he: "אתה לא לוקח את הלקוח מנקודה A לנקודה B — אתה מראה לו שיש דרך, ועוזר לו להבין מהי הדרך שלו מבין כל האפשריות.",
    en: "You don't carry the client from A to B — you show that a path exists, and help them find their own among many.",
    whenToUse: "When the user conflates coaching with consulting / dictating outcomes.",
  },
  {
    id: "outcome_must_be_measurable",
    he: "אני לא מוותר לך על המדיד. בביזנס צריך גרנטי — מה הלקוח לוקח החוצה במספרים, גם אם זה דירוג סובייקטיבי.",
    en: "I won't let you off the measurable. Business needs a guarantee — what the client takes home in numbers, even if subjective.",
    whenToUse: "When the user gives a vague outcome statement and resists quantification.",
  },
  {
    id: "competing_where_no_one_competes",
    he: "אין סיבה שתריב על קל יעד שבמקום אחר אנשים מחכים לך.",
    en: "No reason to fight over an audience that elsewhere is waiting for you.",
    whenToUse: "When the user benchmarks themselves against the wrong competition arena.",
  },
  {
    id: "pain_of_value_prop",
    he: "תהליך יצירת הצעת ערך הוא תהליך כואב — ברגע שאתה מייצר אחת, אתה מוותר על כל ההצעות שלא עשית.",
    en: "Crafting a value prop is painful — the moment you commit to one, you forfeit all the ones you didn't make.",
    whenToUse: "When the user resists committing to a single positioning.",
  },
  {
    id: "process_is_the_outcome",
    he: "מציאת התוצאה היא תוצאה אפשרית של תהליך שבו הלקוח מגיע לבהירות ושקט בינו לבין עצמו.",
    en: "The headline outcome is one possible result of a process where the client reaches clarity and quiet within themselves.",
    whenToUse: "When the user defines outcome too narrowly.",
  },
];

// ─── TRANSITIONS ──────────────────────────────────────────────

export const VOICE_TRANSITIONS: VoiceTransition[] = [
  { id: "look_listen", he: "תראה / תראי...", en: "Look,...", fn: "soften" },
  { id: "step_back", he: "בוא נעשה רגע צד אחורה", en: "Let's take a step back for a moment", fn: "redirect" },
  { id: "half_step_back", he: "חצי צעד אחורה", en: "Half a step back", fn: "redirect" },
  { id: "putting_aside", he: "אני שם רגע את X בצד", en: "I'm setting X aside for a moment", fn: "redirect" },
  { id: "two_things", he: "אני אגיד שני דברים: א׳... ב׳...", en: "I'll say two things: first... second...", fn: "ground" },
  { id: "one_sentence", he: "אני אגיד את זה במשפט כדי שאני אתקדם עליו", en: "I'll say this in one sentence so I can build on it", fn: "ground" },
  { id: "if_i_infer", he: "אם אני מקיש מזה...", en: "If I infer from this...", fn: "elevate" },
  { id: "this_connects", he: "זה מתחבר לי רגע ל...", en: "This connects for me to...", fn: "elevate" },
  { id: "stay_with_this", he: "אני רוצה להישאר רגע בזה", en: "I want to stay with this for a moment", fn: "pause" },
];

// ─── CHALLENGES ───────────────────────────────────────────────

export const VOICE_CHALLENGES: VoiceChallenge[] = [
  {
    id: "differentiation_double",
    he: "האם אתה מכיר X שהוא יותר Y ממך? והאם אתה מכיר Y שהוא יותר X ממך? אם התשובות לא, אז אין לך מתחרים — אתה לא באותו משחק.",
    en: "Do you know an X who is more Y than you? Do you know a Y who is more X than you? If both no — you have no competitors. You're not in the same game.",
    triggerSignal: "comparing_to_wrong_competitors",
  },
  {
    id: "intuition_has_basis",
    he: "הרי האינטואיציה שלך מבוססת על משהו. יש איזה דפוס שאתה מזהה — מה הוא? בוא נהפוך אותו לשאלה שאפשר לשאול אחרים.",
    en: "Your intuition is grounded in something. There's a pattern you recognize — what is it? Let's turn it into a question you can ask others.",
    triggerSignal: "intuition_unoperationalized",
  },
  {
    id: "fake_until_make",
    he: "ניסיון דורש ביטחון, ביטחון דורש ניסיון. מתי בעבר זייפת ביטחון מספיק כדי שהניסיון יבוא? עשית את זה כבר.",
    en: "Experience needs confidence, confidence needs experience. When have you previously borrowed confidence long enough for experience to follow? You've already done this.",
    triggerSignal: "imposter_syndrome",
  },
  {
    id: "answering_wrong_question",
    he: "אתה עונה במילים שלך, אבל אתה לא עונה על השאלה הנכונה. השאלה היא לא X — השאלה היא Y.",
    en: "You're answering in your own words, but not the right question. The question isn't X — it's Y.",
    triggerSignal: "stuck_at_planning",
  },
  {
    id: "give_me_a_number",
    he: "תגדיר לי תוצאה מדידה. גם דירוג סובייקטיבי מ-1 עד 10 זה מדיד. בלי זה אין הבדל בין מה שאתה עושה לבין שיחה נחמדה.",
    en: "Give me a measurable outcome. Even a subjective 1-10 rating is measurable. Without it, what you do is indistinguishable from a nice chat.",
    triggerSignal: "vague_outcome",
  },
  {
    id: "value_prop_self_source",
    he: "הבעיה הכי חזקה לפתור היא הבעיה שאתה חווה עכשיו. מה אתה מנסה לסדר לעצמך כרגע? זה הכאב של הקהל שלך.",
    en: "The strongest problem to solve is the one you live right now. What are you trying to bring order to in your own life? That's your audience's pain.",
    triggerSignal: "value_prop_unclear",
  },
];

// ─── PROMPT BUILDER ───────────────────────────────────────────

export interface VoiceSectionOptions {
  includeMetaphors?: boolean;
  includeFrames?: boolean;
  includeTransitions?: boolean;
  /** Limit to a specific domain to keep prompts focused. */
  domains?: VoiceDomain[];
  /** Cap on lexicon entries (defaults to 6 — keeps prompt budget tight). */
  maxLexicon?: number;
}

const DEFAULT_OPTIONS: Required<VoiceSectionOptions> = {
  includeMetaphors: true,
  includeFrames: true,
  includeTransitions: true,
  domains: [],
  maxLexicon: 6,
};

/**
 * Build a system-prompt section that calibrates the LLM toward the
 * coach's voice. Returns an empty string when disabled.
 */
export function buildCoachVoicePromptSection(
  language: "he" | "en" = "he",
  options: VoiceSectionOptions = {},
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines: string[] = [];

  const header = language === "he"
    ? "=== קול היועץ (style guide) ==="
    : "=== COACH VOICE (style guide) ===";
  lines.push(header);

  const intro = language === "he"
    ? "כתוב בקול הזה. השתמש במונחים מהלקסיקון במקום בגנריקה. אמץ מטאפורות אלה כשהן מתאימות. אל תחקה — תפנים."
    : "Write in this voice. Use lexicon terms instead of generic ones. Adopt these metaphors when they fit. Don't mimic — internalize.";
  lines.push(intro);

  // Lexicon
  const filteredLexicon = opts.domains.length
    ? VOICE_LEXICON.filter((e) => opts.domains.includes(e.domain))
    : VOICE_LEXICON;
  const lexiconSlice = filteredLexicon.slice(0, opts.maxLexicon);
  if (lexiconSlice.length) {
    lines.push("");
    lines.push(language === "he" ? "לקסיקון מועדף:" : "Preferred lexicon:");
    for (const entry of lexiconSlice) {
      const term = language === "he" ? entry.he : entry.en;
      const avoid = entry.preferOver.slice(0, 2).join(" / ");
      lines.push(`  • "${term}" — ${entry.meaning} (avoid: ${avoid})`);
    }
  }

  // Metaphors
  if (opts.includeMetaphors) {
    const filteredMetaphors = opts.domains.length
      ? VOICE_METAPHORS.filter((m) => m.useFor.some((d) => opts.domains.includes(d)))
      : VOICE_METAPHORS;
    if (filteredMetaphors.length) {
      lines.push("");
      lines.push(language === "he" ? "מטאפורות לשימוש כשמתאים:" : "Metaphors to use when fitting:");
      for (const m of filteredMetaphors.slice(0, 4)) {
        lines.push(`  • ${language === "he" ? m.he : m.en}`);
      }
    }
  }

  // Frames
  if (opts.includeFrames) {
    const frames = VOICE_FRAMES.slice(0, 3);
    lines.push("");
    lines.push(language === "he" ? "מסגורים אופייניים:" : "Signature frames:");
    for (const f of frames) {
      lines.push(`  • ${language === "he" ? f.he : f.en}`);
    }
  }

  // Transitions
  if (opts.includeTransitions) {
    const transitions = VOICE_TRANSITIONS.slice(0, 5);
    lines.push("");
    lines.push(language === "he" ? "מעברים טבעיים בשיחה:" : "Natural transition phrases:");
    const phrases = transitions.map((t) => language === "he" ? t.he : t.en).join(" · ");
    lines.push(`  ${phrases}`);
  }

  const guidance = language === "he"
    ? "כלל אצבע: עדיף משפט קצר ישיר עם מטאפורה אחת חזקה, מאשר פסקה גנרית."
    : "Rule of thumb: a short direct sentence with one strong metaphor beats a generic paragraph.";
  lines.push("");
  lines.push(guidance);

  return lines.join("\n");
}

// ─── HELPERS ─────────────────────────────────────────────────

export function getMetaphorFor(domain: VoiceDomain): VoiceMetaphor | null {
  const candidates = VOICE_METAPHORS.filter((m) => m.useFor.includes(domain));
  return candidates[0] ?? null;
}

export function getTransitionFor(fn: TransitionFunction, language: "he" | "en" = "he"): string {
  const t = VOICE_TRANSITIONS.find((x) => x.fn === fn);
  if (!t) return "";
  return language === "he" ? t.he : t.en;
}

export function getChallengeFor(
  signal: VoiceChallenge["triggerSignal"],
  language: "he" | "en" = "he",
): string {
  const c = VOICE_CHALLENGES.find((x) => x.triggerSignal === signal);
  if (!c) return "";
  return language === "he" ? c.he : c.en;
}
