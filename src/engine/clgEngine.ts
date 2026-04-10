// ═══════════════════════════════════════════════
// CLG (Community-Led Growth) Engine
// Cross-domain: Network Effects × Game Design × SaaS Metrics
// ═══════════════════════════════════════════════

import { FormData } from "@/types/funnel";
import {
  writeContext,
  conceptKey,
  type BlackboardWriteContext,
} from "./blackboard/contract";

export const ENGINE_MANIFEST = {
  name: "clgEngine",
  reads: ["USER-form-*"],
  writes: ["USER-clg-*"],
  stage: "design",
  isLive: true,
  parameters: ["CLG modeling"],
} as const;

export interface CLGResult {
  suitable: boolean;
  suitabilityScore: number; // 0-100
  reason: { he: string; en: string };
  platform: { he: string; en: string };
  roadmap: CLGWeek[];
  metrics: CLGMetric[];
  ltvImpact: { current: number; projected: number; multiplier: number };
}

export interface CLGWeek {
  week: number;
  title: { he: string; en: string };
  actions: { he: string; en: string }[];
  milestone: { he: string; en: string };
}

export interface CLGMetric {
  name: { he: string; en: string };
  target: string;
  emoji: string;
}

export function generateCLGStrategy(
  formData: FormData,
  blackboardCtx?: BlackboardWriteContext,
): CLGResult {
  const score = calculateSuitability(formData);
  const suitable = score >= 40;
  const avgPrice = formData.averagePrice || 500;

  const result: CLGResult = {
    suitable,
    suitabilityScore: score,
    reason: suitable
      ? { he: "המודל שלך מתאים ל-CLG — יש בסיס ליצירת קהילה שמניעה צמיחה", en: "Your model is CLG-suitable — there's a foundation for community-driven growth" }
      : { he: "CLG פחות מתאים כרגע — שקול מודל אחר (PLG/SLG)", en: "CLG is less suitable now — consider another model (PLG/SLG)" },
    platform: getPlatform(formData),
    roadmap: generateRoadmap(formData),
    metrics: [
      { name: { he: "MAU קהילה", en: "Community MAU" }, target: "15-30%", emoji: "👥" },
      { name: { he: "שיעור הפניות", en: "Referral Rate" }, target: "10-25%", emoji: "🔗" },
      { name: { he: "NPS קהילה", en: "Community NPS" }, target: "50+", emoji: "⭐" },
      { name: { he: "זמן עד ערך", en: "Time to Value" }, target: "<7 days", emoji: "⏱️" },
      { name: { he: "שיעור שימור", en: "Retention Rate" }, target: "80%+", emoji: "🔄" },
    ],
    ltvImpact: {
      current: avgPrice * 3,
      projected: avgPrice * 3 * (score >= 60 ? 3.5 : score >= 40 ? 2.2 : 1.3),
      multiplier: score >= 60 ? 3.5 : score >= 40 ? 2.2 : 1.3,
    },
  };

  if (blackboardCtx) {
    void writeContext({
      userId: blackboardCtx.userId,
      planId: blackboardCtx.planId,
      key: conceptKey("USER", "clg", blackboardCtx.planId ?? blackboardCtx.userId),
      stage: "design",
      payload: {
        suitable: result.suitable,
        suitabilityScore: result.suitabilityScore,
        ltvMultiplier: result.ltvImpact.multiplier,
      },
      writtenBy: ENGINE_MANIFEST.name,
    }).catch(() => {});
  }

  return result;
}

function calculateSuitability(formData: FormData): number {
  let score = 0;
  if (formData.salesModel === "subscription") score += 30;
  if (formData.salesModel === "leads") score += 15;
  if (formData.audienceType === "b2b") score += 20;
  if (formData.audienceType === "both") score += 10;
  if (["education", "tech", "personalBrand", "health"].includes(formData.businessField || "")) score += 20;
  if (["services", "food"].includes(formData.businessField || "")) score += 10;
  if (formData.experienceLevel === "advanced") score += 10;
  if (formData.experienceLevel === "intermediate") score += 5;
  return Math.min(score, 100);
}

function getPlatform(formData: FormData): { he: string; en: string } {
  if (formData.audienceType === "b2b") return { he: "LinkedIn Group + Slack/Discord פרטי", en: "LinkedIn Group + Private Slack/Discord" };
  if (formData.businessField === "education") return { he: "קבוצת WhatsApp / Facebook Group סגורה", en: "WhatsApp Group / Closed Facebook Group" };
  if (formData.businessField === "personalBrand") return { he: "Telegram Channel + קבוצת WhatsApp VIP", en: "Telegram Channel + VIP WhatsApp Group" };
  return { he: "Facebook Group + ניוזלטר שבועי", en: "Facebook Group + Weekly Newsletter" };
}

function generateRoadmap(formData: FormData): CLGWeek[] {
  return [
    { week: 1, title: { he: "בנה את הבסיס", en: "Build the Foundation" },
      actions: [
        { he: "פתח קבוצה + כתוב 'מניפסט' (למה קיימים, מה הערך)", en: "Open group + write 'manifesto' (why we exist, what's the value)" },
        { he: "הזמן 20-30 לקוחות קיימים / עוקבים מעורבים", en: "Invite 20-30 existing clients / engaged followers" },
      ],
      milestone: { he: "30 חברים ראשונים", en: "First 30 members" },
    },
    { week: 4, title: { he: "צור תוכן מייסד", en: "Create Founding Content" },
      actions: [
        { he: "פרסם 3 פוסטים שבועיים: 1 ערך, 1 שאלה, 1 הצלחה של חבר", en: "Post 3x/week: 1 value, 1 question, 1 member success" },
        { he: "הפעל 'שיעור ראשון' — webinar/live בלעדי לקהילה", en: "Run 'first lesson' — exclusive community webinar/live" },
      ],
      milestone: { he: "100 חברים, 20% MAU", en: "100 members, 20% MAU" },
    },
    { week: 8, title: { he: "הפעל Flywheel", en: "Activate Flywheel" },
      actions: [
        { he: "השק תוכנית הפניות: חבר מביא חבר → הטבה לשניהם", en: "Launch referral program: friend brings friend → benefit for both" },
        { he: "הכתר 'מומחי קהילה' — תן תואר לחברים פעילים", en: "Crown 'community experts' — give title to active members" },
      ],
      milestone: { he: "200 חברים, 15% referral rate", en: "200 members, 15% referral rate" },
    },
    { week: 12, title: { he: "Scale + Monetize", en: "Scale + Monetize" },
      actions: [
        { he: "השק תוכן פרימיום / מסלול VIP לחברי קהילה", en: "Launch premium content / VIP track for community members" },
        { he: "מדוד: NPS, retention, LTV vs. לקוחות רגילים", en: "Measure: NPS, retention, LTV vs. non-community customers" },
      ],
      milestone: { he: "500+ חברים, LTV x2-3.5", en: "500+ members, LTV x2-3.5" },
    },
  ];
}
