// ═══════════════════════════════════════════════
// Retention Flywheel Designer
// Cross-domain: Product Strategy × Game Design × Behavioral Economics
// ═══════════════════════════════════════════════

import { FormData } from "@/types/funnel";

export interface FlywheelStep {
  phase: "trigger" | "action" | "reward" | "investment";
  name: { he: string; en: string };
  description: { he: string; en: string };
  channel: string;
  emoji: string;
}

export interface RetentionFlywheel {
  type: "transactional" | "subscription" | "community" | "content";
  typeLabel: { he: string; en: string };
  steps: FlywheelStep[];
  churnReduction: number; // estimated % reduction
  metrics: { name: { he: string; en: string }; target: string; emoji: string }[];
}

export function generateRetentionFlywheel(formData: FormData): RetentionFlywheel {
  const type = detectFlywheelType(formData);
  return FLYWHEEL_CONFIGS[type];
}

function detectFlywheelType(formData: FormData): RetentionFlywheel["type"] {
  if (formData.salesModel === "subscription") return "subscription";
  if (formData.mainGoal === "loyalty" || formData.audienceType === "b2b") return "community";
  if (formData.businessField === "education" || formData.businessField === "personalBrand") return "content";
  return "transactional";
}

const FLYWHEEL_CONFIGS: Record<RetentionFlywheel["type"], RetentionFlywheel> = {
  transactional: {
    type: "transactional", typeLabel: { he: "Flywheel חוזר (E-commerce)", en: "Repeat Purchase Flywheel" },
    churnReduction: 25,
    steps: [
      { phase: "trigger", name: { he: "תזכורת חכמה", en: "Smart Reminder" }, description: { he: "WhatsApp/Email תזכורת מבוססת זמן שימוש ממוצע", en: "WhatsApp/Email reminder based on avg usage time" }, channel: "whatsapp", emoji: "🔔" },
      { phase: "action", name: { he: "רכישה חוזרת", en: "Repeat Purchase" }, description: { he: "הצע reorder עם הנחה 10% + משלוח חינם", en: "Offer reorder with 10% off + free shipping" }, channel: "email", emoji: "🛒" },
      { phase: "reward", name: { he: "נקודות נאמנות", en: "Loyalty Points" }, description: { he: "כל רכישה = נקודות. X נקודות = הנחה/מתנה", en: "Every purchase = points. X points = discount/gift" }, channel: "other", emoji: "⭐" },
      { phase: "investment", name: { he: "ביקורת + הפניה", en: "Review + Referral" }, description: { he: "בקש ביקורת Google + 'הפנה חבר וקבל ₪X'", en: "Request Google review + 'Refer a friend, get ₪X'" }, channel: "email", emoji: "📝" },
    ],
    metrics: [
      { name: { he: "שיעור רכישה חוזרת", en: "Repeat Purchase Rate" }, target: "30-40%", emoji: "🔄" },
      { name: { he: "ערך הזמנה ממוצע", en: "Average Order Value" }, target: "+15%", emoji: "💰" },
      { name: { he: "NPS", en: "NPS" }, target: "50+", emoji: "⭐" },
    ],
  },
  subscription: {
    type: "subscription", typeLabel: { he: "Flywheel מנוי (SaaS/Subscription)", en: "Subscription Flywheel" },
    churnReduction: 35,
    steps: [
      { phase: "trigger", name: { he: "Onboarding מהיר", en: "Quick Onboarding" }, description: { he: "הגע ל-'רגע אהה' תוך 24 שעות — הראה ערך מיידי", en: "Reach 'aha moment' within 24 hours — show immediate value" }, channel: "email", emoji: "🚀" },
      { phase: "action", name: { he: "שימוש שבועי", en: "Weekly Usage" }, description: { he: "שלח digest שבועי + 'המשימה שלך השבוע'", en: "Send weekly digest + 'your task this week'" }, channel: "email", emoji: "📊" },
      { phase: "reward", name: { he: "Milestone Celebration", en: "Milestone Celebration" }, description: { he: "חגוג הישגים: '100 לידים ראשונים!', 'חודש שלישי!'", en: "Celebrate milestones: 'First 100 leads!', '3rd month!'" }, channel: "other", emoji: "🎉" },
      { phase: "investment", name: { he: "Community + Feedback", en: "Community + Feedback" }, description: { he: "הזמן לקהילה + בקש פידבק (IKEA effect — מי שבנה, לא עוזב)", en: "Invite to community + request feedback (IKEA effect — who built, doesn't leave)" }, channel: "whatsapp", emoji: "🤝" },
    ],
    metrics: [
      { name: { he: "Churn חודשי", en: "Monthly Churn" }, target: "<5%", emoji: "📉" },
      { name: { he: "NRR", en: "Net Revenue Retention" }, target: "110%+", emoji: "📈" },
      { name: { he: "DAU/MAU", en: "DAU/MAU" }, target: "30%+", emoji: "👥" },
    ],
  },
  community: {
    type: "community", typeLabel: { he: "Flywheel קהילתי (CLG)", en: "Community Flywheel (CLG)" },
    churnReduction: 40,
    steps: [
      { phase: "trigger", name: { he: "תוכן בלעדי", en: "Exclusive Content" }, description: { he: "שלח תוכן שזמין רק לחברי קהילה — FOMO חיובי", en: "Send content available only to community members — positive FOMO" }, channel: "content", emoji: "🔑" },
      { phase: "action", name: { he: "השתתפות פעילה", en: "Active Participation" }, description: { he: "שאלה שבועית, אתגר, או live session — גרום להם לדבר", en: "Weekly question, challenge, or live session — get them talking" }, channel: "other", emoji: "💬" },
      { phase: "reward", name: { he: "סטטוס + הכרה", en: "Status + Recognition" }, description: { he: "'מומחה החודש', badge, highlight בניוזלטר", en: "'Expert of the month', badge, newsletter highlight" }, channel: "email", emoji: "🏅" },
      { phase: "investment", name: { he: "תרומה לקהילה", en: "Community Contribution" }, description: { he: "הזמן לכתוב, ללמד, לייעץ — IKEA effect + identity lock-in", en: "Invite to write, teach, advise — IKEA effect + identity lock-in" }, channel: "content", emoji: "🧱" },
    ],
    metrics: [
      { name: { he: "MAU קהילה", en: "Community MAU" }, target: "25%+", emoji: "👥" },
      { name: { he: "Referral Rate", en: "Referral Rate" }, target: "15-25%", emoji: "🔗" },
      { name: { he: "LTV Multiplier", en: "LTV Multiplier" }, target: "2.5-3.5x", emoji: "💎" },
    ],
  },
  content: {
    type: "content", typeLabel: { he: "Flywheel תוכן (Creator/Education)", en: "Content Flywheel (Creator/Education)" },
    churnReduction: 30,
    steps: [
      { phase: "trigger", name: { he: "תוכן חדש שבועי", en: "Weekly New Content" }, description: { he: "פרק/שיעור/מדריך חדש כל שבוע — בנה ציפייה", en: "New episode/lesson/guide every week — build anticipation" }, channel: "content", emoji: "📚" },
      { phase: "action", name: { he: "צריכה + יישום", en: "Consume + Apply" }, description: { he: "'שיעורי בית' או אתגר — לא רק לקרוא, לעשות", en: "'Homework' or challenge — don't just read, do" }, channel: "email", emoji: "✍️" },
      { phase: "reward", name: { he: "תעודה / Badge", en: "Certificate / Badge" }, description: { he: "סיום מודול = תעודה שאפשר לשתף בלינקדאין", en: "Complete module = certificate shareable on LinkedIn" }, channel: "linkedIn", emoji: "🎓" },
      { phase: "investment", name: { he: "UGC + עדות", en: "UGC + Testimonial" }, description: { he: "בקש סיפור הצלחה / before-after — הם משקיעים בזהות חדשה", en: "Request success story / before-after — they invest in new identity" }, channel: "other", emoji: "📸" },
    ],
    metrics: [
      { name: { he: "Completion Rate", en: "Completion Rate" }, target: "40-65%", emoji: "✅" },
      { name: { he: "NPS", en: "NPS" }, target: "60+", emoji: "⭐" },
      { name: { he: "Upsell Rate", en: "Upsell Rate" }, target: "20-30%", emoji: "📈" },
    ],
  },
};
