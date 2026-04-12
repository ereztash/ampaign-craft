// ═══════════════════════════════════════════════
// Neuro-Closing Engine
// Cross-domain: Neuroscience × Sales Psychology × DISC Profiling
// Generates closing strategies, objection handling, and price presentation
// optimized for the prospect's personality type
// ═══════════════════════════════════════════════

import { FormData } from "@/types/funnel";
import { DISCProfile } from "./discProfileEngine";

export interface ObjectionHandler {
  objection: { he: string; en: string };
  response: { he: string; en: string };
  technique: string;
}

export interface PricePresentation {
  strategy: { he: string; en: string };
  anchor: { he: string; en: string };
  framing: { he: string; en: string };
}

export interface FollowUpStep {
  day: number;
  channel: string;
  action: { he: string; en: string };
  template: { he: string; en: string };
}

export interface NeuroClosingStrategy {
  closingStyle: { he: string; en: string };
  objectionHandlers: ObjectionHandler[];
  pricePresentation: PricePresentation;
  followUpSequence: FollowUpStep[];
  urgencyTactics: { he: string; en: string }[];
  trustSignals: { he: string; en: string }[];
}

// ═══════════════════════════════════════════════
// OBJECTION HANDLERS BY DISC TYPE
// ═══════════════════════════════════════════════

const OBJECTION_HANDLERS: Record<"D" | "I" | "S" | "C", ObjectionHandler[]> = {
  D: [
    {
      objection: { he: "אין לי זמן לזה", en: "I don't have time for this" },
      response: { he: "בדיוק בגלל זה — המערכת חוסכת לך 12 שעות בשבוע. ROI מהיום הראשון", en: "That's exactly why — the system saves you 12 hours/week. ROI from day one" },
      technique: "reframe-to-ROI",
    },
    {
      objection: { he: "יקר מדי", en: "Too expensive" },
      response: { he: "כמה עולה לך לא לעשות את זה? ₪X בחודש הולכים לפח. ההשקעה מחזירה את עצמה תוך 30 יום", en: "What does NOT doing this cost you? ₪X/month going to waste. Investment pays for itself in 30 days" },
      technique: "cost-of-inaction",
    },
    {
      objection: { he: "אני צריך לחשוב על זה", en: "I need to think about it" },
      response: { he: "מה בדיוק צריך לבדוק? בוא נפרק את זה ב-60 שניות — ואם לא מתאים, אני הראשון להגיד", en: "What exactly do you need to check? Let's break it down in 60 seconds — if it's not right, I'll be the first to say so" },
      technique: "isolate-objection",
    },
  ],
  I: [
    {
      objection: { he: "אני לא בטוח/ה שזה בשבילי", en: "I'm not sure this is for me" },
      response: { he: "הנה מה שקרה לשרה — היא גם חשבה ככה, ותוך שבועיים... (סיפור הצלחה)", en: "Here's what happened to Sarah — she thought the same, and within two weeks... (success story)" },
      technique: "social-proof-story",
    },
    {
      objection: { he: "יקר מדי", en: "Too expensive" },
      response: { he: "בוא/י נדבר על מה שזה נותן לך — לא רק מספרים, אלא את החוויה של... (חזון רגשי)", en: "Let's talk about what this gives you — not just numbers, but the experience of... (emotional vision)" },
      technique: "value-vision",
    },
    {
      objection: { he: "אני צריך/ה לחשוב על זה", en: "I need to think about it" },
      response: { he: "לגמרי! אגב, 2,400 אנשים כבר הצטרפו השבוע — רוצה שאשמור לך מקום?", en: "Totally! By the way, 2,400 people already joined this week — want me to save you a spot?" },
      technique: "fomo-with-warmth",
    },
  ],
  S: [
    {
      objection: { he: "אני צריך/ה לדבר עם... (שותף/בן זוג)", en: "I need to talk to... (partner/spouse)" },
      response: { he: "כמובן — הנה סיכום שאפשר להראות. ואגב, יש ערבות מלאה, אז אין סיכון בכלל", en: "Of course — here's a summary to show them. And by the way, there's a full guarantee, so zero risk" },
      technique: "enable-consensus",
    },
    {
      objection: { he: "יקר מדי", en: "Too expensive" },
      response: { he: "אני מבין/ה — זו החלטה חשובה. הנה תוכנית תשלומים: רק ₪X לחודש, ועם ערבות 30 יום", en: "I understand — it's an important decision. Here's a payment plan: just ₪X/month, with a 30-day guarantee" },
      technique: "reduce-risk",
    },
    {
      objection: { he: "מה אם זה לא עובד?", en: "What if it doesn't work?" },
      response: { he: "שאלה מצוינת. יש לנו ערבות תוצאה — אם לא תראה/י שיפור של X% תוך 60 יום, נחזיר הכל. בנוסף, ליווי אישי צמוד", en: "Great question. We have a results guarantee — if you don't see X% improvement in 60 days, full refund. Plus, close personal guidance" },
      technique: "guarantee-plus-support",
    },
  ],
  C: [
    {
      objection: { he: "אני צריך/ה לראות עוד נתונים", en: "I need to see more data" },
      response: { he: "בהחלט — הנה דוח Case Study מפורט (47 עמודים): שיפור של 34.7% ב-ROI עבור 156 לקוחות בתחום שלך", en: "Absolutely — here's a detailed Case Study report (47 pages): 34.7% ROI improvement across 156 clients in your industry" },
      technique: "data-dump",
    },
    {
      objection: { he: "יקר מדי", en: "Too expensive" },
      response: { he: "בוא/י נחשב ROI: עלות חודשית ₪X ÷ שיפור ממוצע Y% × הכנסה נוכחית = החזר של ₪Z. נקודת Break-even: חודש 2.3", en: "Let's calculate ROI: monthly cost ₪X ÷ average Y% improvement × current revenue = ₪Z return. Break-even: month 2.3" },
      technique: "roi-calculation",
    },
    {
      objection: { he: "איך זה עובד בפועל?", en: "How does this actually work?" },
      response: { he: "הנה המתודולוגיה ב-5 שלבים: (1) אבחון ← (2) תכנון ← (3) הטמעה ← (4) מדידה ← (5) אופטימיזציה. כל שלב עם KPIs מוגדרים", en: "Here's the 5-step methodology: (1) Diagnosis ← (2) Planning ← (3) Implementation ← (4) Measurement ← (5) Optimization. Each step with defined KPIs" },
      technique: "methodology-breakdown",
    },
  ],
};

// ═══════════════════════════════════════════════
// PRICE PRESENTATION BY DISC
// ═══════════════════════════════════════════════

function buildPricePresentation(disc: DISCProfile, formData: FormData): PricePresentation {
  const price = formData.averagePrice || 500;
  const daily = Math.round(price / 30);
  const formatted = `₪${price.toLocaleString()}`;

  switch (disc.primary) {
    case "D":
      return {
        strategy: { he: "הצגת מחיר ישירה עם ROI מיידי", en: "Direct price presentation with immediate ROI" },
        anchor: { he: `השקעה של ${formatted} → תשואה של ₪${(price * 3).toLocaleString()} תוך 90 יום`, en: `Investment of ${formatted} → return of ₪${(price * 3).toLocaleString()} within 90 days` },
        framing: { he: `${formatted} — ₪${daily} ליום. פחות ממה שאתה מבזבז על קפה`, en: `${formatted} — ₪${daily}/day. Less than what you spend on coffee` },
      };
    case "I":
      return {
        strategy: { he: "הצגת מחיר דרך חוויה וערך", en: "Price presentation through experience and value" },
        anchor: { he: `תארו לעצמכם ש-${formatted} הוא כל מה שמפריד בינכם לבין... (חזון)`, en: `Imagine ${formatted} is all that stands between you and... (vision)` },
        framing: { he: `${formatted} — ו-2,400 אנשים כבר שם. אתם הבאים?`, en: `${formatted} — and 2,400 people are already there. Are you next?` },
      };
    case "S":
      return {
        strategy: { he: "הצגת מחיר עם הפחתת סיכון מקסימלית", en: "Price presentation with maximum risk reduction" },
        anchor: { he: `${formatted} עם ערבות 100% ל-30 יום. אם לא מרוצה — החזר מלא, בלי שאלות`, en: `${formatted} with 100% 30-day guarantee. Not happy — full refund, no questions` },
        framing: { he: `רק ₪${daily} ליום, ותוכנית תשלומים זמינה. בלי לחץ, בקצב שלך`, en: `Just ₪${daily}/day, payment plans available. No pressure, at your pace` },
      };
    case "C":
      return {
        strategy: { he: "הצגת מחיר מבוססת חישוב ROI", en: "ROI-based price presentation" },
        anchor: { he: `${formatted} = עלות של ₪${daily}/יום × 30 יום. ROI ממוצע: 340%. Break-even: חודש 2.3`, en: `${formatted} = cost of ₪${daily}/day × 30 days. Average ROI: 340%. Break-even: month 2.3` },
        framing: { he: `השקעה של ${formatted} מול הפסד של ₪${(price * 4).toLocaleString()} בשנה ללא פעולה. היחס: 1:4`, en: `Investment of ${formatted} vs loss of ₪${(price * 4).toLocaleString()}/year without action. Ratio: 1:4` },
      };
  }
}

// ═══════════════════════════════════════════════
// FOLLOW-UP SEQUENCE BY DISC
// ═══════════════════════════════════════════════

function buildFollowUpSequence(disc: DISCProfile, formData: FormData): FollowUpStep[] {
  const hasWhatsapp = formData.existingChannels.includes("whatsapp");
  const hasEmail = formData.existingChannels.includes("email");
  const primaryChannel = hasWhatsapp ? "whatsapp" : hasEmail ? "email" : "email";

  switch (disc.primary) {
    case "D":
      return [
        { day: 0, channel: primaryChannel, action: { he: "סיכום ב-3 נקודות + CTA", en: "3-point summary + CTA" }, template: { he: "הנה 3 דברים שסיכמנו: 1)... 2)... 3)... מוכן להתחיל?", en: "Here are 3 things we agreed on: 1)... 2)... 3)... Ready to start?" } },
        { day: 2, channel: primaryChannel, action: { he: "שליחת תוצאה מהירה", en: "Send quick result" }, template: { he: "בינתיים, לקוח דומה שלנו השיג X% בשבוע — רוצה לראות?", en: "Meanwhile, a similar client achieved X% this week — want to see?" } },
        { day: 5, channel: "phone", action: { he: "שיחת סגירה קצרה", en: "Short closing call" }, template: { he: "שיחה של 5 דקות — בוטום ליין, כן או לא?", en: "5-minute call — bottom line, yes or no?" } },
      ];
    case "I":
      return [
        { day: 0, channel: primaryChannel, action: { he: "סיפור הצלחה + הזמנה לקהילה", en: "Success story + community invite" }, template: { he: "הנה הסיפור של... (Case Study רגשי). אגב, יש לנו קבוצה עם 500 חברים — רוצה להצטרף?", en: "Here's the story of... (emotional Case Study). BTW, we have a group with 500 members — want to join?" } },
        { day: 3, channel: "instagram", action: { he: "שיתוף תוכן מעורר השראה", en: "Share inspiring content" }, template: { he: "ראיתי את הפוסט שלך — מדהים! אגב, זה קשור למה שדיברנו על...", en: "Saw your post — amazing! BTW, this connects to what we discussed about..." } },
        { day: 7, channel: primaryChannel, action: { he: "FOMO רך", en: "Soft FOMO" }, template: { he: "עוד 3 מקומות נשארו לקבוצה הבאה — שמור/י לך?", en: "3 spots left for the next group — save one for you?" } },
      ];
    case "S":
      return [
        { day: 0, channel: primaryChannel, action: { he: "תודה + סיכום + בטחון", en: "Thanks + summary + reassurance" }, template: { he: "תודה על השיחה! הנה סיכום קצר. אין שום לחץ — קח/י את הזמן. אני כאן לכל שאלה", en: "Thanks for the chat! Here's a brief summary. No pressure — take your time. I'm here for any question" } },
        { day: 5, channel: primaryChannel, action: { he: "בדיקה אישית + עדות", en: "Personal check-in + testimonial" }, template: { he: "רציתי לבדוק אם יש שאלות. אגב, הנה מה שאומר/ת לקוח/ה שהתחיל/ה בדיוק מאותו מצב...", en: "Wanted to check if you have questions. BTW, here's what a client who started from the exact same situation says..." } },
        { day: 10, channel: primaryChannel, action: { he: "הצעה ללא סיכון", en: "Risk-free offer" }, template: { he: "חשבתי עלייך — רוצה לנסות שבוע חינם? בלי התחייבות, בלי כרטיס אשראי", en: "Was thinking about you — want to try a free week? No commitment, no credit card" } },
      ];
    case "C":
      return [
        { day: 0, channel: "email", action: { he: "שליחת דוח מפורט", en: "Send detailed report" }, template: { he: "מצורף הדוח המלא — 47 עמודים כולל נתונים, Case Studies, ו-ROI מחושב. אשמח לענות על שאלות טכניות", en: "Attached: full report — 47 pages including data, Case Studies, and calculated ROI. Happy to answer technical questions" } },
        { day: 4, channel: "email", action: { he: "מחקר/ניתוח רלוונטי", en: "Relevant research/analysis" }, template: { he: "מצאתי מחקר רלוונטי לתחום שלך: שיפור של 34.7% ב-156 חברות דומות. מצורף הניתוח המלא", en: "Found relevant research for your industry: 34.7% improvement across 156 similar companies. Full analysis attached" } },
        { day: 8, channel: "email", action: { he: "הצעה + חישוב ROI אישי", en: "Proposal + personal ROI calc" }, template: { he: "הכנתי חישוב ROI אישי עבורך: השקעה X → תשואה Y → Break-even בחודש Z. רוצה לדון בנתונים?", en: "Prepared a personal ROI calculation for you: investment X → return Y → break-even month Z. Want to discuss the numbers?" } },
      ];
  }
}

// ═══════════════════════════════════════════════
// URGENCY & TRUST BY DISC
// ═══════════════════════════════════════════════

function getUrgencyTactics(disc: DISCProfile): { he: string; en: string }[] {
  switch (disc.primary) {
    case "D": return [
      { he: "כל יום עיכוב = ₪X הפסד. המתחרים כבר שם", en: "Every day of delay = ₪X loss. Competitors are already there" },
      { he: "3 מקומות נשארו — מי שמהר, מרוויח", en: "3 spots left — first come, first served" },
    ];
    case "I": return [
      { he: "כבר 2,400 אנשים הצטרפו השבוע — אתה הבא?", en: "2,400 people already joined this week — are you next?" },
      { he: "ההצעה הזו נגמרת ביום ראשון — חבל לפספס", en: "This offer ends Sunday — don't miss out" },
    ];
    case "S": return [
      { he: "ללא לחץ, אבל ההצעה הנוכחית כוללת ליווי אישי שלא תמיד זמין", en: "No pressure, but the current offer includes personal guidance that's not always available" },
      { he: "הצטרף/י כשמתאים לך — המקום שלך שמור", en: "Join when it suits you — your spot is saved" },
    ];
    case "C": return [
      { he: "הנתונים מדברים: כל חודש עיכוב = ₪X עלות אלטרנטיבית (ראה נספח ב')", en: "The data speaks: each month of delay = ₪X opportunity cost (see appendix B)" },
      { he: "המחיר הנוכחי מבוסס על נתוני Q1 — עדכון מחירים ב-Q2", en: "Current price based on Q1 data — price update in Q2" },
    ];
  }
}

function getTrustSignals(disc: DISCProfile, formData: FormData): { he: string; en: string }[] {
  const base: { he: string; en: string }[] = [
    { he: "ערבות שביעות רצון מלאה", en: "Full satisfaction guarantee" },
  ];

  switch (disc.primary) {
    case "D":
      base.push(
        { he: "156 חברות כבר משתמשות — כולל 3 מהענף שלך", en: "156 companies already use us — including 3 from your industry" },
        { he: "תוצאות תוך 48 שעות או כספך חזרה", en: "Results in 48 hours or your money back" },
      );
      break;
    case "I":
      base.push(
        { he: "קהילה פעילה של 2,400+ חברים", en: "Active community of 2,400+ members" },
        { he: "דירוג 4.9/5 ב-Google (326 ביקורות)", en: "4.9/5 Google rating (326 reviews)" },
      );
      break;
    case "S":
      base.push(
        { he: "ליווי אישי צמוד מיום ראשון", en: "Close personal guidance from day one" },
        { he: "תמיכה 24/7 בוואטסאפ", en: "24/7 WhatsApp support" },
        { he: "ערבות 30 יום — ללא שאלות", en: "30-day guarantee — no questions asked" },
      );
      break;
    case "C":
      base.push(
        { he: "מבוסס על מחקר מ-12 מקורות אקדמיים", en: "Based on research from 12 academic sources" },
        { he: "ISO 27001 certified | GDPR compliant", en: "ISO 27001 certified | GDPR compliant" },
        { he: "SLA עם KPIs מוגדרים מראש", en: "SLA with predefined KPIs" },
      );
      break;
  }

  return base;
}

// ═══════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════

export function generateClosingStrategy(
  discProfile: DISCProfile,
  formData: FormData,
  ukg?: import("./userKnowledgeGraph").UserKnowledgeGraph,
): NeuroClosingStrategy {
  const handlers = [...OBJECTION_HANDLERS[discProfile.primary]];

  // Cross-domain: inject real objections from AI Coach chat history
  if (ukg?.chatInsights?.mentionedObjections?.length) {
    for (const obj of ukg.chatInsights.mentionedObjections.slice(0, 2)) {
      handlers.push({
        objection: { he: obj, en: obj },
        response: { he: `אני שומע את זה הרבה — ${obj}. בואי נטפל בזה ישירות.`, en: `I hear that a lot — ${obj}. Let's address it directly.` },
        technique: "acknowledge",
      });
    }
  }

  // Cross-domain: weave differentiation mechanism into trust signals
  const trust = getTrustSignals(discProfile, formData);
  if (ukg?.differentiation?.mechanismStatement?.oneLiner?.en) {
    trust.push({
      he: ukg.differentiation.mechanismStatement.oneLiner.he,
      en: ukg.differentiation.mechanismStatement.oneLiner.en,
    });
  }

  return {
    closingStyle: discProfile.communicationTone,
    objectionHandlers: handlers,
    pricePresentation: buildPricePresentation(discProfile, formData),
    followUpSequence: buildFollowUpSequence(discProfile, formData),
    urgencyTactics: getUrgencyTactics(discProfile),
    trustSignals: trust,
  };
}
