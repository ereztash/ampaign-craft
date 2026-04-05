// ═══════════════════════════════════════════════
// Copy Quality Assurance Engine
// Cross-domain: NLP × Behavioral Science × Neuroscience
// ═══════════════════════════════════════════════

export interface CopyQAResult {
  score: number; // 0-100
  risks: CopyRisk[];
  strengths: string[];
  suggestions: { he: string; en: string }[];
}

export interface CopyRisk {
  type: "cortisol_overload" | "entropy_collapse" | "reactance" | "persona_mismatch" | "weak_cta" | "no_proof";
  severity: "high" | "medium" | "low";
  message: { he: string; en: string };
  fix: { he: string; en: string };
}

const FEAR_WORDS = ["סכנה", "מפסיד", "נגמר", "אחרון", "בלי", "danger", "lose", "last", "without", "risk", "urgent", "warning", "fail", "miss"];
const TRUST_WORDS = ["מוכח", "לקוחות", "ביקורות", "מחקר", "proven", "clients", "reviews", "research", "data", "study", "results"];
const POWER_WORDS = ["חינם", "חדש", "מיידי", "בלעדי", "free", "new", "instant", "exclusive", "guaranteed", "secret", "limited"];
const CTA_WORDS = ["עכשיו", "התחל", "הצטרף", "קבל", "לחץ", "now", "start", "join", "get", "click", "try", "buy"];

export function analyzeCopy(text: string, targetPersona: "system1" | "system2" | "balanced" = "balanced"): CopyQAResult {
  const risks: CopyRisk[] = [];
  const strengths: string[] = [];
  const suggestions: { he: string; en: string }[] = [];
  let score = 50; // baseline

  const words = text.toLowerCase().split(/\s+/);
  const sentences = text.split(/[.!?]/).filter(Boolean);
  const paragraphs = text.split(/\n\n+/).filter(Boolean);

  // === Cortisol Overload Check ===
  const fearCount = FEAR_WORDS.filter((w) => text.toLowerCase().includes(w)).length;
  if (fearCount > 3) {
    risks.push({
      type: "cortisol_overload", severity: "high",
      message: { he: `${fearCount} מילות פחד/דחיפות — קורטיזול גבוה מדי. הקורא ינטוש`, en: `${fearCount} fear/urgency words — cortisol too high. Reader will disengage` },
      fix: { he: "החלף 50% מהמילות פחד במילות אמון (מוכח, לקוחות, תוצאות)", en: "Replace 50% of fear words with trust words (proven, clients, results)" },
    });
    score -= 15;
  } else if (fearCount >= 1) {
    strengths.push("cortisol_balanced");
    score += 5;
  }

  // === Entropy Collapse (no tension variation) ===
  const hasFear = fearCount > 0;
  const hasTrust = TRUST_WORDS.some((w) => text.toLowerCase().includes(w));
  const hasPower = POWER_WORDS.some((w) => text.toLowerCase().includes(w));
  if (!hasFear && !hasPower) {
    risks.push({
      type: "entropy_collapse", severity: "medium",
      message: { he: "אין מתח כלל — הטקסט שטוח. אין סיבה לפעול", en: "No tension at all — text is flat. No reason to act" },
      fix: { he: "הוסף לפחות אלמנט דחיפות אחד או בלעדיות", en: "Add at least one urgency or exclusivity element" },
    });
    score -= 10;
  }
  if (hasFear && hasTrust) {
    strengths.push("tension_balance");
    score += 10;
  }

  // === Reactance Check (too pushy) ===
  const exclamationCount = (text.match(/!/g) || []).length;
  const capsWords = words.filter((w) => w.length > 2 && w === w.toUpperCase()).length;
  if (exclamationCount > 3 || capsWords > 2) {
    risks.push({
      type: "reactance", severity: "high",
      message: { he: "יותר מדי סימני קריאה/CAPS — מפעיל תגובת נגד (reactance)", en: "Too many exclamation marks/CAPS — triggers psychological reactance" },
      fix: { he: "הורד ל-1 סימן קריאה מקסימום. השתמש בביטחון שקט במקום צעקה", en: "Reduce to 1 exclamation mark max. Use quiet confidence instead of shouting" },
    });
    score -= 15;
  }

  // === Persona Mismatch ===
  const dataRatio = TRUST_WORDS.filter((w) => text.toLowerCase().includes(w)).length;
  const emotionRatio = FEAR_WORDS.filter((w) => text.toLowerCase().includes(w)).length + POWER_WORDS.filter((w) => text.toLowerCase().includes(w)).length;
  if (targetPersona === "system2" && emotionRatio > dataRatio * 2) {
    risks.push({
      type: "persona_mismatch", severity: "medium",
      message: { he: "קהל אנליטי (System 2) אבל הקופי רגשי מדי — חוסר התאמה", en: "Analytical audience (System 2) but copy is too emotional — mismatch" },
      fix: { he: "הוסף מספרים, נתונים, ROI. הפחת מילות רגש", en: "Add numbers, data, ROI. Reduce emotional language" },
    });
    score -= 10;
  } else if (targetPersona === "system1" && dataRatio > emotionRatio * 2) {
    risks.push({
      type: "persona_mismatch", severity: "medium",
      message: { he: "קהל רגשי (System 1) אבל הקופי יבש מדי — חוסר התאמה", en: "Emotional audience (System 1) but copy is too dry — mismatch" },
      fix: { he: "הוסף סיפור, רגש, דמיון. פחות מספרים, יותר חוויה", en: "Add story, emotion, imagery. Less numbers, more experience" },
    });
    score -= 10;
  }

  // === Weak CTA ===
  const hasCTA = CTA_WORDS.some((w) => text.toLowerCase().includes(w));
  if (!hasCTA) {
    risks.push({
      type: "weak_cta", severity: "high",
      message: { he: "אין קריאה לפעולה (CTA) — הקורא לא יודע מה לעשות", en: "No call-to-action (CTA) — reader doesn't know what to do" },
      fix: { he: "הוסף CTA ברור: 'התחל עכשיו', 'קבל הצעה', 'הצטרף חינם'", en: "Add clear CTA: 'Start now', 'Get an offer', 'Join free'" },
    });
    score -= 15;
  } else {
    strengths.push("clear_cta");
    score += 10;
  }

  // === No Social Proof ===
  if (!hasTrust && sentences.length > 2) {
    risks.push({
      type: "no_proof", severity: "medium",
      message: { he: "אין הוכחה חברתית — מפסיד 93% מהאמינות (בישראל)", en: "No social proof — losing 93% credibility (in Israel)" },
      fix: { he: "הוסף: מספר לקוחות, ביקורות, דירוג Google, או שם מוכר", en: "Add: client count, reviews, Google rating, or a known name" },
    });
    score -= 10;
  } else if (hasTrust) {
    strengths.push("social_proof");
    score += 10;
  }

  // === Power Words Bonus ===
  const powerCount = POWER_WORDS.filter((w) => text.toLowerCase().includes(w)).length;
  if (powerCount >= 2) {
    strengths.push("power_words");
    score += 5;
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Generate suggestions
  if (score < 60) {
    suggestions.push(
      { he: "שכתב את המשפט הראשון — הוא קובע אם ימשיכו לקרוא", en: "Rewrite the first sentence — it determines if they keep reading" },
    );
  }
  if (!hasTrust) {
    suggestions.push(
      { he: "הוסף מספר ספציפי: '2,400 עסקים' או '₪1.2M נחסכו'", en: "Add a specific number: '2,400 businesses' or '₪1.2M saved'" },
    );
  }

  return { score, risks, strengths, suggestions };
}
