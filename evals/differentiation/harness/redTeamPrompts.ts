// ═══════════════════════════════════════════════
// Red-Team Prompt Library
//
// Five prompt templates that try to BREAK the differentiation output
// rather than improve it. Each returns a strict JSON shape for the
// scorer to consume.
//
// Design principle: anti-flattery. The LLM is instructed to prove the
// product does NOT justify its existence, not to be helpful.
// ═══════════════════════════════════════════════

import type { DifferentiationResult } from "@/types/differentiation";
import type { SyntheticPersona } from "../personas/personaSchema";

// ─── Output shapes (matched by scoring.ts) ──────────────────────────────────

export interface CriticOutput {
  coherent: boolean;
  weakest_claim: string;
  why: string;
  genericity_score: number; // 0-100; >70 = generic
}

export interface UsabilityOutput {
  would_use: boolean;
  where: string[]; // e.g., ["LinkedIn bio", "sales call opener", "WhatsApp pitch"]
  confidence: number; // 0-100
}

export interface OwnershipOutput {
  feels_mine: boolean;
  what_to_change: string;
}

export interface ComparisonOutput {
  winner: "ff" | "chatgpt" | "template" | "tie";
  on_dimensions: {
    clarity: "ff" | "chatgpt" | "template" | "tie";
    specificity: "ff" | "chatgpt" | "template" | "tie";
    actionability: "ff" | "chatgpt" | "template" | "tie";
    ownership: "ff" | "chatgpt" | "template" | "tie";
  };
  reason: string;
}

export interface PreMortemFailure {
  reason: string;
  category:
    | "real" | "positioning" | "ux" | "measurement"
    | "market" | "complexity" | "trust" | "price";
}

export interface PreMortemOutput {
  failures: PreMortemFailure[]; // exactly 20
}

// ─── Two-Stage Reproducibility Pipeline types ────────────────────────────────

export interface StructuralExtractionOutput {
  /** One specific number/metric extracted from the artifacts. */
  metric: {
    value: string;
    /** Which artifact it came from: post_1|post_2|post_3|deal_1|deal_2|deal_3|url */
    source: string;
  };
  /** Named competitor/alternative explicitly or implicitly referenced. */
  named_alternative: string;
  /** 3 things this business demonstrably does NOT do — things competitors do or clients request. */
  sacrifices: [string, string, string];
  /** 3 words/phrases that appear in lost-deal moments but NOT in the posts (honesty gap). */
  vocabulary_gap: [string, string, string];
}

export interface StylometricAngle {
  text_he: string;
  text_en: string;
  type: "mechanism" | "sacrifice" | "metric";
  /** Exact phrase borrowed from the post corpus. */
  borrowed_phrase: string;
  /** Why this angle is slightly uncomfortable to send — what makes it have teeth. */
  why_uncomfortable: string;
}

export interface StylometricRenderingOutput {
  angles: [StylometricAngle, StylometricAngle, StylometricAngle];
  /** Hebrew selection prompt that frames choice as "most accurate / hardest to send". */
  selection_prompt: string;
}

export interface FalsifiabilityCriticOutput {
  /** 0-100: 0 = only this person could say it. 100 = anyone in the industry could sign it. */
  genericity_score: number;
  /** Describe a specific competitor who could also truthfully send this angle. */
  who_else_could_say_this: string;
  /** What biographical/numerical constraint is missing that would make it exclusive. */
  missing_biographical_constraint: string;
  rewrite_required: boolean;
}

// ─── Anti-flattery preamble (shared by all prompts) ─────────────────────────

const ANTI_FLATTERY = `
תפקידך: red team adversary. אל תנסה לשפר את המוצר. נסה להוכיח שהוא לא מצדיק קיום.
בכל פלט אמיתי שתספק, החזר JSON תקין בלבד, בלי טקסט מסביב, בלי \`\`\`.
אל תהיה מנומס. אל תוסיף תיאוריות. תקיף את הפלט.
`.trim();

// ─── Persona context block (used by every prompt) ───────────────────────────

function personaContext(persona: SyntheticPersona): string {
  return `
אתה משחק את הפרסונה הבאה:
- ארכיטיפ: ${persona.archetype}
- segment: ${persona.segment}
- bias: ${persona.bias ?? "none"}
- שם עסק: ${persona.formData.businessName}
- תחום: ${persona.formData.industry}
- מתחרים: ${persona.formData.topCompetitors.join(", ") || "לא צוין"}
- positioning נוכחי: ${persona.formData.currentPositioning || "לא צוין"}
- סיבה אחרונה לעסקה אבודה: ${persona.formData.lostDealReason || "—"}
`.trim();
}

function oneLinerBlock(result: DifferentiationResult): string {
  const ol = result.mechanismStatement.oneLiner;
  return `
משפט הבידול שנוצר:
HE: ${ol.he || "(empty)"}
EN: ${ol.en || "(empty)"}

מנגנון: ${result.mechanismStatement.mechanism || "(empty)"}
הוכחה: ${result.mechanismStatement.proof || "(empty)"}
ציון בידול: ${result.differentiationStrength}/100
`.trim();
}

// ─── Prompts ────────────────────────────────────────────────────────────────

export function buildCriticPrompt(persona: SyntheticPersona, result: DifferentiationResult): string {
  return `
${ANTI_FLATTERY}

${personaContext(persona)}

${oneLinerBlock(result)}

המשימה: בקר את הפלט. החזר JSON עם השדות הבאים:
{
  "coherent": boolean,             // האם המשפט פנימית קוהרנטי
  "weakest_claim": string,         // הטענה החלשה ביותר
  "why": string,                   // למה היא חלשה (משפט אחד)
  "genericity_score": number       // 0-100. 0 = ייחודי לעסק הזה. 100 = יכול להתאים לכל עסק.
}
`.trim();
}

export function buildUsabilityPrompt(persona: SyntheticPersona, result: DifferentiationResult): string {
  return `
${ANTI_FLATTERY}

${personaContext(persona)}

${oneLinerBlock(result)}

המשימה: בתור הפרסונה — תגיד אם היית משתמש במשפט הזה. החזר JSON:
{
  "would_use": boolean,
  "where": string[],               // איפה הייתי משתמש (לדוגמה: ["פרופיל לינקדאין", "פתיחה לשיחת מכירה"]). [] אם לא הייתי משתמש בכלל.
  "confidence": number             // 0-100. כמה בטוח שזה ינחית עבורי.
}
`.trim();
}

export function buildOwnershipPrompt(persona: SyntheticPersona, result: DifferentiationResult): string {
  return `
${ANTI_FLATTERY}

${personaContext(persona)}

${oneLinerBlock(result)}

המשימה: בתור הפרסונה — תגיד אם המשפט הזה מרגיש לך שלך. החזר JSON:
{
  "feels_mine": boolean,           // האם זה נשמע כאילו אני כתבתי, או כאילו AI כפה עלי
  "what_to_change": string         // משפט אחד: מה הייתי משנה כדי שירגיש שלי. "" אם הוא בסדר.
}
`.trim();
}

export function buildComparisonPrompt(
  persona: SyntheticPersona,
  ffResult: DifferentiationResult,
  chatgptOutput: string,
  templateOutput: string,
): string {
  return `
${ANTI_FLATTERY}

${personaContext(persona)}

נתון לך שלוש גרסאות של משפט בידול לאותו עסק:

א. FunnelForge: ${ffResult.mechanismStatement.oneLiner.he || ffResult.mechanismStatement.oneLiner.en || "(empty)"}
ב. ChatGPT (raw): ${chatgptOutput}
ג. Template ("We help X do Y unlike Z"): ${templateOutput}

המשימה: בתור הפרסונה — תכריע מי המנצח וב-4 ממדים. החזר JSON:
{
  "winner": "ff" | "chatgpt" | "template" | "tie",
  "on_dimensions": {
    "clarity":      "ff" | "chatgpt" | "template" | "tie",
    "specificity":  "ff" | "chatgpt" | "template" | "tie",
    "actionability":"ff" | "chatgpt" | "template" | "tie",
    "ownership":    "ff" | "chatgpt" | "template" | "tie"
  },
  "reason": string                 // משפט אחד: למה המנצח ניצח
}
`.trim();
}

// ─── Two-Stage Reproducibility Prompts ──────────────────────────────────────

export function buildStructuralExtractionPrompt(persona: SyntheticPersona): string {
  const posts = persona.linkedinPosts
    .map((p, i) => `פוסט ${i + 1}:\n${p}`)
    .join("\n\n");
  const moments = persona.lostDealMoments
    .map((m, i) => `רגע ${i + 1}: ${m}`)
    .join("\n");
  const urlText = persona.profileUrl ? `URL: ${persona.profileUrl}` : "";
  const opArtifacts = persona.operationalArtifacts?.length
    ? `\nחומרים תפעוליים:\n${persona.operationalArtifacts.join("\n")}`
    : "";

  return `
אתה מחלץ עובדות מבניות מהחומרים הבאים של עסק.

עסק: ${persona.formData.businessName}
תחום: ${persona.formData.industry}
${urlText}

פוסטים ציבוריים (קול שיווקי):
${posts}

רגעי חיכוך עסקי — ממש מה נאמר לפני שעסקה נעצרה (לא סיבות כלליות):
${moments}
${opArtifacts}

חלץ בדיוק:
1. מספר/מדד ספציפי אחד שמוזכר או משתמע מהחומרים (לא המצאה — עובדה קיימת)
2. מתחרה או אלטרנטיבה אחת שמוזכרת במפורש או במשתמע
3. שלושה דברים שהעסק הזה demonstrably לא עושה — דברים שמתחרים עושים או שלקוחות מבקשים
4. שלוש מילים/ביטויים שמופיעים ברגעי החיכוך אבל לא בפוסטים (פער הכנות)

אם לא מוצאים מספר ספציפי בחומרים — החזר metric.value = "" ואל תמציא.

החזר JSON בלבד, בלי טקסט נוסף:
{
  "metric": { "value": string, "source": "post_1|post_2|post_3|deal_1|deal_2|deal_3|url" },
  "named_alternative": string,
  "sacrifices": [string, string, string],
  "vocabulary_gap": [string, string, string]
}
`.trim();
}

export function buildStylometricRenderingPrompt(
  persona: SyntheticPersona,
  extraction: StructuralExtractionOutput,
): string {
  const posts = persona.linkedinPosts
    .map((p, i) => `פוסט ${i + 1}:\n${p}`)
    .join("\n\n");

  const moments = persona.lostDealMoments
    .map((m, i) => `רגע ${i + 1}: ${m}`)
    .join("\n");

  const metricsNote = extraction.metric.value
    ? `מספר/מדד: ${extraction.metric.value} (מקור: ${extraction.metric.source})`
    : "אין מספר ספציפי זמין — הימנע מבדייה";

  return `
קורפוס ציבורי (LinkedIn — קול שיווקי, מלוטש):
${posts}

רגעי חיכוך אמיתיים (מה נאמר לפני שעסקה נעצרה — קול פנימי, ישיר):
${moments}

חולצו עובדות מבניות:
- ${metricsNote}
- אלטרנטיבה שמוזכרת: ${extraction.named_alternative}
- 3 דברים שהוא לא עושה: ${extraction.sacrifices.join(" | ")}
- פער אוצר מילים (נאמר ברגעי חיכוך אבל לא בפוסטים): ${extraction.vocabulary_gap.join(" | ")}

המשימה: כתוב 3 זוויות בידול שה-${persona.formData.businessName} אמר לעצמו אבל מעולם לא שלח ללקוח.

כללי רגיסטר — קריטי:
- כתוב בסגנון של רגעי החיכוך, לא הפוסטים. ישיר, לא מלוטש, כאילו מדברים עם לקוח מוכר — לא כתיבה שיווקית.
- אין מטאפורות, אין פילוסופיה, אין "להסתתר מאחורי". משפט קצר, עובדתי, עם שם ספציפי.
- אם כתבת משהו שנשמע כמו פוסט לינקדאין — מחק ושכתב.

כללי תוכן:
- כל זווית חייבת להשתמש ב-metric.value אם קיים (לא לבדות מספרים חדשים)
- כל זווית חייבת להזכיר את ${extraction.named_alternative} כניגוד
- כל זווית חייבת לכלול sacrifice אחד מהרשימה
- כל זווית חייבת להשתמש בביטוי אחד לפחות מ-vocabulary_gap

מבנה:
- זווית A: מנגנון (מה אני עושה בפועל — בשורה אחת)
- זווית B: sacrifice (מה אני לא עושה — צריך להרגיש קצת אי-נוח לשלוח)
- זווית C: מדד (מספר ספציפי / ניסיון ספציפי)

בדיקה לפני פלט: האם יועץ/עסק אחר עם אותו טייטל יכול לחתום על זה? אם כן — שכתב.

החזר JSON בלבד. שמור על טקסטים קצרים (עד 40 מילים כל אחד):
{
  "angles": [
    {
      "text_he": string,
      "text_en": string,
      "type": "mechanism",
      "borrowed_phrase": string,
      "why_uncomfortable": string
    },
    { "text_he": string, "text_en": string, "type": "sacrifice", "borrowed_phrase": string, "why_uncomfortable": string },
    { "text_he": string, "text_en": string, "type": "metric", "borrowed_phrase": string, "why_uncomfortable": string }
  ],
  "selection_prompt": "איזה משפט הכי מדויק — גם אם הכי קשה לשלוח?"
}
`.trim();
}

export function buildFalsifiabilityCriticPrompt(
  persona: SyntheticPersona,
  angle: StylometricAngle,
): string {
  return `
${ANTI_FLATTERY}

תחום: ${persona.formData.industry}
עסק: ${persona.formData.businessName}

זווית בידול שנוצרה:
"${angle.text_he}"

המשימה: בדוק האם מתחרה בתחום יכול לחתום על המשפט הזה.

החזר JSON בלבד. ערכי string: משפט אחד קצר בלבד, ללא newlines, ללא מירכאות כפולות:
{
  "genericity_score": number,
  "who_else_could_say_this": "שם מתחרה אחד — משפט אחד",
  "missing_biographical_constraint": "ביטוי קצר — מה חסר",
  "rewrite_required": boolean
}
`.trim();
}

export function buildPreMortemPrompt(persona: SyntheticPersona, result: DifferentiationResult): string {
  return `
${ANTI_FLATTERY}

${personaContext(persona)}

${oneLinerBlock(result)}

המשימה: עברה חצי שנה מאז שהפרסונה השתמשה במשפט. המוצר נכשל. ספק 20 סיבות שונות לכישלון. כל סיבה מסווגת לאחת מ-8 קטגוריות.

החזר JSON:
{
  "failures": [
    { "reason": string, "category": "real" | "positioning" | "ux" | "measurement" | "market" | "complexity" | "trust" | "price" },
    ... (exactly 20 items)
  ]
}
`.trim();
}
