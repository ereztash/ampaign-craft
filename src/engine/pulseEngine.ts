/**
 * Weekly Marketing Pulse Engine
 * Generates a weekly summary with score, trends, and micro-actions.
 * Creates habit loop — users return weekly for their "pulse".
 */

import { SavedPlan } from "@/types/funnel";
import { getIndustryBenchmarks } from "@/lib/industryBenchmarks";

export interface PulseAction {
  emoji: string;
  action: { he: string; en: string };
  impact: { he: string; en: string };
}

export interface LossFramedMessage {
  emoji: string;
  message: { he: string; en: string };
  type: "loss" | "endowment" | "ikea";
}

export interface WeeklyPulse {
  weekNumber: number;
  greeting: { he: string; en: string };
  planCount: number;
  latestPlanName: string;
  latestIndustry: string;
  actions: PulseAction[];
  insightOfTheWeek: { he: string; en: string };
  lossFramedMessages: LossFramedMessage[];
}

const WEEKLY_INSIGHTS: { he: string; en: string }[] = [
  { he: "🧠 97% מההחלטות הצרכניות מתקבלות באופן לא מודע. לכן הוקים התנהגותיים עובדים.", en: "🧠 97% of consumer decisions are made unconsciously. That's why behavioral hooks work." },
  { he: "📱 שיעור הפתיחה בוואטסאפ: 98%. באימייל: 20%. שלב וואטסאפ במשפך שלך.", en: "📱 WhatsApp open rate: 98%. Email: 20%. Integrate WhatsApp in your funnel." },
  { he: "🎯 UGC מניב ביצועים טובים ב-93% לעומת תוכן ממותג. בקש מלקוחות לשתף.", en: "🎯 UGC outperforms branded content by 93%. Ask customers to share." },
  { he: "💡 עקרון ההדדיות: תן ערך לפני שאתה מבקש. ליד מגנט טוב ממיר 15-25%.", en: "💡 Reciprocity principle: give value before asking. A good lead magnet converts 15-25%." },
  { he: "⚡ הפחתת חיכוך בתהליך רכישה מעלה המרות ב-35%. בדוק את ה-checkout שלך.", en: "⚡ Reducing friction in checkout increases conversions by 35%. Check your checkout flow." },
  { he: "🔄 קהילה (CLG) מורידה עלות רכישה פי 5 ומעלה LTV פי 3. בנה קהילה סביב המותג.", en: "🔄 Community (CLG) reduces CAC by 5x and increases LTV by 3x. Build a community around your brand." },
  { he: "📊 מספרים היפר-ספציפיים (23.7% ולא \"כמחצית\") עוקפים ספקנות בקופי.", en: "📊 Hyper-specific numbers (23.7% not 'about half') bypass skepticism in copy." },
  { he: "🎭 וידאו קצר (15-30 שניות) הוא הפורמט בעל ההשפעה הגבוהה ביותר ב-2026.", en: "🎭 Short video (15-30 sec) is the highest-impact format in 2026." },
];

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}

function generateActions(latestIndustry: string): PulseAction[] {
  const benchmarks = getIndustryBenchmarks(latestIndustry);
  const actions: PulseAction[] = [];

  actions.push({
    emoji: "📝",
    action: { he: "כתוב פוסט אחד עם הוק מבוסס מדע התנהגותי", en: "Write one post using a behavioral science hook" },
    impact: { he: "עלייה של 25-40% בקליקים", en: "25-40% increase in clicks" },
  });

  actions.push({
    emoji: "📊",
    action: { he: "בדוק את ה-CPC הנוכחי שלך מול הממוצע בענף", en: "Check your current CPC against industry average" },
    impact: {
      he: `ממוצע בענף: ${benchmarks[0]?.value || "₪2-5"}`,
      en: `Industry avg: ${benchmarks[0]?.value || "₪2-5"}`,
    },
  });

  actions.push({
    emoji: "🎯",
    action: { he: "שלח הודעת וואטסאפ אחת ללקוחות קיימים", en: "Send one WhatsApp message to existing customers" },
    impact: { he: "שיעור פתיחה של 98% לעומת 20% באימייל", en: "98% open rate vs 20% for email" },
  });

  return actions;
}

export function generateWeeklyPulse(plans: SavedPlan[]): WeeklyPulse | null {
  if (plans.length === 0) return null;

  const sorted = [...plans].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
  const latest = sorted[0];
  const weekNum = getWeekNumber();
  const insightIndex = weekNum % WEEKLY_INSIGHTS.length;

  // Loss-framed messages (behavioral economics applied to FunnelForge's own UX)
  const lossFramedMessages: LossFramedMessage[] = [];

  // Endowment: remind of invested time
  if (plans.length >= 2) {
    lossFramedMessages.push({
      emoji: "⏱️",
      message: {
        he: `השקעת זמן בבניית ${plans.length} אסטרטגיות — נכס שלא קיים בשום מקום אחר`,
        en: `You've invested time building ${plans.length} strategies — an asset that doesn't exist anywhere else`,
      },
      type: "endowment",
    });
  }

  // Loss aversion: competitors are moving
  lossFramedMessages.push({
    emoji: "⚠️",
    message: {
      he: `מתחרים בתחום שלך כבר מיישמים — כל שבוע בלי פעולה הוא הזדמנות שאובדת`,
      en: `Competitors in your field are already implementing — every week without action is a lost opportunity`,
    },
    type: "loss",
  });

  // IKEA effect: your data is unique
  if (plans.length >= 1) {
    lossFramedMessages.push({
      emoji: "🔒",
      message: {
        he: "האסטרטגיה שלך מותאמת אישית לעסק שלך — לא ניתנת לשחזור בכלי אחר",
        en: "Your strategy is personalized to your business — can't be recreated in another tool",
      },
      type: "ikea",
    });
  }

  return {
    weekNumber: weekNum,
    greeting: {
      he: `הפולס השיווקי שלך — שבוע ${weekNum}`,
      en: `Your Marketing Pulse — Week ${weekNum}`,
    },
    planCount: plans.length,
    latestPlanName: latest.name,
    latestIndustry: latest.result.formData.businessField || "other",
    actions: generateActions(latest.result.formData.businessField || "other"),
    insightOfTheWeek: WEEKLY_INSIGHTS[insightIndex],
    lossFramedMessages,
  };
}
