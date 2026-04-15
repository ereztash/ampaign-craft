// ═══════════════════════════════════════════════
// UVP Synthesis Engine
// Cross-domain: Differentiation × Copy Lab × User Knowledge Graph
// Produces 5 ready-to-use UVP formats for different channels
// ═══════════════════════════════════════════════

import { DifferentiationResult, MechanismStatement } from "@/types/differentiation";
import { CopyLabData } from "@/types/funnel";
import { UserKnowledgeGraph } from "./userKnowledgeGraph";

export const ENGINE_MANIFEST = {
  name: "uvpSynthesisEngine",
  reads: ["BUSINESS-differentiation-*", "USER-knowledgeGraph-*", "USER-form-*"],
  writes: ["USER-uvp-*"],
  stage: "design",
  isLive: true,
  parameters: ["UVP synthesis"],
} as const;

// ═══ TYPES ═══

import type { BilingualText } from "@/types/i18n";
export type { BilingualText };

export type UVPFormat =
  | "oneLiner"
  | "linkedInBio"
  | "elevatorPitch"
  | "adHeadline"
  | "emailSubject";

export interface UVPVariant {
  format: UVPFormat;
  label: BilingualText;
  text: BilingualText;
  charCount: { he: number; en: number };
  channelFit: string[];
  discTone: "roi" | "social" | "stability" | "precision";
  strengthScore: number; // 0-100
}

export interface UVPFormatSet {
  oneLiner: UVPVariant;
  linkedInBio: UVPVariant;
  elevatorPitch: UVPVariant;
  adHeadline: UVPVariant;
  emailSubject: UVPVariant;
  /** Which disc tone was applied across all variants */
  appliedTone: "roi" | "social" | "stability" | "precision";
  /** Mechanism anchor extracted from diffResult */
  mechanismAnchor: string;
  /** Overall confidence that UVP is differentiated (0-100) */
  differentiationScore: number;
  /** Quick tips for improving the UVP */
  improvementTips: BilingualText[];
}

export interface SynthesizeUVPInput {
  diffResult: DifferentiationResult | null;
  copyLab: CopyLabData | null;
  ukg: UserKnowledgeGraph;
}

// ═══ TONE ROUTING ═══

const TONE_OPENERS: Record<"roi" | "social" | "stability" | "precision", BilingualText> = {
  roi: { he: "תוצאות מדידות", en: "Measurable results" },
  social: { he: "עם מי שמבין אותך", en: "With people who get you" },
  stability: { he: "בטחון ויציבות", en: "Confidence and stability" },
  precision: { he: "מדויק, מוכח, מנתח", en: "Precise, proven, analytical" },
};

// ═══ HELPERS ═══

function extractMechanism(diffResult: DifferentiationResult | null): string {
  if (!diffResult) return "";
  const ms: MechanismStatement = diffResult.mechanismStatement;
  if (ms?.mechanism) return ms.mechanism;
  if (ms?.oneLiner?.en) return ms.oneLiner.en;
  return "";
}

function extractProof(diffResult: DifferentiationResult | null): string {
  if (!diffResult?.mechanismStatement?.proof) return "";
  return diffResult.mechanismStatement.proof;
}

function extractAntiStatement(diffResult: DifferentiationResult | null): BilingualText {
  const anti = diffResult?.mechanismStatement?.antiStatement ?? "";
  return { he: anti, en: anti };
}

function extractOneLiner(diffResult: DifferentiationResult | null): BilingualText {
  const ol = diffResult?.mechanismStatement?.oneLiner;
  if (ol?.he && ol?.en) return ol;
  return { he: "", en: "" };
}

function getProduct(ukg: UserKnowledgeGraph): string {
  return ukg.business.product || "המוצר שלנו";
}

function getProductEn(ukg: UserKnowledgeGraph): string {
  return ukg.business.product || "our product";
}

function getField(ukg: UserKnowledgeGraph): string {
  const map: Record<string, string> = {
    tech: "טכנולוגיה",
    fashion: "אופנה",
    food: "מזון",
    services: "שירותים",
    education: "חינוך",
    health: "בריאות",
    realEstate: "נדל\"ן",
    tourism: "תיירות",
    personalBrand: "מיתוג אישי",
    other: "עסקים",
  };
  return map[ukg.business.field] ?? "עסקים";
}

function getAudience(ukg: UserKnowledgeGraph): BilingualText {
  const type = ukg.business.audience;
  if (type === "b2b") return { he: "עסקים", en: "businesses" };
  if (type === "b2c") return { he: "לקוחות פרטיים", en: "customers" };
  return { he: "לקוחות", en: "clients" };
}

function differentiationScore(diffResult: DifferentiationResult | null): number {
  if (!diffResult) return 35;
  const strength = diffResult.differentiationStrength ?? 50;
  const claims = diffResult.claimVerificationScore ?? 50;
  return Math.round((strength * 0.6) + (claims * 0.4));
}

function clamp(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

// ═══ FORMAT GENERATORS ═══

function buildOneLiner(
  diffResult: DifferentiationResult | null,
  ukg: UserKnowledgeGraph,
  tone: "roi" | "social" | "stability" | "precision",
): BilingualText {
  const ol = extractOneLiner(diffResult);
  if (ol.he && ol.en) return ol;

  const mechanism = extractMechanism(diffResult);
  const product = getProduct(ukg);
  const audience = getAudience(ukg);
  const openerHe = TONE_OPENERS[tone].he;
  const openerEn = TONE_OPENERS[tone].en;

  if (mechanism) {
    return {
      he: `${product} — ${mechanism} ל${audience.he}ים שרוצים ${openerHe}`,
      en: `${getProductEn(ukg)} — ${mechanism} for ${audience.en} who want ${openerEn}`,
    };
  }

  const topPainHe = ukg.derived.topPainPoint?.he ?? "לצמוח";
  const topPainEn = ukg.derived.topPainPoint?.en ?? "to grow";
  return {
    he: `עוזרים ל${audience.he}ים ב${getField(ukg)} ${topPainHe} — עם ${openerHe}`,
    en: `Helping ${audience.en} in ${ukg.business.field} ${topPainEn} — with ${openerEn}`,
  };
}

function buildLinkedInBio(
  diffResult: DifferentiationResult | null,
  ukg: UserKnowledgeGraph,
  tone: "roi" | "social" | "stability" | "precision",
): BilingualText {
  const mechanism = extractMechanism(diffResult);
  const proof = extractProof(diffResult);
  const product = getProduct(ukg);
  const audience = getAudience(ukg);

  const proofClause = proof ? ` | ${proof}` : "";
  const rawHe = mechanism
    ? `עוזר ל${audience.he}ים להשיג ${TONE_OPENERS[tone].he} דרך ${mechanism}${proofClause}`
    : `${product} — ${TONE_OPENERS[tone].he} ל${audience.he}ים${proofClause}`;
  const rawEn = mechanism
    ? `Helping ${audience.en} achieve ${TONE_OPENERS[tone].en} through ${mechanism}${proofClause}`
    : `${product} — ${TONE_OPENERS[tone].en} for ${audience.en}${proofClause}`;

  return {
    he: clamp(rawHe, 160),
    en: clamp(rawEn, 160),
  };
}

function buildElevatorPitch(
  diffResult: DifferentiationResult | null,
  ukg: UserKnowledgeGraph,
  tone: "roi" | "social" | "stability" | "precision",
): BilingualText {
  const mechanism = extractMechanism(diffResult);
  const proof = extractProof(diffResult);
  const anti = extractAntiStatement(diffResult);
  const audience = getAudience(ukg);
  const product = getProduct(ukg);

  const antiClauseHe = anti.he ? ` — לא עוד ${anti.he}.` : ".";
  const antiClauseEn = anti.en ? ` — not another ${anti.en}.` : ".";

  if (mechanism) {
    return {
      he: `${product} עוזר ל${audience.he}ים להשיג ${TONE_OPENERS[tone].he} דרך ${mechanism}. ${proof ? proof + "." : ""} ${antiClauseHe}`.trim(),
      en: `${product} helps ${audience.en} achieve ${TONE_OPENERS[tone].en} through ${mechanism}. ${proof ? proof + "." : ""} ${antiClauseEn}`.trim(),
    };
  }

  const topPainHe = ukg.derived.topPainPoint?.he ?? "לצמוח";
  const topPainEn = ukg.derived.topPainPoint?.en ?? "to grow";
  return {
    he: `${product} נבנה עבור ${audience.he}ים שרוצים ${topPainHe}. אנחנו מביאים ${TONE_OPENERS[tone].he}${antiClauseHe}`,
    en: `${product} is built for ${audience.en} who want ${topPainEn}. We deliver ${TONE_OPENERS[tone].en}${antiClauseEn}`,
  };
}

function buildAdHeadline(
  diffResult: DifferentiationResult | null,
  ukg: UserKnowledgeGraph,
  tone: "roi" | "social" | "stability" | "precision",
): BilingualText {
  const mechanism = extractMechanism(diffResult);
  const audience = getAudience(ukg);
  const product = getProduct(ukg);

  const HEADLINE_PATTERNS: Record<"roi" | "social" | "stability" | "precision", BilingualText> = {
    roi: {
      he: mechanism ? `${mechanism} — תוצאות שניתן למדוד` : `${product}: ROI מדיד בתוך 90 יום`,
      en: mechanism ? `${mechanism} — measurable results` : `${product}: Measurable ROI in 90 days`,
    },
    social: {
      he: mechanism ? `הצטרף ל${audience.he}ים שכבר בחרו ב${mechanism}` : `${product} — הקהילה של ${audience.he}ים`,
      en: mechanism ? `Join ${audience.en} who chose ${mechanism}` : `${product} — the community for ${audience.en}`,
    },
    stability: {
      he: mechanism ? `בטחון מלא עם ${mechanism}` : `${product}: שקט נפשי לעסק שלך`,
      en: mechanism ? `Full confidence with ${mechanism}` : `${product}: Peace of mind for your business`,
    },
    precision: {
      he: mechanism ? `${mechanism}: מבוסס נתונים, לא ניחושים` : `${product}: ניתוח מעמיק, תוצאות מדויקות`,
      en: mechanism ? `${mechanism}: data-driven, not guesswork` : `${product}: Deep analysis, precise results`,
    },
  };

  const raw = HEADLINE_PATTERNS[tone];
  return {
    he: clamp(raw.he, 90),
    en: clamp(raw.en, 90),
  };
}

function buildEmailSubject(
  diffResult: DifferentiationResult | null,
  ukg: UserKnowledgeGraph,
  tone: "roi" | "social" | "stability" | "precision",
): BilingualText {
  const mechanism = extractMechanism(diffResult);
  const product = getProduct(ukg);

  const SUBJECT_PATTERNS: Record<"roi" | "social" | "stability" | "precision", BilingualText> = {
    roi: {
      he: mechanism ? `הדרך החדשה ל${mechanism} — רואים תוצאות` : `כמה עולה לך לא לפתור את הבעיה?`,
      en: mechanism ? `The new way to ${mechanism} — see results` : `What's it costing you not to fix this?`,
    },
    social: {
      he: mechanism ? `[שם], ${mechanism} שבחרו עסקים כמוך` : `עסקים כמוך כבר עושים את זה`,
      en: mechanism ? `[Name], ${mechanism} chosen by businesses like yours` : `Businesses like yours are already doing this`,
    },
    stability: {
      he: mechanism ? `${product}: בלי הפתעות, רק ${mechanism}` : `הבטיח לעצמך בטחון — עם ${product}`,
      en: mechanism ? `${product}: no surprises, just ${mechanism}` : `Give yourself certainty — with ${product}`,
    },
    precision: {
      he: mechanism ? `ניתוח: ${mechanism} לעומת המתחרים שלך` : `הנתונים מאחורי ${product}`,
      en: mechanism ? `Analysis: ${mechanism} vs. your competitors` : `The data behind ${product}`,
    },
  };

  const raw = SUBJECT_PATTERNS[tone];
  return {
    he: clamp(raw.he, 78),
    en: clamp(raw.en, 78),
  };
}

// ═══ STRENGTH SCORER ═══

function scoreVariant(text: BilingualText, diffScore: number): number {
  let score = diffScore * 0.4; // base from differentiation
  if (text.he.length > 10) score += 20;
  if (text.en.length > 10) score += 20;
  if (text.he.includes("—") || text.en.includes("—")) score += 10; // has contrast
  if (text.he.includes("לא") || text.en.includes("not")) score += 10; // anti-statement bonus
  return Math.min(Math.round(score), 100);
}

// ═══ IMPROVEMENT TIPS ═══

function generateTips(
  diffResult: DifferentiationResult | null,
  ukg: UserKnowledgeGraph,
): BilingualText[] {
  const tips: BilingualText[] = [];

  if (!diffResult) {
    tips.push({
      he: "השלם את מודול הדיפרנציאציה כדי לקבל UVP מדויק יותר",
      en: "Complete the differentiation module for a more precise UVP",
    });
  }

  if (diffResult && (diffResult.differentiationStrength ?? 0) < 60) {
    tips.push({
      he: "הציון הדיפרנציאציה שלך נמוך — הוסף ראיות קונקרטיות לטענות",
      en: "Your differentiation score is low — add concrete evidence to your claims",
    });
  }

  if (!diffResult?.mechanismStatement?.proof) {
    tips.push({
      he: "הוסף הוכחה מספרית (כמה לקוחות, כמה ROI, כמה זמן) לחיזוק ה-UVP",
      en: "Add a numerical proof point (customers, ROI, time) to strengthen the UVP",
    });
  }

  if (!ukg.derived.topPainPoint?.he) {
    tips.push({
      he: "ציין את נקודת הכאב המרכזית של הלקוח ב-UVP",
      en: "Mention the customer's core pain point in the UVP",
    });
  }

  if (tips.length === 0) {
    tips.push({
      he: "ה-UVP שלך חזק! בדוק A/B בין כותרת ה-ad לבין ה-one-liner",
      en: "Your UVP is strong! A/B test the ad headline against the one-liner",
    });
  }

  return tips.slice(0, 3);
}

// ═══ MAIN EXPORT ═══

export function synthesizeUVP(input: SynthesizeUVPInput): UVPFormatSet {
  const { diffResult, ukg } = input;
  const tone = ukg.derived.discAwareFraming ?? "roi";
  const diffScore = differentiationScore(diffResult);
  const mechanismAnchor = extractMechanism(diffResult);

  const oneLinerText = buildOneLiner(diffResult, ukg, tone);
  const linkedInBioText = buildLinkedInBio(diffResult, ukg, tone);
  const elevatorPitchText = buildElevatorPitch(diffResult, ukg, tone);
  const adHeadlineText = buildAdHeadline(diffResult, ukg, tone);
  const emailSubjectText = buildEmailSubject(diffResult, ukg, tone);

  const oneLiner: UVPVariant = {
    format: "oneLiner",
    label: { he: "משפט מיצוב", en: "Positioning Statement" },
    text: oneLinerText,
    charCount: { he: oneLinerText.he.length, en: oneLinerText.en.length },
    channelFit: ["website", "pitch deck", "email signature"],
    discTone: tone,
    strengthScore: scoreVariant(oneLinerText, diffScore),
  };

  const linkedInBio: UVPVariant = {
    format: "linkedInBio",
    label: { he: "LinkedIn Bio", en: "LinkedIn Bio" },
    text: linkedInBioText,
    charCount: { he: linkedInBioText.he.length, en: linkedInBioText.en.length },
    channelFit: ["linkedin", "twitter bio", "instagram bio"],
    discTone: tone,
    strengthScore: scoreVariant(linkedInBioText, diffScore),
  };

  const elevatorPitch: UVPVariant = {
    format: "elevatorPitch",
    label: { he: "אלבור פיץ׳ (30 שניות)", en: "Elevator Pitch (30 sec)" },
    text: elevatorPitchText,
    charCount: { he: elevatorPitchText.he.length, en: elevatorPitchText.en.length },
    channelFit: ["networking", "sales call", "intro video"],
    discTone: tone,
    strengthScore: scoreVariant(elevatorPitchText, diffScore),
  };

  const adHeadline: UVPVariant = {
    format: "adHeadline",
    label: { he: "כותרת מודעה", en: "Ad Headline" },
    text: adHeadlineText,
    charCount: { he: adHeadlineText.he.length, en: adHeadlineText.en.length },
    channelFit: ["facebook", "google ads", "instagram"],
    discTone: tone,
    strengthScore: scoreVariant(adHeadlineText, diffScore),
  };

  const emailSubject: UVPVariant = {
    format: "emailSubject",
    label: { he: "נושא אימייל", en: "Email Subject" },
    text: emailSubjectText,
    charCount: { he: emailSubjectText.he.length, en: emailSubjectText.en.length },
    channelFit: ["email marketing", "cold outreach", "newsletter"],
    discTone: tone,
    strengthScore: scoreVariant(emailSubjectText, diffScore),
  };

  return {
    oneLiner,
    linkedInBio,
    elevatorPitch,
    adHeadline,
    emailSubject,
    appliedTone: tone,
    mechanismAnchor,
    differentiationScore: diffScore,
    improvementTips: generateTips(diffResult, ukg),
  };
}
