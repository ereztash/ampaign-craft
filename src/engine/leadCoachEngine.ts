// ═══════════════════════════════════════════════
// leadCoachEngine — Per-lead, research-based coaching.
//
// Inputs:  user blackboard state (DISCProfile, FunnelResult,
//          NeuroClosingStrategy, HormoziValueResult), aggregate
//          CrmInsights, the specific Lead, and its interactions.
//
// Output:  exactly three LeadRecommendation objects, one per category:
//
//          • approach — how to communicate (DISC bridge)
//          • timing   — when / what to do next (Cialdini, Challenger,
//                       SPIN, Sandler — picked by lead state)
//          • leverage — what to offer or say (Hormozi, Cialdini, Sandler
//                       — picked by lead's qualitative data)
//
// Deterministic and pure: no I/O, no LLM, no randomness. Same inputs
// produce the same output, which is what the cache layer relies on.
// ═══════════════════════════════════════════════

import type { DISCProfile } from "./discProfileEngine";
import type { FunnelResult, HormoziValueResult } from "@/types/funnel";
import type { NeuroClosingStrategy } from "./neuroClosingEngine";
import type { Lead, LeadInteraction } from "@/services/leadsService";
import type { CrmInsights } from "./crmInsightEngine";

// ─── Types ──────────────────────────────────────

export type Framework = "DISC" | "Cialdini" | "Hormozi" | "Challenger" | "SPIN" | "Sandler";
export type RecommendationCategory = "approach" | "timing" | "leverage";

/**
 * Citations are bilingual: framework label stays English in both
 * languages (per product spec), but the source/citation paragraph is
 * translated. The UI picks the language at render time.
 */
export interface LeadRecommendation {
  category: RecommendationCategory;
  framework: Framework;
  titleHe: string;
  titleEn: string;
  bodyHe: string;
  bodyEn: string;
  citationHe: string;
  citationEn: string;
  /** 0-1; reflects how much qualitative data was available for this rec. */
  confidence: number;
}

export interface LeadCoachInput {
  userDisc: DISCProfile | null;
  funnel: FunnelResult | null;
  closing: NeuroClosingStrategy | null;
  hormozi: HormoziValueResult | null;
  crmInsights: CrmInsights | null;
  lead: Lead;
  interactions: LeadInteraction[];
  /** Pin "now" in tests. */
  now?: Date;
}

// ─── Citations ──────────────────────────────────

const CITATIONS: Record<Framework, { he: string; en: string }> = {
  DISC: {
    he: "Marston, Emotions of Normal People (1928) — בסיס מודל ה-DISC המודרני.",
    en: "Marston, Emotions of Normal People (1928) — foundation of the modern DISC model.",
  },
  Cialdini: {
    he: 'Cialdini, Influence: The Psychology of Persuasion (2006) — שישה עקרונות השפעה.',
    en: "Cialdini, Influence: The Psychology of Persuasion (2006) — six principles of persuasion.",
  },
  Hormozi: {
    he: "Hormozi, $100M Offers (2021) — משוואת הערך: dream outcome × likelihood ÷ time × effort.",
    en: "Hormozi, $100M Offers (2021) — value equation: dream outcome × likelihood ÷ time × effort.",
  },
  Challenger: {
    he: "Dixon & Adamson, The Challenger Sale (2011) — מכירה דרך teach-tailor-take control.",
    en: "Dixon & Adamson, The Challenger Sale (2011) — sell via teach-tailor-take control.",
  },
  SPIN: {
    he: "Rackham, SPIN Selling (1988) — Situation, Problem, Implication, Need-payoff.",
    en: "Rackham, SPIN Selling (1988) — Situation, Problem, Implication, Need-payoff.",
  },
  Sandler: {
    he: "Sandler, You Can't Teach a Kid to Ride a Bike at a Seminar (1995) — pain funnel וכללי הסכם מקדמי.",
    en: "Sandler, You Can't Teach a Kid to Ride a Bike at a Seminar (1995) — pain funnel and up-front contracts.",
  },
};

// ─── Buyer DISC inference from text ─────────────

type DISCType = "D" | "I" | "S" | "C";

const DISC_KEYWORDS: Record<DISCType, string[]> = {
  D: [
    // English — outcome / decisiveness
    "results","fast","quick","roi","outcome","win","decisive","bottom line","competitive","leader","drive",
    // Hebrew
    "מהיר","תוצאות","רווחים","ניצחון","מנהיג","החלטיות","תוצאה","שורה תחתונה","מוביל",
  ],
  I: [
    "team","exciting","innovative","fun","popular","trend","story","brand","creative","vibe",
    "צוות","מעניין","חדשני","כיף","פופולרי","טרנד","סיפור","מותג","יצירתי","תחושה",
  ],
  S: [
    "trust","relationship","long-term","stable","reliable","loyal","support","help","family","care",
    "אמינות","יחסים","טווח ארוך","יציב","נאמנות","תמיכה","עזרה","משפחה","אכפתיות",
  ],
  C: [
    "data","research","analysis","guarantee","proof","evidence","quality","certification","accuracy","detail",
    "מחקר","ניתוח","אחריות","הוכחה","ראיות","איכות","הסמכה","דיוק","פרטים","נתונים",
  ],
};

function inferBuyerDisc(text: string): DISCType | null {
  if (!text || text.trim().length === 0) return null;
  const lower = text.toLowerCase();
  const scores: Record<DISCType, number> = { D: 0, I: 0, S: 0, C: 0 };
  let total = 0;
  for (const t of ["D", "I", "S", "C"] as DISCType[]) {
    for (const kw of DISC_KEYWORDS[t]) {
      if (lower.includes(kw)) {
        scores[t] += 1;
        total += 1;
      }
    }
  }
  if (total === 0) return null;
  let best: DISCType = "D";
  for (const t of ["I", "S", "C"] as DISCType[]) {
    if (scores[t] > scores[best]) best = t;
  }
  return best;
}

// ─── Approach — DISC bridge ─────────────────────

interface BridgeText { he: string; en: string }

function bridgeText(seller: DISCType, buyer: DISCType): BridgeText {
  const same = seller === buyer;
  if (same) {
    return {
      he: `המוכר/ת והקונה חולקים סגנון ${seller}. נצל את הקרבה: דבר/י באותו קצב והעמיק/י לעומק התחום שמשמעותי לשניכם.`,
      en: `Seller and buyer both score ${seller}. Lean in: match the pace and go deep on what matters to both of you.`,
    };
  }
  // Bridges keyed on buyer side — what THEY need.
  const buyerNeed: Record<DISCType, BridgeText> = {
    D: {
      he: "הקונה ממוקד תוצאות. קצר/י את ה-small talk, פתח/י עם ההבטחה, הצע/י החלטה.",
      en: "Buyer is results-driven. Cut the small talk; lead with the outcome and ask for a decision.",
    },
    I: {
      he: "הקונה תקשורתי ורגשי. הוסיפ/י סיפור או case של לקוח דומה, התמקד/י באנרגיה ובחזון.",
      en: "Buyer is social/expressive. Add a story or peer case study; lead with energy and vision.",
    },
    S: {
      he: "הקונה מעדיף יציבות. הראה/י נאמנות, מעט סיכון, ותהליך צפוי. אל תאיץ/י החלטה.",
      en: "Buyer values stability. Emphasize reliability, low risk, and a predictable process. Don't rush the decision.",
    },
    C: {
      he: "הקונה אנליטי. הוסיפ/י נתון מדיד, אחריות בכתב, או הוכחה (case/בנצ'מרק) לכל טענה.",
      en: "Buyer is analytical. Anchor every claim with a number, written guarantee, or proof (case/benchmark).",
    },
  };
  return buyerNeed[buyer];
}

function approachRec(input: LeadCoachInput): LeadRecommendation {
  const seller: DISCType = input.userDisc?.primary ?? "I";
  const text = input.lead.whyUs + " " + input.interactions.map((i) => i.note).join(" ");
  const inferred = inferBuyerDisc(text);
  const buyer: DISCType = inferred ?? seller;
  const body = bridgeText(seller, buyer);

  const titleEn = inferred
    ? `Approach: ${seller} seller × ${buyer} buyer`
    : `Approach: mirror your own ${seller} style`;
  const titleHe = inferred
    ? `גישה: ${seller} מוכר × ${buyer} קונה`
    : `גישה: שקפ/י את הסגנון שלך (${seller})`;

  return {
    category: "approach",
    framework: "DISC",
    titleHe,
    titleEn,
    bodyHe: body.he,
    bodyEn: body.en,
    citationHe: CITATIONS.DISC.he,
    citationEn: CITATIONS.DISC.en,
    confidence: inferred ? 0.85 : 0.5,
  };
}

// ─── Timing ─────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a: number, b: number): number {
  return Math.floor(Math.abs(a - b) / DAY_MS);
}

function timingRec(input: LeadCoachInput): LeadRecommendation {
  const { lead, interactions, crmInsights } = input;
  const now = (input.now ?? new Date()).getTime();
  const created = new Date(lead.createdAt).getTime();
  const lastTouch = interactions.length > 0
    ? Math.max(...interactions.map((i) => new Date(i.occurredAt).getTime()))
    : created;
  const daysSinceTouch = daysBetween(now, lastTouch);
  const daysSinceCreated = daysBetween(now, created);
  const cohortMedianDays =
    crmInsights?.medianTimeToCloseMs && crmInsights.meaningful
      ? Math.round(crmInsights.medianTimeToCloseMs / DAY_MS)
      : null;

  // 1. Lost recently → Sandler pain funnel re-engagement
  if (lead.status === "lost" && daysSinceCreated <= 30) {
    return {
      category: "timing",
      framework: "Sandler",
      titleHe: "Timing: חזרה ל-pain funnel",
      titleEn: "Timing: Sandler pain funnel re-engagement",
      bodyHe: lead.lostReason
        ? `הליד נסגר עם "${lead.lostReason}". אחרי 14 יום שלח/י שאלה אחת ממוקדת על הבעיה (Pain) שעדיין שם — לא על המוצר. אל תמכר/י, רק תקשיב/י.`
        : "אחרי 14 יום שלח/י שאלה אחת ממוקדת על הבעיה שעדיין שם — לא על המוצר. אל תמכר/י, רק תקשיב/י.",
      bodyEn: lead.lostReason
        ? `Deal lost on "${lead.lostReason}". After 14 days, send a single question about the pain that's still there — not the product. Don't sell, listen.`
        : "After 14 days, send a single question about the pain that's still there — not the product. Don't sell, listen.",
      citationHe: CITATIONS.Sandler.he,
      citationEn: CITATIONS.Sandler.en,
      confidence: 0.7,
    };
  }

  // 2. Stale lead (>7 days, no touch, still open) → Challenger reframe
  const open = !["closed", "lost"].includes(lead.status);
  if (open && daysSinceTouch >= 7) {
    return {
      category: "timing",
      framework: "Challenger",
      titleHe: "Timing: reframe במקום nurture",
      titleEn: "Timing: Challenger reframe — not nurture",
      bodyHe: `${daysSinceTouch} ימים בלי תקשורת. follow-up רגיל לא יזיז כאן. שלח/י תובנה (insight) שמערערת את ההנחה הקודמת שלהם — נתון שגרם להם לחשוב מחדש על הבעיה, לא על המוצר.`,
      bodyEn: `${daysSinceTouch} days silent. A standard follow-up won't move this. Send an insight that challenges their prior assumption — a data point that reframes the problem, not the product.`,
      citationHe: CITATIONS.Challenger.he,
      citationEn: CITATIONS.Challenger.en,
      confidence: 0.8,
    };
  }

  // 3. Hot/proposal stage → Cialdini commitment + scarcity
  if (lead.status === "proposal") {
    return {
      category: "timing",
      framework: "Cialdini",
      titleHe: "Timing: סגירה דרך commitment",
      titleEn: "Timing: close via commitment",
      bodyHe:
        "הליד בשלב הצעה. בקש/י מחויבות קטנה לפני הגדולה — אישור על תאריך התחלה או על שלב raison-d'être. כשמסכימים לקטן, ה-Yes לגדול הופך עקבי. הוסיפ/י חלון זמן (סקרסיטי כן, סקרסיטי אמיתי).",
      bodyEn:
        "Lead is at proposal. Ask for a small commitment before the big one — confirm a start date, or sign-off on a milestone. Once they agree small, the Yes to big becomes consistent. Anchor it in a real time window (scarcity, only if genuine).",
      citationHe: CITATIONS.Cialdini.he,
      citationEn: CITATIONS.Cialdini.en,
      confidence: 0.85,
    };
  }

  // 4. New lead → SPIN problem → implication question
  if (lead.status === "lead") {
    return {
      category: "timing",
      framework: "SPIN",
      titleHe: "Timing: שאלת implication",
      titleEn: "Timing: SPIN implication question",
      bodyHe:
        "ליד חדש. במקום לפתוח עם המוצר, פתח/י בשאלת implication: 'מה זה עולה לך עכשיו, כל חודש שזה לא נפתר?'. השאלה הזו הופכת את הבעיה למחירה האמיתי, ומגדילה דחיפות בלי לחץ מלאכותי.",
      bodyEn:
        "New lead. Instead of leading with the product, open with an implication question: \"What does it cost you, every month it stays unsolved?\" The question turns the pain into its real price and lifts urgency without artificial pressure.",
      citationHe: CITATIONS.SPIN.he,
      citationEn: CITATIONS.SPIN.en,
      confidence: 0.75,
    };
  }

  // 5. Meeting / closed → cohort-comparison default
  const cohortHint = cohortMedianDays
    ? {
        he: `קבוצת לקוחות דומה סוגרת ב-${cohortMedianDays} ימים בממוצע (לפי ה-CRM שלך). אתה ביום ${daysSinceCreated}. השווה את עצמך לקצב הזה ופעל בהתאם.`,
        en: `Similar deals close in ~${cohortMedianDays} days on average (per your CRM). You're on day ${daysSinceCreated}. Pace against that benchmark.`,
      }
    : {
        he: `אין עוד מספיק היסטוריה לקצב סגירה. התקדמ/י לשלב הבא: התקש/י, סכמ/י ב-WhatsApp, או שלח/י pre-proposal.`,
        en: "Not enough history yet for a close-rate benchmark. Move to next step: call, summarize in WhatsApp, or send a pre-proposal.",
      };

  return {
    category: "timing",
    framework: "SPIN",
    titleHe: "Timing: השווה לקצב הקבוצה",
    titleEn: "Timing: pace against the cohort",
    bodyHe: cohortHint.he,
    bodyEn: cohortHint.en,
    citationHe: CITATIONS.SPIN.he,
    citationEn: CITATIONS.SPIN.en,
    confidence: cohortMedianDays ? 0.8 : 0.55,
  };
}

// ─── Leverage ───────────────────────────────────

function leverageRec(input: LeadCoachInput): LeadRecommendation {
  const { lead, hormozi, crmInsights } = input;

  // 1. Strong whyUs → anchor on it (Cialdini consistency)
  if (lead.whyUs.trim().length >= 8) {
    const snippet = lead.whyUs.length > 80 ? lead.whyUs.slice(0, 77) + "…" : lead.whyUs;
    return {
      category: "leverage",
      framework: "Cialdini",
      titleHe: "Leverage: עיגון על הסיבה שלהם",
      titleEn: "Leverage: anchor on their stated reason",
      bodyHe: `הם בחרו אותך בגלל: "${snippet}". בכל אינטראקציה הבאה — חזור על המילים שלהם כמעט מילולית. עקביות עם דבריהם הקודמים מורידה את ההתנגדות הטבעית.`,
      bodyEn: `They picked you because: "${snippet}". In every next interaction, mirror their exact words. Consistency with their prior statement lowers natural resistance.`,
      citationHe: CITATIONS.Cialdini.he,
      citationEn: CITATIONS.Cialdini.en,
      confidence: 0.9,
    };
  }

  // 2. CRM has a recurring objection theme → preempt it (Sandler)
  const topObjection =
    crmInsights?.meaningful && crmInsights.objectionThemes.length > 0
      ? crmInsights.objectionThemes[0]
      : null;
  if (topObjection) {
    return {
      category: "leverage",
      framework: "Sandler",
      titleHe: 'Leverage: הקדם את ה"לא"',
      titleEn: "Leverage: surface the no first",
      bodyHe: `ההתנגדות החוזרת שלך היא "${topObjection.label}" (${topObjection.count} הפסדים). העלה/י אותה את/ה — לפניהם. "אנשים בדרך כלל אומרים לי X. זה גם נשמע לך?" כשהאמת על השולחן, הם פתוחים יותר לפתרון.`,
      bodyEn: `Your recurring objection is "${topObjection.label}" (${topObjection.count} losses). You name it first: "People often tell me X. Does that ring true for you?" Once it's on the table, they're more open to the resolution.`,
      citationHe: CITATIONS.Sandler.he,
      citationEn: CITATIONS.Sandler.en,
      confidence: 0.8,
    };
  }

  // 3. Has Hormozi-graded offer + high-value lead → value-equation reframe
  const ltvRef = crmInsights?.ltvActualNIS ?? 0;
  const isHighValue = lead.valueNIS > 0 && ltvRef > 0 && lead.valueNIS >= ltvRef * 1.2;
  if (hormozi && isHighValue) {
    return {
      category: "leverage",
      framework: "Hormozi",
      titleHe: "Leverage: הגדל dream outcome",
      titleEn: "Leverage: amplify the dream outcome",
      bodyHe: `הליד גדול מהממוצע שלך. הצעת הערך שלך כעת בציון ${hormozi.overallScore}/100. במשפט הסגירה — הגדל/י במפורש את "התוצאה החלומית" (גודל היעד שאתה מבטיח), הורד/י סיכון בכתב, וקצר/י את ה-time-to-result.`,
      bodyEn: `This lead is above your average value. Your offer scores ${hormozi.overallScore}/100. In the closing pitch, explicitly amplify the "dream outcome" (size of what you promise), reduce risk in writing, and shorten the time-to-result.`,
      citationHe: CITATIONS.Hormozi.he,
      citationEn: CITATIONS.Hormozi.en,
      confidence: 0.85,
    };
  }

  // 4. No qualitative data — use SPIN need-payoff
  return {
    category: "leverage",
    framework: "SPIN",
    titleHe: "Leverage: שאלת need-payoff",
    titleEn: "Leverage: SPIN need-payoff",
    bodyHe:
      "אין עדיין מספיק מידע איכותי על הליד הזה. השלב הבא — שאל/י שאלת need-payoff: 'אם זה היה נפתר, מה זה היה משחרר אצלך?'. התשובה תיתן לך גם את הסיבה האמיתית, גם את החומר לסגירה.",
    bodyEn:
      "Not enough qualitative signal yet. Next step: ask a need-payoff question — \"If this were solved, what would it free up for you?\". The answer gives you both the real reason and the closing material.",
    citationHe: CITATIONS.SPIN.he,
    citationEn: CITATIONS.SPIN.en,
    confidence: 0.6,
  };
}

// ─── Public entry point ─────────────────────────

export function generateLeadRecommendations(input: LeadCoachInput): LeadRecommendation[] {
  return [approachRec(input), timingRec(input), leverageRec(input)];
}
