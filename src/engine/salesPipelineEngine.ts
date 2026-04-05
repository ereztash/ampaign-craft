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

function getObjectionScripts(salesType: SalesPipelineResult["salesType"]): ObjectionScript[] {
  const scripts: ObjectionScript[] = [
    { objection: { he: "יקר לי", en: "It's too expensive" },
      response: { he: "אני מבין. כמה עולה לך לא לפתור את הבעיה הזו? הלקוחות שלנו חוסכים X תוך חודש ראשון.", en: "I understand. How much does it cost you NOT to solve this? Our clients save X within the first month." },
      technique: "Reframe to cost of inaction", emoji: "💰" },
    { objection: { he: "אני צריך לחשוב על זה", en: "I need to think about it" },
      response: { he: "בהחלט. מה בדיוק היית רוצה לבדוק? אולי אני יכול לעזור עם המידע הנכון.", en: "Absolutely. What specifically would you like to check? Maybe I can help with the right info." },
      technique: "Isolate the real objection", emoji: "🤔" },
    { objection: { he: "ניסיתי משהו דומה ולא עבד", en: "I tried something similar and it didn't work" },
      response: { he: "תגיד לי מה לא עבד — כי זה בדיוק מה שאנחנו עושים אחרת.", en: "Tell me what didn't work — because that's exactly what we do differently." },
      technique: "Differentiate & validate", emoji: "🔄" },
    { objection: { he: "אין לי זמן עכשיו", en: "I don't have time right now" },
      response: { he: "דווקא בגלל זה — הפתרון שלנו חוסך X שעות בשבוע. 15 דקות?", en: "That's exactly why — our solution saves X hours per week. 15 minutes?" },
      technique: "Time as investment", emoji: "⏰" },
  ];

  if (salesType === "enterprise") {
    scripts.push({
      objection: { he: "צריך אישור מההנהלה / Procurement", en: "Need management / Procurement approval" },
      response: { he: "מצוין — בוא נכין ביחד one-pager עם ROI שאתה יכול להעביר.", en: "Great — let's prepare a one-pager with ROI together." },
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

function getClosingTips(salesType: SalesPipelineResult["salesType"]): { he: string; en: string }[] {
  const tips: { he: string; en: string }[] = [
    { he: "חוק 80/20: 80% הקשבה, 20% דיבור. מי ששואל — שולט", en: "80/20 Rule: 80% listening, 20% talking. Whoever asks questions, controls" },
    { he: "Follow-up תוך 5 דקות = סיכוי סגירה x21 גבוה יותר", en: "Follow-up within 5 min = 21x higher close rate" },
    { he: "אל תמכור פיצ'רים — מכור תוצאות. 'תחסוך 10 שעות' > 'יש אוטומציה'", en: "Don't sell features — sell outcomes. 'Save 10 hours' > 'We have automation'" },
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
// Main Generator
// ═══════════════════════════════════════════════

export function generateSalesPipeline(result: FunnelResult): SalesPipelineResult {
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
    objectionScripts: getObjectionScripts(salesType),
    automations: getSalesAutomations(salesType),
    salesType,
    closingTips: getClosingTips(salesType),
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
