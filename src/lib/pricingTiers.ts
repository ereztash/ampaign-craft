export type PricingTier = "free" | "pro" | "business";

export interface TierConfig {
  id: PricingTier;
  name: { he: string; en: string };
  price: { he: string; en: string };
  priceMonthly: number; // NIS
  features: { he: string; en: string }[];
  limits: {
    maxFunnels: number;
    aiCoachMessages: number;
    pdfExport: boolean;
    whatsappTemplates: boolean;
    campaignCockpit: boolean;
    templatePublishing: boolean;
    differentiationAgent: boolean;
  };
}

export const TIERS: TierConfig[] = [
  {
    id: "free",
    name: { he: "חינם", en: "Free" },
    price: { he: "₪0", en: "₪0" },
    priceMonthly: 0,
    features: [
      { he: "3 משפכים שיווקיים", en: "3 marketing funnels" },
      { he: "אסטרטגיה + תכנון + תוכן", en: "Strategy + Planning + Content" },
      { he: "ציון בריאות שיווקית", en: "Marketing Health Score" },
      { he: "הישגים ו-Streak", en: "Achievements & Streak" },
    ],
    limits: {
      maxFunnels: 3,
      aiCoachMessages: 0,
      pdfExport: false,
      whatsappTemplates: false,
      campaignCockpit: false,
      templatePublishing: false,
      differentiationAgent: true,
    },
  },
  {
    id: "pro",
    name: { he: "Pro", en: "Pro" },
    price: { he: "₪99/חודש", en: "₪99/month" },
    priceMonthly: 99,
    features: [
      { he: "משפכים ללא הגבלה", en: "Unlimited funnels" },
      { he: "מאמן שיווק AI (50 הודעות/חודש)", en: "AI Marketing Coach (50 msgs/month)" },
      { he: "ייצוא PDF", en: "PDF export" },
      { he: "Marketing Wrapped", en: "Marketing Wrapped" },
      { he: "כ�� הטאבים ללא הגבלה", en: "All tabs unlimited" },
      { he: "סוכן בידול B2B", en: "B2B Differentiation Agent" },
    ],
    limits: {
      maxFunnels: Infinity,
      aiCoachMessages: 50,
      pdfExport: true,
      whatsappTemplates: false,
      campaignCockpit: false,
      templatePublishing: false,
      differentiationAgent: true,
    },
  },
  {
    id: "business",
    name: { he: "Business", en: "Business" },
    price: { he: "₪249/חודש", en: "₪249/month" },
    priceMonthly: 249,
    features: [
      { he: "כל מה שב-Pro +", en: "Everything in Pro +" },
      { he: "תבניות WhatsApp מוכנות", en: "WhatsApp templates" },
      { he: "Campaign Cockpit — מעקב ביצועים", en: "Campaign Cockpit — performance tracking" },
      { he: "פרסום תבניות ב-Marketplace", en: "Template Marketplace publishing" },
      { he: "AI Coach ללא הגבלה", en: "Unlimited AI Coach" },
    ],
    limits: {
      maxFunnels: Infinity,
      aiCoachMessages: Infinity,
      pdfExport: true,
      whatsappTemplates: true,
      campaignCockpit: true,
      templatePublishing: true,
      differentiationAgent: true,
    },
  },
];

export type Feature = keyof TierConfig["limits"];

export function canAccess(tier: PricingTier, feature: Feature): boolean {
  const config = TIERS.find((t) => t.id === tier);
  if (!config) return false;
  const value = config.limits[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

export function getTierConfig(tier: PricingTier): TierConfig {
  return TIERS.find((t) => t.id === tier) || TIERS[0];
}
