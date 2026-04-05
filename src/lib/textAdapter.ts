// ═══════════════════════════════════════════════
// Text Adapter — Register Shifting from Stylome
// Adapts system-generated text to match the user's writing voice
// Cross-domain: Psycholinguistics (Communication Accommodation Theory)
// ═══════════════════════════════════════════════

import { StylomeVoice } from "@/engine/userKnowledgeGraph";

/**
 * Adapt a bilingual text pair to match user's voice profile.
 * If no voice profile, returns original text unchanged.
 */
export function adaptText(
  text: { he: string; en: string },
  voice: StylomeVoice | null,
): { he: string; en: string } {
  if (!voice) return text;

  return {
    he: adaptHebrew(text.he, voice),
    en: text.en, // English adaption is minimal — most users write Hebrew
  };
}

function adaptHebrew(text: string, voice: StylomeVoice): string {
  let result = text;

  // 1. Code-mixing adaptation
  if (voice.codeMixingIndex < 10) {
    // Pure Hebrew speaker — replace English marketing terms
    result = result
      .replace(/\bROAS\b/g, "תשואה על פרסום")
      .replace(/\bCPC\b/g, "עלות לקליק")
      .replace(/\bCPL\b/g, "עלות לליד")
      .replace(/\bCTR\b/g, "שיעור הקלקה")
      .replace(/\bCPA\b/g, "עלות לרכישה")
      .replace(/\bconversion rate\b/gi, "שיעור המרה")
      .replace(/\bfunnel\b/gi, "משפך")
      .replace(/\bretargeting\b/gi, "פרסום חוזר");
  }
  // High code-mixing — keep English terms, they're natural for this user

  // 2. Register adaptation
  if (voice.register === "casual" && voice.dugriScore > 0.5) {
    // Casual + direct → conversational Hebrew
    result = result
      .replace(/מומלץ ל/g, "כדאי ל")
      .replace(/יש לשקול/g, "תחשוב על")
      .replace(/ניתן ל/g, "אפשר ל")
      .replace(/יש לציין כי/g, "שים לב ש")
      .replace(/בהתאם ל/g, "לפי ");
  } else if (voice.register === "formal" && voice.dugriScore < 0.4) {
    // Formal + indirect → professional Hebrew
    result = result
      .replace(/תפסיק ל/g, "מומלץ להפסיק ל")
      .replace(/תעשה /g, "יש לבצע ")
      .replace(/כדאי ש/g, "מומלץ כי ")
      .replace(/בוא נ/g, "יש ל");
  }

  // 3. Emotional intensity
  if (voice.emotionalIntensity === "low") {
    // Reduce exclamation marks for low-emotion users
    result = result.replace(/!{2,}/g, ".").replace(/!$/gm, ".");
  }

  return result;
}

/**
 * Generate framed version of a message based on framing preference.
 * Loss frame: "You're losing X" / Gain frame: "You could gain X"
 */
export function frameMessage(
  lossVersion: { he: string; en: string },
  gainVersion: { he: string; en: string },
  preference: "loss" | "gain" | "balanced",
): { he: string; en: string } {
  if (preference === "loss") return lossVersion;
  if (preference === "gain") return gainVersion;
  // Balanced: use loss (it's more effective on average)
  return lossVersion;
}
