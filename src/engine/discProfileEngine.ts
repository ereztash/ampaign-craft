// ═══════════════════════════════════════════════
// DISC Personality Profiling Engine
// Cross-domain: Behavioral Psychology × Sales × Communication Theory
// Maps prospect behavior to D/I/S/C profiles for personalized messaging
// ═══════════════════════════════════════════════

import { FormData } from "@/types/funnel";
import { UserKnowledgeGraph } from "./userKnowledgeGraph";

export interface DISCDistribution {
  D: number; // 0-100 Dominant
  I: number; // 0-100 Influential
  S: number; // 0-100 Steady
  C: number; // 0-100 Conscientious
}

export interface DISCProfile {
  primary: "D" | "I" | "S" | "C";
  secondary: "D" | "I" | "S" | "C";
  distribution: DISCDistribution;
  messagingStrategy: {
    emphasize: { he: string; en: string }[];
    avoid: { he: string; en: string }[];
  };
  ctaStyle: { he: string; en: string };
  funnelEmphasis: string; // which funnel stage to invest most in
  communicationTone: { he: string; en: string };
}

// ═══════════════════════════════════════════════
// INFERENCE SIGNALS
// ═══════════════════════════════════════════════

function inferDistribution(formData: FormData, graph?: UserKnowledgeGraph | null): DISCDistribution {
  const dist: DISCDistribution = { D: 25, I: 25, S: 25, C: 25 }; // neutral baseline

  // === Goal signals ===
  if (formData.mainGoal === "sales") {
    dist.D += 15; // Results-driven
    dist.I += 5;
  } else if (formData.mainGoal === "leads") {
    dist.C += 10; // Data-seeking
    dist.D += 5;
  } else if (formData.mainGoal === "awareness") {
    dist.I += 15; // Visibility-seeking
    dist.S += 5;
  } else if (formData.mainGoal === "loyalty") {
    dist.S += 15; // Relationship-focused
    dist.I += 5;
  }

  // === Experience level ===
  if (formData.experienceLevel === "advanced") {
    dist.D += 10; // Decisive, confident
    dist.C += 5;  // Also analytical
  } else if (formData.experienceLevel === "beginner") {
    dist.S += 10; // Cautious, seeks stability
    dist.C += 5;  // Needs details
  } else {
    dist.I += 5;  // Balanced
    dist.S += 5;
  }

  // === Audience type ===
  if (formData.audienceType === "b2b") {
    dist.C += 10; // B2B = analytical buyers
    dist.D += 5;  // Also decisive
  } else if (formData.audienceType === "b2c") {
    dist.I += 10; // B2C = emotional/social
    dist.S += 5;
  }

  // === Price signal ===
  if (formData.averagePrice > 1000) {
    dist.C += 10; // High ticket = more analytical
    dist.D += 5;
  } else if (formData.averagePrice < 100) {
    dist.I += 10; // Impulse territory
  }

  // === Business field ===
  const fieldSignals: Record<string, Partial<DISCDistribution>> = {
    tech: { C: 15, D: 5 },
    services: { S: 10, I: 5 },
    fashion: { I: 15, D: 5 },
    food: { I: 10, S: 5 },
    education: { C: 10, S: 5 },
    health: { S: 15, C: 5 },
    realEstate: { D: 10, C: 10 },
    tourism: { I: 15, S: 5 },
    personalBrand: { I: 10, D: 10 },
    other: { S: 5, C: 5 },
  };

  const fieldBoosts = fieldSignals[formData.businessField || "other"] || fieldSignals.other;
  for (const [key, val] of Object.entries(fieldBoosts)) {
    dist[key as keyof DISCDistribution] += val as number;
  }

  // === Sales model ===
  if (formData.salesModel === "subscription") {
    dist.S += 5; // Stability-seeking
  } else if (formData.salesModel === "oneTime") {
    dist.D += 5; // Action-oriented
  }

  // === Channel preferences ===
  if (formData.existingChannels.includes("linkedIn")) {
    dist.C += 5;
    dist.D += 3;
  }
  if (formData.existingChannels.includes("tikTok")) {
    dist.I += 8;
  }
  if (formData.existingChannels.includes("email")) {
    dist.C += 5;
  }
  if (formData.existingChannels.includes("whatsapp")) {
    dist.S += 5;
    dist.I += 3;
  }

  // === Knowledge graph signals ===
  if (graph?.voice) {
    if (graph.voice.dugriScore > 0.6) {
      dist.D += 10;
    }
    if (graph.voice.register === "formal") {
      dist.C += 8;
    } else if (graph.voice.register === "casual") {
      dist.I += 8;
    }
    if (graph.voice.emotionalIntensity === "high") {
      dist.I += 5;
    } else if (graph.voice.emotionalIntensity === "low") {
      dist.C += 5;
    }
  }

  if (graph?.differentiation) {
    if (graph.differentiation.competitors.length > 2) {
      dist.C += 5; // Research-oriented
    }
    if (graph.differentiation.mechanismStatement) {
      dist.D += 5; // Knows what's unique
    }
  }

  // Normalize to 100 total
  const total = dist.D + dist.I + dist.S + dist.C;
  dist.D = Math.round((dist.D / total) * 100);
  dist.I = Math.round((dist.I / total) * 100);
  dist.S = Math.round((dist.S / total) * 100);
  dist.C = Math.round((dist.C / total) * 100);

  return dist;
}

// ═══════════════════════════════════════════════
// MESSAGING STRATEGIES
// ═══════════════════════════════════════════════

const MESSAGING_STRATEGIES: Record<"D" | "I" | "S" | "C", {
  emphasize: { he: string; en: string }[];
  avoid: { he: string; en: string }[];
  ctaStyle: { he: string; en: string };
  funnelEmphasis: string;
  communicationTone: { he: string; en: string };
}> = {
  D: {
    emphasize: [
      { he: "תוצאות מדידות ומהירות — ROI, אחוזים, ₪", en: "Measurable, fast results — ROI, percentages, ₪" },
      { he: "שליטה — 'אתה מחליט', 'בהובלתך'", en: "Control — 'you decide', 'you lead'" },
      { he: "יעילות — חסוך זמן, קיצורי דרך, בוטום ליין", en: "Efficiency — save time, shortcuts, bottom line" },
      { he: "סטטוס והישג — 'מצטרף ל-Top 3%'", en: "Status and achievement — 'join the top 3%'" },
    ],
    avoid: [
      { he: "פרטים טכניים מיותרים ודוחות ארוכים", en: "Unnecessary technical details and long reports" },
      { he: "שפה רכה, עמומה או פסיבית", en: "Soft, vague, or passive language" },
      { he: "תהליכים ארוכים ללא תוצאה מהירה", en: "Long processes without quick results" },
    ],
    ctaStyle: { he: "התחל עכשיו — תוצאות תוך 48 שעות", en: "Start now — results in 48 hours" },
    funnelEmphasis: "conversion",
    communicationTone: { he: "ישיר, תכליתי, ממוקד תוצאות", en: "Direct, purposeful, results-focused" },
  },
  I: {
    emphasize: [
      { he: "סיפורים ועדויות — 'הנה מה שקרה ל...'", en: "Stories and testimonials — 'Here's what happened to...'" },
      { he: "קהילה ושייכות — 'הצטרף למשפחה'", en: "Community and belonging — 'join the family'" },
      { he: "חדשנות וייחודיות — 'הראשון/ה לנסות'", en: "Innovation and uniqueness — 'be the first to try'" },
      { he: "חוויה רגשית — אימוג'ים, ויזואל, אנרגיה", en: "Emotional experience — emojis, visuals, energy" },
    ],
    avoid: [
      { he: "טקסט ארוך ומעמיס עם הרבה מספרים", en: "Long, heavy text with lots of numbers" },
      { he: "שפה יבשה, אקדמית או פורמלית", en: "Dry, academic, or formal language" },
      { he: "בידוד — 'אתה לבד', 'רק אתה'", en: "Isolation — 'you're alone', 'only you'" },
    ],
    ctaStyle: { he: "הצטרף עכשיו — כבר 2,400 חברים!", en: "Join now — already 2,400 members!" },
    funnelEmphasis: "engagement",
    communicationTone: { he: "חם, אנרגטי, מעורר השראה", en: "Warm, energetic, inspiring" },
  },
  S: {
    emphasize: [
      { he: "ביטחון ויציבות — 'ללא סיכון', 'ערבות 100%'", en: "Security and stability — 'risk-free', '100% guarantee'" },
      { he: "קשר אישי — 'ליווי צמוד', 'תמיכה 24/7'", en: "Personal connection — 'close guidance', '24/7 support'" },
      { he: "הדרגתיות — 'צעד אחר צעד', 'בקצב שלך'", en: "Gradualness — 'step by step', 'at your pace'" },
      { he: "המלצות מאנשים דומים — Social Proof ספציפי", en: "Recommendations from similar people — specific Social Proof" },
    ],
    avoid: [
      { he: "לחץ ודחיפות מוגזמת — 'עכשיו או לעולם לא'", en: "Excessive pressure and urgency — 'now or never'" },
      { he: "שינויים דרסטיים — 'שנה הכל'", en: "Drastic changes — 'change everything'" },
      { he: "אגרסיביות מכירתית ומניפולציה", en: "Aggressive sales tactics and manipulation" },
    ],
    ctaStyle: { he: "התחל ניסיון חינם — בלי התחייבות, בקצב שלך", en: "Start a free trial — no commitment, at your pace" },
    funnelEmphasis: "retention",
    communicationTone: { he: "אמפתי, תומך, סבלני", en: "Empathetic, supportive, patient" },
  },
  C: {
    emphasize: [
      { he: "נתונים ומחקר — אחוזים, גרפים, ROI מחושב", en: "Data and research — percentages, graphs, calculated ROI" },
      { he: "שיטתיות — 'מתודולוגיה מוכחת', 'תהליך מובנה'", en: "Methodology — 'proven methodology', 'structured process'" },
      { he: "שקיפות — 'הנה בדיוק מה שתקבל'", en: "Transparency — 'here's exactly what you get'" },
      { he: "מומחיות — קרדיטים, תעודות, ניסיון שנים", en: "Expertise — credentials, certifications, years of experience" },
    ],
    avoid: [
      { he: "הבטחות ללא ביסוס — 'הכי טוב' ללא מקור", en: "Unsubstantiated claims — 'the best' without source" },
      { he: "רגשנות מוגזמת ושפה אימפולסיבית", en: "Excessive emotionality and impulsive language" },
      { he: "חוסר מבנה — 'תראה מה יהיה'", en: "Lack of structure — 'let's see what happens'" },
    ],
    ctaStyle: { he: "הורד את הדוח המלא — 47 עמודים של נתונים", en: "Download the full report — 47 pages of data" },
    funnelEmphasis: "leads",
    communicationTone: { he: "מדויק, אנליטי, מקצועי", en: "Precise, analytical, professional" },
  },
};

// ═══════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════

export function inferDISCProfile(
  formData: FormData,
  knowledgeGraph?: UserKnowledgeGraph | null,
): DISCProfile {
  const distribution = inferDistribution(formData, knowledgeGraph);

  // Find primary and secondary
  const sorted = (Object.entries(distribution) as [keyof DISCDistribution, number][])
    .sort((a, b) => b[1] - a[1]);

  const primary = sorted[0][0];
  const secondary = sorted[1][0];

  const strategy = MESSAGING_STRATEGIES[primary];

  return {
    primary,
    secondary,
    distribution,
    messagingStrategy: {
      emphasize: strategy.emphasize,
      avoid: strategy.avoid,
    },
    ctaStyle: strategy.ctaStyle,
    funnelEmphasis: strategy.funnelEmphasis,
    communicationTone: strategy.communicationTone,
  };
}

/**
 * Returns the System 1/2 framing preference based on DISC profile.
 * D → System 2 action (quick decisions based on results)
 * I → System 1 (emotional, intuitive)
 * S → balanced (wants both emotion and proof)
 * C → System 2 analytical (data-driven decisions)
 */
export function getReaderFraming(profile: DISCProfile): "system1" | "system2" | "balanced" {
  switch (profile.primary) {
    case "D": return "system2";
    case "I": return "system1";
    case "S": return "balanced";
    case "C": return "system2";
    default: return "balanced";
  }
}
