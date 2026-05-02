// ═══════════════════════════════════════════════
// Comparison Module
//
// For each persona, produce three differentiation statements:
//   1. FunnelForge — generated upstream by the harness
//   2. raw ChatGPT — single generic prompt, mock or live
//   3. Template    — deterministic "We help X do Y unlike Z" fill-in
//
// These three are then sent to the comparison red-team prompt.
// ═══════════════════════════════════════════════

import type { SyntheticPersona } from "../personas/personaSchema";
import { callLLM } from "./llmClient";

export interface AlternativeOutputs {
  chatgpt: string;
  template: string;
}

function buildChatGPTPrompt(persona: SyntheticPersona): string {
  const f = persona.formData;
  return `
תכתוב משפט בידול אחד עבור עסק קטן. אל תוסיף הסברים. רק את המשפט.

עסק: ${f.businessName}
תחום: ${f.industry}
מתחרים: ${f.topCompetitors.join(", ") || "לא צוין"}
positioning נוכחי: ${f.currentPositioning || "לא צוין"}
הוכחה זמינה: ${f.claimExamples.map((c) => c.evidence).filter(Boolean).join("; ") || "לא צוין"}
`.trim();
}

function buildTemplate(persona: SyntheticPersona): string {
  const f = persona.formData;
  const audience = f.targetMarket.startsWith("b2b") ? "עסקים" : "אנשים";
  const competitor = f.topCompetitors[0] ?? "המתחרים";
  const outcome = f.industry || "התוצאה שהם רוצים";
  return `אנחנו עוזרים ל${audience} להגיע ל${outcome}, בניגוד ל${competitor} ש${f.lostDealReason || "לא נותנים את אותה תוצאה"}.`;
}

export async function generateAlternatives(persona: SyntheticPersona): Promise<AlternativeOutputs> {
  const chatgpt = await callLLM({
    prompt: buildChatGPTPrompt(persona),
    promptKind: "chatgptBaseline",
    seed: `${persona.formData.businessName}|chatgpt`,
    maxTokens: 256,
  });

  const template = buildTemplate(persona);
  return { chatgpt: chatgpt.trim(), template };
}
