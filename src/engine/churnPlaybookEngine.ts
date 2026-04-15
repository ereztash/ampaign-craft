// ═══════════════════════════════════════════════
// Churn Prevention Playbook Engine
// Cross-domain: Churn Prediction × Behavioral Psychology × Retention Growth
// Produces a time-boxed, week-by-week action playbook
// ═══════════════════════════════════════════════

import { FormData } from "@/types/funnel";
import { UserKnowledgeGraph } from "./userKnowledgeGraph";
import { assessChurnRisk, ChurnRiskAssessment } from "./churnPredictionEngine";

export const ENGINE_MANIFEST = {
  name: "churnPlaybookEngine",
  reads: ["USER-form-*", "USER-knowledgeGraph-*", "USER-churn-*"],
  writes: ["USER-churnPlaybook-*"],
  stage: "deploy",
  isLive: true,
  parameters: ["Churn playbook"],
} as const;

// ═══ TYPES ═══

import type { BilingualText } from "@/types/i18n";
export type { BilingualText };

export type RiskTier = "healthy" | "watch" | "at-risk" | "critical";

export interface WeeklyAction {
  week: 1 | 2 | 3 | 4;
  weekLabel: BilingualText;
  focus: BilingualText;
  actions: BilingualText[];
  channel: string;
  kpi: BilingualText;
  template: BilingualText;
}

export interface NudgeEvent {
  triggerDays: number; // days since last activity
  channel: string;
  message: BilingualText;
  goal: BilingualText;
}

export interface LeadingIndicator {
  name: BilingualText;
  threshold: string;
  interpretation: BilingualText;
  checkFrequency: "daily" | "weekly" | "monthly";
}

export interface Phase {
  label: BilingualText;
  timeframe: string;
  objective: BilingualText;
  keyActions: BilingualText[];
}

export interface ChurnPlaybook {
  riskTier: RiskTier;
  riskScore: number;
  riskTierLabel: BilingualText;
  nrrBaseline: number;
  nrrTarget: number;
  weeklyActions: WeeklyAction[];
  nudgeSchedule: NudgeEvent[];
  leadingIndicators: LeadingIndicator[];
  phase6090: [Phase, Phase]; // 60-day and 90-day milestones
  quickWin: BilingualText;
}

// ═══ TIER LABELS ═══

const TIER_LABELS: Record<RiskTier, BilingualText> = {
  healthy: { he: "בריא", en: "Healthy" },
  watch: { he: "במעקב", en: "Watch" },
  "at-risk": { he: "בסיכון", en: "At Risk" },
  critical: { he: "קריטי", en: "Critical" },
};

// ═══ WEEKLY ACTIONS ═══

function buildWeeklyActions(
  churn: ChurnRiskAssessment,
  formData: FormData,
  ukg: UserKnowledgeGraph,
): WeeklyAction[] {
  const isSubscription = formData.salesModel === "subscription";
  const isB2B = formData.audienceType === "b2b";
  const isHighRisk = churn.riskScore >= 60;

  return [
    {
      week: 1,
      weekLabel: { he: "שבוע 1 — אבחון ומיפוי", en: "Week 1 — Diagnose & Map" },
      focus: { he: "זהה את הלקוחות בסיכון הגבוה ביותר", en: "Identify your highest-risk customers" },
      actions: [
        { he: "ייצא רשימת לקוחות ומיין לפי תאריך פעילות אחרון", en: "Export customer list, sort by last activity date" },
        { he: "סמן לקוחות שלא פתחו/השתמשו 14+ יום", en: "Flag customers inactive 14+ days" },
        { he: "בנה 3 קבוצות: פעילים / מתרחקים / שותקים", en: "Create 3 groups: Active / Disengaging / Silent" },
      ],
      channel: isB2B ? "CRM" : "email",
      kpi: { he: "רשימת פלחים ממוינת ומתויגת", en: "Segmented and tagged customer list" },
      template: {
        he: isB2B
          ? "שלום [שם], שמנו לב שלא דיברנו מזה [X] ימים. האם הכל בסדר? יש לנו כמה עדכונים שרצינו לשתף."
          : "היי [שם]! שמנו לב שלא ראינו אותך זמן מה. יש לנו משהו שיכול לעניין אותך — [תוכן]",
        en: isB2B
          ? "Hi [Name], we noticed we haven't spoken in [X] days. Is everything okay? We have some updates to share."
          : "Hey [Name]! We noticed you haven't been around lately. We have something that might interest you — [content]",
      },
    },
    {
      week: 2,
      weekLabel: { he: "שבוע 2 — התערבות ראשונה", en: "Week 2 — First Intervention" },
      focus: { he: "שלח קמפיין win-back ממוקד לקבוצת 'מתרחקים'", en: "Send targeted win-back campaign to 'Disengaging' group" },
      actions: [
        { he: "שלח הודעה אישית עם שאלת 'מה השתנה'", en: "Send personal message with 'what changed' question" },
        isHighRisk
          ? { he: "הצע שיחת feedback (15 דק׳) בתמריץ קטן", en: "Offer feedback call (15 min) with small incentive" }
          : { he: "שלח תזכורת ערך — הדגש את השיפור שהם השיגו", en: "Send value reminder — highlight improvement they achieved" },
        { he: "הכן תשובות לשלוש ההתנגדויות הנפוצות", en: "Prepare responses to three common objections" },
      ],
      channel: isB2B ? "email + phone" : isSubscription ? "email + push" : "whatsapp",
      kpi: { he: "שיעור פתיחה >35% / תגובה >10%", en: "Open rate >35% / Response rate >10%" },
      template: {
        he: `[שם], שמנו לב שלא שמענו ממך. מה הדבר שהיה הכי שימושי בשבילך כשהתחלנו? רוצים לוודא שאנחנו ממשיכים לספק ערך.`,
        en: `[Name], we noticed we haven't heard from you. What was most useful for you when we started? We want to make sure we keep delivering value.`,
      },
    },
    {
      week: 3,
      weekLabel: { he: "שבוע 3 — הצעת שימור", en: "Week 3 — Retention Offer" },
      focus: { he: "הצע תמריץ שימור לקבוצת הסיכון הגבוה", en: "Make a retention offer to the high-risk group" },
      actions: [
        { he: "בנה הצעת שימור: 20% הנחה / חודש חינם / שדרוג", en: "Build retention offer: 20% discount / free month / upgrade" },
        { he: "שלח הודעה אישית (לא blast) — מנהל חשבון לפחות לB2B", en: "Send personal message (not blast) — account manager minimum for B2B" },
        { he: "הגדר deadline לתגובה (48-72 שעות)", en: "Set a response deadline (48-72 hours)" },
      ],
      channel: isB2B ? "phone + email" : "email",
      kpi: { he: "שיעור שימור מקבוצת סיכון: >40%", en: "Retention rate from risk group: >40%" },
      template: {
        he: `[שם], אנחנו מעריכים אותך כלקוח ורוצים להמשיך לעבוד יחד. לכן אנחנו מציעים לך [הצעה] — בתוקף ל-72 שעות. מה דעתך?`,
        en: `[Name], we value you as a customer and want to continue working together. That's why we're offering you [offer] — valid for 72 hours. What do you think?`,
      },
    },
    {
      week: 4,
      weekLabel: { he: "שבוע 4 — ניתוח ואופטימיזציה", en: "Week 4 — Analysis & Optimize" },
      focus: { he: "מדוד, למד, חזור", en: "Measure, learn, iterate" },
      actions: [
        { he: "חשב NRR בפועל לעומת יעד", en: "Calculate actual NRR vs. target" },
        { he: "ראיין 2-3 לקוחות שנשארו — למה הם נשארו?", en: "Interview 2-3 retained customers — why did they stay?" },
        { he: "ראיין לקוח אחד שעזב — מה ניתן היה לשפר?", en: "Interview 1 churned customer — what could have been improved?" },
        { he: "עדכן תסריטי שיחה בהתאם לתובנות", en: "Update call scripts based on insights" },
      ],
      channel: "zoom + survey",
      kpi: { he: "3+ תובנות ניתנות לפעולה מראיונות", en: "3+ actionable insights from interviews" },
      template: {
        he: `[שם], תודה שנשאר/ת איתנו! כחלק מהשיפור השוטף, נשמח לשמוע ממך. האם יש לך 10 דקות לשיחה קצרה? [לינק לתיאום]`,
        en: `[Name], thanks for staying with us! As part of our ongoing improvement, we'd love to hear from you. Do you have 10 minutes for a quick call? [scheduling link]`,
      },
    },
  ];
}

// ═══ NUDGE SCHEDULE ═══

function buildNudgeSchedule(formData: FormData): NudgeEvent[] {
  const isSubscription = formData.salesModel === "subscription";
  const isB2B = formData.audienceType === "b2b";

  return [
    {
      triggerDays: 3,
      channel: isB2B ? "email" : "push",
      message: {
        he: "שלח 'tip of the week' — ערך ללא מכירה",
        en: "Send 'tip of the week' — value without selling",
      },
      goal: { he: "שמור על engagement", en: "Maintain engagement" },
    },
    {
      triggerDays: 7,
      channel: "email",
      message: {
        he: isSubscription
          ? "שלח דוח שימוש שבועי עם הישגים (gamification)"
          : "שלח תוכן רלוונטי לתחום שלהם",
        en: isSubscription
          ? "Send weekly usage report with achievements (gamification)"
          : "Send relevant content for their industry",
      },
      goal: { he: "הוכח ערך מתמשך", en: "Prove ongoing value" },
    },
    {
      triggerDays: 14,
      channel: isB2B ? "email + phone" : "whatsapp",
      message: {
        he: "check-in אישי: 'מה השתנה? איך אנחנו יכולים לעזור?'",
        en: "Personal check-in: 'what changed? how can we help?'",
      },
      goal: { he: "זהה סיכון מוקדם", en: "Identify risk early" },
    },
    {
      triggerDays: 30,
      channel: "email",
      message: {
        he: "שלח review request: 'עזור לנו לשפר'",
        en: "Send review request: 'help us improve'",
      },
      goal: { he: "אסוף feedback + חזק מחויבות", en: "Collect feedback + reinforce commitment" },
    },
    {
      triggerDays: 60,
      channel: isB2B ? "email + meeting" : "email",
      message: {
        he: isSubscription
          ? "הצע שדרוג / חידוש שנתי עם הנחה"
          : "הצע רכישה נוספת / cross-sell רלוונטי",
        en: isSubscription
          ? "Offer upgrade / annual renewal with discount"
          : "Offer additional purchase / relevant cross-sell",
      },
      goal: { he: "הגדל LTV", en: "Increase LTV" },
    },
  ];
}

// ═══ LEADING INDICATORS ═══

function buildLeadingIndicators(formData: FormData): LeadingIndicator[] {
  const indicators: LeadingIndicator[] = [
    {
      name: { he: "שיעור פתיחת אימייל", en: "Email open rate" },
      threshold: "<25%",
      interpretation: {
        he: "אם נפל מ-25% — לקוחות מאבדים עניין. בדוק subject lines ועיתוי שליחה.",
        en: "If drops below 25% — customers losing interest. Check subject lines and send timing.",
      },
      checkFrequency: "weekly",
    },
    {
      name: { he: "ימי חוסר פעילות ממוצעים", en: "Average inactivity days" },
      threshold: ">14 days",
      interpretation: {
        he: "מעל 14 יום ללא כניסה/פעילות = סיכון נטישה. הפעל nudge אוטומטי.",
        en: "Over 14 days without login/activity = churn risk. Activate automated nudge.",
      },
      checkFrequency: "weekly",
    },
    {
      name: { he: "NPS (Net Promoter Score)", en: "NPS (Net Promoter Score)" },
      threshold: "<40",
      interpretation: {
        he: "NPS מתחת ל-40 = לקוחות לא ימליצו. בצע ראיונות detractor מיד.",
        en: "NPS below 40 = customers won't recommend. Conduct detractor interviews immediately.",
      },
      checkFrequency: "monthly",
    },
  ];

  if (formData.salesModel === "subscription") {
    indicators.push({
      name: { he: "MRR Churn Rate", en: "MRR Churn Rate" },
      threshold: ">5%/month",
      interpretation: {
        he: "MRR Churn מעל 5% לחודש = אי-אפשר לצמוח. NRR יורד מ-100%. פנה לאמצעי חרום.",
        en: "MRR Churn over 5%/month = impossible to grow. NRR drops below 100%. Activate emergency measures.",
      },
      checkFrequency: "monthly",
    });
  }

  if (formData.audienceType === "b2b") {
    indicators.push({
      name: { he: "ציון בריאות חשבון (Account Health)", en: "Account Health Score" },
      threshold: "<50/100",
      interpretation: {
        he: "חשבון עם ציון בריאות נמוך = בסיכון לאי-חידוש. הפעל QBR (Quarterly Business Review).",
        en: "Account with low health score = renewal risk. Activate QBR (Quarterly Business Review).",
      },
      checkFrequency: "monthly",
    });
  }

  return indicators;
}

// ═══ 60/90 DAY PHASES ═══

function build6090Phases(churn: ChurnRiskAssessment, ukg: UserKnowledgeGraph): [Phase, Phase] {
  const nrrTarget = churn.nrrProjection.withIntervention;

  const phase60: Phase = {
    label: { he: "שלב 1 — 60 יום: הכלה", en: "Phase 1 — 60 Days: Contain" },
    timeframe: "Days 1-60",
    objective: {
      he: `עצור את הנטישה. יעד: NRR לפחות ${Math.round((churn.nrrProjection.current + nrrTarget) / 2)}%`,
      en: `Stop the bleed. Target: NRR at least ${Math.round((churn.nrrProjection.current + nrrTarget) / 2)}%`,
    },
    keyActions: [
      { he: "הפעל 4 שבועות תוכנית win-back (ראה לעיל)", en: "Execute 4-week win-back plan (see above)" },
      { he: "הגדר KPI שבועי ותעקוב אחרי churn בזמן אמת", en: "Set weekly KPI and track churn in real-time" },
      {
        he: `הפעל nudge אוטומטי ב-3/7/14 יום חוסר פעילות`,
        en: `Activate automated nudge at 3/7/14 days inactivity`,
      },
    ],
  };

  const phase90: Phase = {
    label: { he: "שלב 2 — 90 יום: צמיחה", en: "Phase 2 — 90 Days: Grow" },
    timeframe: "Days 61-90",
    objective: {
      he: `צמח מעבר לבסיס. יעד: NRR ${nrrTarget}%+, LTV גדל ב-${ukg.business.salesModel === "subscription" ? "20" : "15"}%`,
      en: `Grow beyond baseline. Target: NRR ${nrrTarget}%+, LTV increases by ${ukg.business.salesModel === "subscription" ? "20" : "15"}%`,
    },
    keyActions: [
      { he: "הפעל upsell/cross-sell לפלח הלקוחות הפעילים", en: "Activate upsell/cross-sell to active customer segment" },
      { he: "בנה תוכנית referral מבוססת על בסיס הלקוחות הקיים", en: "Build referral program based on existing customer base" },
      { he: "הפעל סקר NPS + ראיונות עם detractors", en: "Run NPS survey + interviews with detractors" },
    ],
  };

  return [phase60, phase90];
}

// ═══ QUICK WIN ═══

function buildQuickWin(churn: ChurnRiskAssessment, formData: FormData): BilingualText {
  if (churn.riskScore >= 70) {
    return {
      he: "שלח היום הודעת WhatsApp/SMS אישית ל-10 לקוחות בסיכון הגבוה ביותר — שאל 'מה הדבר הבא שאנחנו יכולים לעשות בשבילך?'",
      en: "Send a personal WhatsApp/SMS today to your 10 highest-risk customers — ask 'what's the next thing we can do for you?'",
    };
  }
  if (formData.salesModel === "subscription") {
    return {
      he: "הגדר היום email automation לכל לקוח שלא נכנס 7 ימים — שלח 'tip' קצר עם ערך מיידי",
      en: "Set up today an email automation for any customer inactive 7 days — send a short 'tip' with immediate value",
    };
  }
  return {
    he: "שלח ניוזלטר ב-subject line אישי ('שם, זה בשבילך בלבד') לרשימה שלא קנתה 60+ יום",
    en: "Send a newsletter with a personal subject line ('Name, this is for you only') to list inactive 60+ days",
  };
}

// ═══ MAIN EXPORT ═══

export function buildChurnPlaybook(
  formData: FormData,
  ukg: UserKnowledgeGraph,
  churnRisk?: ChurnRiskAssessment,
): ChurnPlaybook {
  const churn = churnRisk ?? assessChurnRisk(formData);

  return {
    riskTier: churn.riskTier,
    riskScore: churn.riskScore,
    riskTierLabel: TIER_LABELS[churn.riskTier],
    nrrBaseline: churn.nrrProjection.current,
    nrrTarget: churn.nrrProjection.withIntervention,
    weeklyActions: buildWeeklyActions(churn, formData, ukg),
    nudgeSchedule: buildNudgeSchedule(formData),
    leadingIndicators: buildLeadingIndicators(formData),
    phase6090: build6090Phases(churn, ukg),
    quickWin: buildQuickWin(churn, formData),
  };
}
