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
