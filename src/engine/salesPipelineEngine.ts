import { FormData, FunnelResult } from "@/types/funnel";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export type DealStageId = "prospect" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";

export interface DealStage {
  id: DealStageId;
  name: { he: string; en: string };
  emoji: string;
  conversionRate: number;
  avgDaysInStage: number;
  actions: { he: string; en: string }[];
}

export interface SalesForecast {
  monthlyDeals: number;
  avgDealSize: number;
  pipelineValue: number;
  expectedRevenue: number;
  cycleLength: number;
  winRate: number;
}

export interface ObjectionScript {
  objection: { he: string; en: string };
  response: { he: string; en: string };
  technique: string;
  emoji: string;
}

export interface SalesAutomation {
  trigger: { he: string; en: string };
  action: { he: string; en: string };
  tool: string;
  emoji: string;
}

export interface SalesPipelineResult {
  stages: DealStage[];
  forecast: SalesForecast;
  objectionScripts: ObjectionScript[];
  automations: SalesAutomation[];
  salesType: "transactional" | "consultative" | "enterprise";
  closingTips: { he: string; en: string }[];
}

// ═══════════════════════════════════════════════
// Pipeline Generation
// ═══════════════════════════════════════════════

function detectSalesType(formData: FormData): SalesPipelineResult["salesType"] {
  if (formData.audienceType === "b2b" && formData.averagePrice > 1000) return "enterprise";
  if (formData.audienceType === "b2b" || formData.averagePrice > 500) return "consultative";
  return "transactional";
}

const PIPELINE_CONFIGS: Record<SalesPipelineResult["salesType"], {
  stages: DealStage[];
  cycleDays: number;
  winRate: number;
}> = {
  transactional: {
    cycleDays: 7, winRate: 0.15,
    stages: [
      { id: "prospect", name: { he: "ליד נכנס", en: "Incoming Lead" }, emoji: "📥", conversionRate: 60, avgDaysInStage: 1,
        actions: [
          { he: "שלח הודעת ברוכים הבאים תוך 5 דקות", en: "Send welcome message within 5 minutes" },
          { he: "סווג לפי מקור הליד (פייסבוק/גוגל/אורגני)", en: "Classify by lead source (Facebook/Google/Organic)" },
        ] },
      { id: "qualified", name: { he: "מתעניין פעיל", en: "Active Interest" }, emoji: "🔥", conversionRate: 40, avgDaysInStage: 2,
        actions: [
          { he: "שלח קטלוג/דף מוצר ממוקד", en: "Send targeted product page/catalog" },
          { he: "הפעל retargeting עם הנחה (10-15%)", en: "Activate retargeting with discount (10-15%)" },
        ] },
      { id: "proposal", name: { he: "עגלה / הצעה", en: "Cart / Offer" }, emoji: "🛒", conversionRate: 55, avgDaysInStage: 2,
        actions: [
          { he: "שלח תזכורת עגלה נטושה (1 שעה + 24 שעות)", en: "Send abandoned cart reminder (1h + 24h)" },
          { he: "הוסף urgency: משלוח חינם עד X / מלאי מוגבל", en: "Add urgency: free shipping until X / limited stock" },
        ] },
      { id: "closed_won", name: { he: "רכישה!", en: "Purchase!" }, emoji: "🎉", conversionRate: 100, avgDaysInStage: 0,
        actions: [
          { he: "שלח אישור הזמנה + tracking", en: "Send order confirmation + tracking" },
          { he: "הפעל upsell אוטומטי אחרי 3 ימים", en: "Trigger automatic upsell after 3 days" },
        ] },
    ],
  },
  consultative: {
    cycleDays: 21, winRate: 0.25,
    stages: [
      { id: "prospect", name: { he: "פנייה ראשונית", en: "Initial Contact" }, emoji: "👋", conversionRate: 50, avgDaysInStage: 2,
        actions: [
          { he: "שיחת Discovery — שאל 3 שאלות מפתח", en: "Discovery call — ask 3 key questions" },
          { he: "שלח חומר ערך (מדריך/Case Study)", en: "Send value material (guide/case study)" },
        ] },
      { id: "qualified", name: { he: "אבחון צרכים", en: "Needs Assessment" }, emoji: "🔍", conversionRate: 60, avgDaysInStage: 5,
        actions: [
          { he: "הצג אבחון אישי — הראה שאתה מבין את הכאב", en: "Present personal assessment — show you understand the pain" },
          { he: "שלח 2-3 עדויות של לקוחות דומים", en: "Send 2-3 testimonials from similar clients" },
        ] },
      { id: "proposal", name: { he: "הצעת מחיר", en: "Proposal" }, emoji: "📋", conversionRate: 50, avgDaysInStage: 5,
        actions: [
          { he: "הצג 3 חבילות (אנקור על האמצעית)", en: "Present 3 packages (anchor on middle)" },
          { he: "הוסף בונוס לסגירה תוך 48 שעות", en: "Add bonus for closing within 48 hours" },
        ] },
      { id: "negotiation", name: { he: "משא ומתן", en: "Negotiation" }, emoji: "🤝", conversionRate: 65, avgDaysInStage: 5,
        actions: [
          { he: "אל תוריד מחיר — הוסף ערך במקום", en: "Don't reduce price — add value instead" },
          { he: "השתמש ב-FOMO: 'נשארו X מקומות החודש'", en: "Use FOMO: 'X spots remaining this month'" },
        ] },
      { id: "closed_won", name: { he: "סגירה!", en: "Closed Won!" }, emoji: "🏆", conversionRate: 100, avgDaysInStage: 0,
        actions: [
          { he: "שלח onboarding מיידי", en: "Send immediate onboarding" },
          { he: "בקש referral תוך 30 יום", en: "Request referral within 30 days" },
        ] },
    ],
  },
  enterprise: {
    cycleDays: 60, winRate: 0.20,
    stages: [
      { id: "prospect", name: { he: "זיהוי הזדמנות", en: "Opportunity Identified" }, emoji: "🎯", conversionRate: 40, avgDaysInStage: 7,
        actions: [
          { he: "מפה את מקבלי ההחלטות (Champion + Economic Buyer)", en: "Map decision makers (Champion + Economic Buyer)" },
          { he: "הכן one-pager ממוקד לתעשייה", en: "Prepare industry-focused one-pager" },
        ] },
      { id: "qualified", name: { he: "BANT Qualified", en: "BANT Qualified" }, emoji: "✅", conversionRate: 55, avgDaysInStage: 10,
        actions: [
          { he: "אמת: Budget, Authority, Need, Timeline", en: "Validate: Budget, Authority, Need, Timeline" },
          { he: "הגש POC / Pilot קצר (2-4 שבועות)", en: "Propose short POC / Pilot (2-4 weeks)" },
        ] },
      { id: "proposal", name: { he: "RFP / הצעה", en: "RFP / Proposal" }, emoji: "📑", conversionRate: 45, avgDaysInStage: 14,
        actions: [
          { he: "הצעה כוללת ROI מחושב + timeline", en: "Proposal includes calculated ROI + timeline" },
          { he: "כלול SLA + Success Metrics", en: "Include SLA + Success Metrics" },
        ] },
      { id: "negotiation", name: { he: "משא ומתן + Legal", en: "Negotiation + Legal" }, emoji: "⚖️", conversionRate: 60, avgDaysInStage: 14,
        actions: [
          { he: "הכן redlines מראש — דע מה גמיש ומה לא", en: "Prepare redlines in advance — know what's flexible" },
          { he: "הצע payment terms: 50/30/20 או quarterly", en: "Offer payment terms: 50/30/20 or quarterly" },
        ] },
      { id: "closed_won", name: { he: "חתימה!", en: "Signed!" }, emoji: "🏆", conversionRate: 100, avgDaysInStage: 0,
        actions: [
          { he: "Kickoff meeting תוך שבוע", en: "Kickoff meeting within one week" },
          { he: "הקצה CSM ושלח Onboarding Deck", en: "Assign CSM and send Onboarding Deck" },
        ] },
    ],
  },
};

// ═══════════════════════════════════════════════
// Objection Scripts
// ═══════════════════════════════════════════════

import { UserKnowledgeGraph, getFieldNameHe, getFieldNameEn, formatPrice } from "./userKnowledgeGraph";

function getObjectionScripts(salesType: SalesPipelineResult["salesType"], graph?: UserKnowledgeGraph): ObjectionScript[] {
  const g = graph;
  const fieldHe = g ? getFieldNameHe(g.business.field) : "";
  const fieldEn = g ? getFieldNameEn(g.business.field) : "";
  const priceStr = g ? formatPrice(g.business.price) : "X";
  const product = g?.business.product?.slice(0, 60) || "";
  const competitor = g?.differentiation?.competitors?.[0] || "";
  const mechanism = g?.differentiation?.mechanismStatement?.mechanism || "";
  const painHe = g?.derived.industryPainPoints?.[0]?.he || "הבעיה הזו";
  const painEn = g?.derived.industryPainPoints?.[0]?.en || "this problem";
  const monthlySaving = g ? formatPrice(Math.round(g.business.price * 0.3)) : "X";

  const scripts: ObjectionScript[] = [
    { objection: { he: "יקר לי", en: "It's too expensive" },
      response: {
        he: g
          ? `אני מבין. בעלי עסקי ${fieldHe} כמוך שמשקיעים ${priceStr} רואים החזר תוך 30 יום בממוצע. כמה עולה לך ${painHe} כל חודש?`
          : "אני מבין. כמה עולה לך לא לפתור את הבעיה הזו? הלקוחות שלנו חוסכים X תוך חודש ראשון.",
        en: g
          ? `I understand. ${fieldEn} business owners like you who invest ${priceStr} see returns within 30 days on average. How much is ${painEn} costing you each month?`
          : "I understand. How much does it cost you NOT to solve this? Our clients save X within the first month.",
      },
      technique: "Reframe to cost of inaction", emoji: "💰" },
    { objection: { he: "אני צריך לחשוב על זה", en: "I need to think about it" },
      response: {
        he: g
          ? `בהחלט. רוב בעלי עסקי ${fieldHe} שואלים על ${painHe}. מה הדבר שהכי חשוב לך לבדוק — המחיר, ההתאמה, או התוצאות?`
          : "בהחלט. מה בדיוק היית רוצה לבדוק? אולי אני יכול לעזור עם המידע הנכון.",
        en: g
          ? `Absolutely. Most ${fieldEn} owners ask about ${painEn}. What matters most — price, fit, or results?`
          : "Absolutely. What specifically would you like to check? Maybe I can help with the right info.",
      },
      technique: "Isolate the real objection", emoji: "🤔" },
    { objection: { he: "ניסיתי משהו דומה ולא עבד", en: "I tried something similar and it didn't work" },
      response: {
        he: g && mechanism
          ? `זה בדיוק מה שאנחנו עושים אחרת. ${mechanism}. תספר לי מה לא עבד — בגישה הקודמת כנראה חסר הדבר הזה.`
          : g
            ? `מובן. ספר לי מה לא עבד — כי בתחום ה${fieldHe} יש 3 דברים שבדרך כלל נופלים: ${painHe}. אנחנו פותרים את זה אחרת.`
            : "תגיד לי מה לא עבד — כי זה בדיוק מה שאנחנו עושים אחרת.",
        en: g && mechanism
          ? `That's exactly what makes us different. ${mechanism}. Tell me what didn't work — the previous approach was likely missing this.`
          : g
            ? `I see. Tell me what didn't work — in ${fieldEn}, the top 3 failure points are usually around ${painEn}. We address that differently.`
            : "Tell me what didn't work — because that's exactly what we do differently.",
      },
      technique: "Differentiate & validate", emoji: "🔄" },
    { objection: { he: "אין לי זמן עכשיו", en: "I don't have time right now" },
      response: {
        he: g
          ? `דווקא בגלל זה — בעלי עסקי ${fieldHe} שעובדים איתנו חוסכים ${monthlySaving} בחודש. 15 דקות כדי לראות אם זה רלוונטי?`
          : "דווקא בגלל זה — הפתרון שלנו חוסך X שעות בשבוע. 15 דקות?",
        en: g
          ? `That's exactly why — ${fieldEn} owners working with us save ${monthlySaving}/month. 15 minutes to see if it's relevant?`
          : "That's exactly why — our solution saves X hours per week. 15 minutes?",
      },
      technique: "Time as investment", emoji: "⏰" },
  ];

  // Competitor-specific objection (only if differentiation data exists)
  if (competitor && g?.differentiation) {
    const tradeoff = g.differentiation.tradeoffs?.[0];
    scripts.push({
      objection: { he: `למה לא ללכת עם ${competitor}?`, en: `Why not go with ${competitor}?` },
      response: {
        he: tradeoff
          ? `שאלה מצוינת. ${competitor} מצוינים ב-X. אנחנו בחרנו במודע לוותר על ${tradeoff.weakness} כדי ש${tradeoff.reframe}. זה עובד הכי טוב ל${tradeoff.beneficiary}.`
          : `שאלה מצוינת. ${competitor} הם שחקנים רציניים. ההבדל העיקרי — ${mechanism || "הגישה שלנו שונה מהותית"}.`,
        en: tradeoff
          ? `Great question. ${competitor} excels at X. We deliberately chose to trade ${tradeoff.weakness} so that ${tradeoff.reframe}. This works best for ${tradeoff.beneficiary}.`
          : `Great question. ${competitor} is a serious player. The core difference — ${mechanism || "our approach is fundamentally different"}.`,
      },
      technique: "Tradeoff-based competitive framing", emoji: "⚔️",
    });
  }

  if (salesType === "enterprise") {
    scripts.push({
      objection: { he: "צריך אישור מההנהלה / Procurement", en: "Need management / Procurement approval" },
      response: {
        he: g
          ? `מצוין — בוא נכין ביחד one-pager עם ROI שמראה איך ${product || "הפתרון"} חוסך ${monthlySaving} בחודש. אני אתאים אותו ל-CFO.`
          : "מצוין — בוא נכין ביחד one-pager עם ROI שאתה יכול להעביר.",
        en: g
          ? `Great — let's prepare a one-pager showing how ${product || "the solution"} saves ${monthlySaving}/month. I'll tailor it for the CFO.`
          : "Great — let's prepare a one-pager with ROI together.",
      },
      technique: "Enable the champion", emoji: "📊",
    });
  }

  return scripts;
}

// ═══════════════════════════════════════════════
// Sales Automations
// ═══════════════════════════════════════════════

function getSalesAutomations(salesType: SalesPipelineResult["salesType"]): SalesAutomation[] {
  const automations: SalesAutomation[] = [
    { trigger: { he: "ליד חדש נכנס", en: "New lead enters" },
      action: { he: "הודעת ברוכים הבאים + Link לקביעת שיחה", en: "Welcome message + link to book a call" },
      tool: "ActiveTrail / WhatsApp Business", emoji: "⚡" },
    { trigger: { he: "ליד לא ענה 48 שעות", en: "Lead didn't respond 48h" },
      action: { he: "Follow-up עם ערך נוסף (מדריך/טיפ)", en: "Follow-up with added value (guide/tip)" },
      tool: "Monday.com CRM", emoji: "🔔" },
    { trigger: { he: "הצעת מחיר נשלחה", en: "Proposal sent" },
      action: { he: "תזכורת אוטומטית אחרי 3 + 7 ימים", en: "Auto reminder after 3 + 7 days" },
      tool: "Monday.com / Pipedrive", emoji: "📅" },
    { trigger: { he: "עסקה נסגרה", en: "Deal closed" },
      action: { he: "Onboarding email + בקשת ביקורת Google", en: "Onboarding email + Google review request" },
      tool: "ActiveTrail / Email", emoji: "🎊" },
  ];

  if (salesType !== "transactional") {
    automations.push({
      trigger: { he: "שיחת Discovery הסתיימה", en: "Discovery call completed" },
      action: { he: "סיכום שיחה + next steps תוך שעה", en: "Call summary + next steps within 1 hour" },
      tool: "Monday.com / Notion", emoji: "📝",
    });
  }

  return automations;
}

// ═══════════════════════════════════════════════
// Closing Tips
// ═══════════════════════════════════════════════

function getClosingTips(salesType: SalesPipelineResult["salesType"], graph?: UserKnowledgeGraph): { he: string; en: string }[] {
  const g = graph;
  const fieldHe = g ? getFieldNameHe(g.business.field) : "";
  const priceStr = g ? formatPrice(g.business.price) : "₪X";
  const painHe = g?.derived.industryPainPoints?.[0]?.he || "הבעיה";
  const painEn = g?.derived.industryPainPoints?.[0]?.en || "the problem";

  const tips: { he: string; en: string }[] = [
    { he: "חוק 80/20: 80% הקשבה, 20% דיבור. מי ששואל — שולט", en: "80/20 Rule: 80% listening, 20% talking. Whoever asks questions, controls" },
    { he: "Follow-up תוך 5 דקות = סיכוי סגירה x21 גבוה יותר", en: "Follow-up within 5 min = 21x higher close rate" },
    g
      ? { he: `אל תמכור פיצ'רים — מכור תוצאות. '${painHe} נפתר' > רשימת יכולות`, en: `Don't sell features — sell outcomes. '${painEn} solved' > feature list` }
      : { he: "אל תמכור פיצ'רים — מכור תוצאות. 'תחסוך 10 שעות' > 'יש אוטומציה'", en: "Don't sell features — sell outcomes. 'Save 10 hours' > 'We have automation'" },
  ];

  if (salesType !== "transactional") {
    tips.push(
      { he: "שיטת Sandler: אל תרדוף — גרום ללקוח 'לגלות' שהוא צריך אותך", en: "Sandler Method: Don't chase — let the client 'discover' they need you" },
      { he: "הראה ROI מספרי: 'לקוח דומה הגדיל ב-X% תוך Y חודשים'", en: "Show numerical ROI: 'A similar client grew X% within Y months'" },
    );
  }

  if (salesType === "enterprise") {
    tips.push(
      { he: "זהה Champion פנימי ותן לו את הכלים למכור בפנים", en: "Identify internal Champion and equip them to sell internally" },
      { he: "MEDDIC: Metrics, Economic Buyer, Decision Criteria, Process, Pain, Champion", en: "MEDDIC: Metrics, Economic Buyer, Decision Criteria, Process, Pain, Champion" },
    );
  }

  if (salesType === "transactional") {
    tips.push(
      { he: "WhatsApp = ערוץ המכירות #1 בישראל. כל ליד → WhatsApp תוך 5 דקות", en: "WhatsApp = #1 sales channel in Israel. Every lead → WhatsApp within 5 min" },
      { he: "הוסף countdown timer לעגלה — urgency אמיתי", en: "Add countdown timer to cart — real urgency" },
    );
  }

  return tips;
}

// ═══════════════════════════════════════════════
// MOAT 1: Neuro-Closing Frameworks
// ═══════════════════════════════════════════════

export type NeuroVector = "cortisol" | "oxytocin" | "dopamine";

export interface NeuroClosingFramework {
  name: { he: string; en: string };
  vector: NeuroVector;
  vectorLabel: { he: string; en: string };
  psychology: { he: string; en: string };
  script: { he: string; en: string };
  bestFor: { he: string; en: string };
  emoji: string;
}

export function getNeuroClosingFrameworks(
  salesType: SalesPipelineResult["salesType"],
  audienceType: string
): NeuroClosingFramework[] {
  const frameworks: NeuroClosingFramework[] = [
    {
      name: { he: "סגירה הנחתית (Assumptive)", en: "Assumptive Close" },
      vector: "dopamine", vectorLabel: { he: "דופמין — עקביות", en: "Dopamine — Consistency" },
      psychology: { he: "עיקרון העקביות של צ'יאלדיני: אנשים פועלים בהתאם להתחייבויות קודמות", en: "Cialdini's consistency principle: people act in line with prior commitments" },
      script: { he: "\"מצוין, אז מתי נוח לך להתחיל — ראשון או שלישי?\" (לא 'אם', אלא 'מתי')", en: "\"Great, so when works for you to start — Monday or Wednesday?\" (not 'if', but 'when')" },
      bestFor: { he: "לקוחות שכבר אמרו 'כן' למספר שאלות קטנות", en: "Clients who already said 'yes' to several small questions" },
      emoji: "🧠",
    },
    {
      name: { he: "סגירת Tripwire (מדרגות)", en: "Tripwire Close" },
      vector: "cortisol", vectorLabel: { he: "קורטיזול → אוקסיטוצין", en: "Cortisol → Oxytocin" },
      psychology: { he: "מחסום כניסה נמוך יוצר מחויבות. הקורטיזול (פחד להפסיד מבצע) → אוקסיטוצין (הקלה אחרי רכישה)", en: "Low barrier creates commitment. Cortisol (fear of missing deal) → Oxytocin (relief after purchase)" },
      script: { he: "\"לפני שמתחילים עם הפתרון המלא — יש אפשרות לנסות X ב-₪49 בלבד. ללא התחייבות.\"", en: "\"Before the full solution — you can try X for just ₪49. No commitment.\"" },
      bestFor: { he: "מוצרים עם עלות גבוהה, לקוחות מהססים", en: "High-cost products, hesitant buyers" },
      emoji: "🪜",
    },
    {
      name: { he: "סגירה ייעוצית (שותפות)", en: "Consultative Close" },
      vector: "oxytocin", vectorLabel: { he: "אוקסיטוצין — אמון", en: "Oxytocin — Trust" },
      psychology: { he: "מצב של 'אנחנו ביחד'. אוקסיטוצין משתחרר כשמרגישים שותפות אמיתית — מפחית התנגדות", en: "A 'we're in this together' state. Oxytocin releases with genuine partnership — reduces resistance" },
      script: { he: "\"בוא נבנה את זה ביחד. מה הכי חשוב לך — X או Y? אני אתאים את הפתרון בדיוק לזה.\"", en: "\"Let's build this together. What matters most to you — X or Y? I'll tailor the solution exactly to that.\"" },
      bestFor: { he: "B2B, שירותים, ייעוץ, לקוחות אנליטיים", en: "B2B, services, consulting, analytical buyers" },
      emoji: "🤝",
    },
    {
      name: { he: "סגירת הוכחה (Data-Driven)", en: "Proof Close" },
      vector: "dopamine", vectorLabel: { he: "דופמין — ביטחון", en: "Dopamine — Certainty" },
      psychology: { he: "System 2 (חשיבה אנליטית). דופמין משתחרר כשמוצאים תשובה ברורה — 'הנה ההוכחה'", en: "System 2 (analytical thinking). Dopamine releases when finding a clear answer — 'here's the proof'" },
      script: { he: "\"הנה 3 לקוחות בדיוק בגודל שלך: A הגדיל ב-40%, B חסך ₪X, C סגר ב-Y ימים. הנתונים מדברים.\"", en: "\"Here are 3 clients your exact size: A grew 40%, B saved ₪X, C closed in Y days. The data speaks.\"" },
      bestFor: { he: "מהנדסים, CFOs, לקוחות שאוהבים מספרים", en: "Engineers, CFOs, data-driven buyers" },
      emoji: "📊",
    },
    {
      name: { he: "סגירת הפניה (Network)", en: "Referral Close" },
      vector: "oxytocin", vectorLabel: { he: "אוקסיטוצין — זהות חברתית", en: "Oxytocin — Social Identity" },
      psychology: { he: "הזהות החברתית — אנשים רוצים להיות חלק מקבוצה. אוקסיטוצין = belonging", en: "Social identity — people want to belong. Oxytocin = belonging" },
      script: { he: "\"אגב, מי שהפנה אותך — [שם] — הוא אחד הלקוחות הכי מרוצים שלנו. הוא אמר שזה בדיוק מה שאתה צריך.\"", en: "\"By the way, [name] who referred you is one of our happiest clients. They said this is exactly what you need.\"" },
      bestFor: { he: "כשיש referral, קהילות, B2B ישראלי (הכל דרך קשרים)", en: "When there's a referral, communities, Israeli B2B (everything through connections)" },
      emoji: "🔗",
    },
  ];

  // Enterprise gets an extra framework
  if (salesType === "enterprise") {
    frameworks.push({
      name: { he: "סגירת Champion (הפנימי)", en: "Champion Close" },
      vector: "oxytocin", vectorLabel: { he: "אוקסיטוצין — מנטור", en: "Oxytocin — Mentorship" },
      psychology: { he: "ה-Champion הפנימי מרגיש 'בעלות' על הפרויקט. תן לו להיות הגיבור — הוא ימכור בפנים", en: "The internal Champion feels 'ownership' of the project. Let them be the hero — they'll sell internally" },
      script: { he: "\"אני רוצה שתצליח עם זה בפנים. הנה one-pager שתוכל להראות ל-CFO — עם ROI מחושב.\"", en: "\"I want you to succeed with this internally. Here's a one-pager for the CFO — with calculated ROI.\"" },
      bestFor: { he: "Enterprise, מכירות מרובות-משתתפים", en: "Enterprise, multi-stakeholder sales" },
      emoji: "🏆",
    });
  }

  return frameworks;
}

// ═══════════════════════════════════════════════
// MOAT 9: Buyer Personality Types (DISC-Inspired)
// ═══════════════════════════════════════════════

export type BuyerPersonality = "analytical" | "driver" | "amiable" | "expressive";

export interface PersonalityProfile {
  id: BuyerPersonality;
  name: { he: string; en: string };
  emoji: string;
  traits: { he: string; en: string };
  sellTo: { he: string; en: string };
  avoid: { he: string; en: string };
}

export const BUYER_PERSONALITIES: PersonalityProfile[] = [
  {
    id: "analytical", name: { he: "אנליטי", en: "Analytical" }, emoji: "🔬",
    traits: { he: "אוהב מספרים, שואל הרבה שאלות, צריך זמן לחשוב", en: "Loves data, asks many questions, needs time to think" },
    sellTo: { he: "הראה ROI מדויק, השווה אלטרנטיבות, תן מסמכים מפורטים", en: "Show exact ROI, compare alternatives, provide detailed documents" },
    avoid: { he: "לא ללחוץ על זמן, לא להגזים בהבטחות", en: "Don't pressure on time, don't over-promise" },
  },
  {
    id: "driver", name: { he: "מוביל", en: "Driver" }, emoji: "🎯",
    traits: { he: "ישיר, חסר סבלנות, רוצה תוצאות, ממוקד בשורה תחתונה", en: "Direct, impatient, wants results, bottom-line focused" },
    sellTo: { he: "תמצת — 3 נקודות מפתח. הראה תוצאות מהירות. תן שליטה", en: "Be concise — 3 key points. Show quick results. Give control" },
    avoid: { he: "לא לפטפט, לא להסביר מדי, לא להיות אגרסיבי מדי", en: "Don't ramble, don't over-explain, don't be too pushy" },
  },
  {
    id: "amiable", name: { he: "חברותי", en: "Amiable" }, emoji: "💚",
    traits: { he: "ערכי, מקשיב, נאמן, חושש מסיכון, צריך אמון", en: "Values-driven, good listener, loyal, risk-averse, needs trust" },
    sellTo: { he: "בנה יחסים לפני מכירה. הראה עדויות. הבטח תמיכה אחרי רכישה", en: "Build relationship before selling. Show testimonials. Promise post-purchase support" },
    avoid: { he: "לא ללחוץ, לא להיות שטחי, לא לזלזל בחששות", en: "Don't pressure, don't be superficial, don't dismiss concerns" },
  },
  {
    id: "expressive", name: { he: "אקספרסיבי", en: "Expressive" }, emoji: "🌟",
    traits: { he: "חזון, השראה, רוצה להיות ראשון, אוהב סיפורים", en: "Visionary, inspirational, wants to be first, loves stories" },
    sellTo: { he: "צייר חזון עתידי. הראה איך יהיה 'הראשון'. ספר סיפורי הצלחה מרגשים", en: "Paint a future vision. Show how they'll be 'first'. Tell inspiring success stories" },
    avoid: { he: "לא להיות יבש מדי, לא רק מספרים — צריך רגש", en: "Don't be too dry, not just numbers — needs emotion" },
  },
];

export function detectBuyerPersonality(audienceType: string, businessField: string): BuyerPersonality {
  // B2B tech/finance → Analytical
  if (audienceType === "b2b" && (businessField === "tech" || businessField === "realEstate")) return "analytical";
  // B2B services → Amiable
  if (audienceType === "b2b" && (businessField === "services" || businessField === "health")) return "amiable";
  // Personal brand / education → Expressive
  if (businessField === "personalBrand" || businessField === "education") return "expressive";
  // Default → Driver
  return "driver";
}

// ═══════════════════════════════════════════════
// Main Generator
// ═══════════════════════════════════════════════

export function generateSalesPipeline(result: FunnelResult, graph?: UserKnowledgeGraph): SalesPipelineResult {
  const formData = result.formData;
  const salesType = detectSalesType(formData);
  const config = PIPELINE_CONFIGS[salesType];

  const avgDealSize = formData.averagePrice || 500;
  const budgetMultiplier = formData.budgetRange === "veryHigh" ? 4 : formData.budgetRange === "high" ? 2.5 : formData.budgetRange === "medium" ? 1.5 : 1;
  const monthlyLeads = Math.round(20 * budgetMultiplier);
  const monthlyDeals = Math.round(monthlyLeads * config.winRate);

  return {
    stages: config.stages,
    forecast: {
      monthlyDeals,
      avgDealSize,
      pipelineValue: monthlyLeads * avgDealSize,
      expectedRevenue: monthlyDeals * avgDealSize,
      cycleLength: config.cycleDays,
      winRate: config.winRate,
    },
    objectionScripts: getObjectionScripts(salesType, graph),
    automations: getSalesAutomations(salesType),
    salesType,
    closingTips: getClosingTips(salesType, graph),
  };
}

export function getSalesTypeLabel(salesType: SalesPipelineResult["salesType"]): { he: string; en: string } {
  const labels: Record<string, { he: string; en: string }> = {
    transactional: { he: "מכירה טרנזקציונית (B2C / E-commerce)", en: "Transactional Sales (B2C / E-commerce)" },
    consultative: { he: "מכירה ייעוצית (B2B / שירותים)", en: "Consultative Sales (B2B / Services)" },
    enterprise: { he: "מכירה ארגונית (Enterprise)", en: "Enterprise Sales" },
  };
  return labels[salesType];
}
