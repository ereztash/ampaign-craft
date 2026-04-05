// ═══════════════════════════════════════════════
// Pricing Intelligence — Embedded Knowledge Base
// Cross-domain: Ariely + Kahneman + Hormozi + ProfitWell + Israeli Market
// ═══════════════════════════════════════════════

import { BilingualText, GuaranteeType } from "@/types/pricing";

// === CHARM PRICE POINTS (Israeli NIS) ===

export const CHARM_PRICES: Record<string, number[]> = {
  micro: [9, 19, 29, 39, 49],
  low: [49, 79, 99, 129, 149, 199],
  mid: [199, 249, 297, 349, 399, 497],
  high: [499, 697, 799, 997, 1497],
  premium: [1997, 2497, 2997, 4997],
  enterprise: [5000, 10000, 15000, 25000],
};

export function applyCharmPricing(price: number, isB2B: boolean): number {
  if (isB2B && price > 1000) return Math.round(price / 500) * 500; // B2B: round thousands
  if (price <= 50) return Math.round(price / 10) * 10 - 1; // 49, 39, 29
  if (price <= 200) return Math.round(price / 50) * 50 - 1; // 99, 149, 199
  if (price <= 1000) return Math.round(price / 100) * 100 - 3; // 297, 497, 797
  return Math.round(price / 1000) * 1000 - 3; // 1997, 2997
}

// === TIER RATIO PATTERNS ===

export interface TierPattern {
  name: string;
  ratios: [number, number, number]; // low:mid:high multipliers from base
  description: BilingualText;
  bestFor: string[];
}

export const TIER_PATTERNS: TierPattern[] = [
  { name: "classic", ratios: [1, 2.5, 6],
    description: { he: "דפוס קלאסי (Monday.com) — ₪49/₪129/₪299", en: "Classic pattern (Monday.com) — ₪49/₪129/₪299" },
    bestFor: ["tech", "services", "education"] },
  { name: "premium", ratios: [1, 3, 8],
    description: { he: "דפוס פרימיום — ₪99/₪299/₪799", en: "Premium pattern — ₪99/₪299/₪799" },
    bestFor: ["personalBrand", "health", "realEstate"] },
  { name: "entry", ratios: [1, 2, 4],
    description: { he: "דפוס כניסה נמוכה — ₪29/₪59/₪119", en: "Low-entry pattern — ₪29/₪59/₪119" },
    bestFor: ["fashion", "food", "tourism"] },
];

// === ISRAELI PRICE SENSITIVITY BY SECTOR ===

export interface PriceSensitivity {
  field: string;
  sensitivity: "very_high" | "high" | "medium" | "medium_low" | "low";
  typicalRange: { he: string; en: string };
  priceband: "micro" | "low" | "mid" | "high" | "premium" | "enterprise";
  notes: BilingualText;
}

export const PRICE_SENSITIVITY: PriceSensitivity[] = [
  { field: "fashion", sensitivity: "high", typicalRange: { he: "₪49-399", en: "₪49-399" }, priceband: "low",
    notes: { he: "תחרות מול שיין/עלי. Charm pricing חיוני. הנחות עונתיות צפויות", en: "Shein/Ali competition. Charm pricing essential. Seasonal discounts expected" } },
  { field: "tech", sensitivity: "medium", typicalRange: { he: "₪500-50K/חודש", en: "₪500-50K/mo" }, priceband: "high",
    notes: { he: "Value-based pricing עובד. ROI חשוב יותר ממחיר מוחלט", en: "Value-based pricing works. ROI matters more than absolute price" } },
  { field: "food", sensitivity: "very_high", typicalRange: { he: "₪30-200", en: "₪30-200" }, priceband: "micro",
    notes: { he: "מרווח 15-25%. קופונים ומבצעים צפויים. נאמנות נמוכה", en: "15-25% margins. Coupons expected. Low loyalty" } },
  { field: "services", sensitivity: "medium", typicalRange: { he: "₪150-5,000", en: "₪150-5,000" }, priceband: "mid",
    notes: { he: "אמון > מחיר. אבל משווים הרבה. חבילות עובדות טוב", en: "Trust > price. But heavy comparison. Packages work well" } },
  { field: "education", sensitivity: "medium", typicalRange: { he: "₪297-4,997", en: "₪297-4,997" }, priceband: "mid",
    notes: { he: "מוכנים לשלם על טרנספורמציה. Charm pricing ב-97 עובד מצוין", en: "Willing to pay for transformation. 97-ending charm works great" } },
  { field: "health", sensitivity: "medium", typicalRange: { he: "₪99-999/חודש", en: "₪99-999/mo" }, priceband: "mid",
    notes: { he: "החלטה רגשית. מנוי חודשי מקובל. social proof חיוני", en: "Emotional decision. Monthly sub accepted. Social proof essential" } },
  { field: "realEstate", sensitivity: "low", typicalRange: { he: "₪5,000-50,000", en: "₪5,000-50,000" }, priceband: "premium",
    notes: { he: "עמלה מבוססת עסקה. ROI ברור. מחיר פחות חשוב מתוצאה", en: "Commission-based. Clear ROI. Price less important than outcome" } },
  { field: "personalBrand", sensitivity: "medium_low", typicalRange: { he: "₪997-14,997", en: "₪997-14,997" }, priceband: "high",
    notes: { he: "רכישת זהות — פחות רגיש למחיר. Offer stacking עובד מצוין", en: "Identity purchase — less price sensitive. Offer stacking works great" } },
  { field: "tourism", sensitivity: "high", typicalRange: { he: "₪200-5,000", en: "₪200-5,000" }, priceband: "mid",
    notes: { he: "עונתיות קיצונית. Dynamic pricing מומלץ. Booking.com benchmark", en: "Extreme seasonality. Dynamic pricing recommended. Booking.com benchmark" } },
  { field: "other", sensitivity: "medium", typicalRange: { he: "₪100-2,000", en: "₪100-2,000" }, priceband: "mid",
    notes: { he: "תלוי בשוק הספציפי", en: "Depends on specific market" } },
];

// === LTV:CAC BENCHMARKS (Israeli) ===

export const LTV_CAC_BENCHMARKS: Record<string, { ratio: number; paybackMonths: number }> = {
  tech: { ratio: 3.2, paybackMonths: 12 },
  fashion: { ratio: 2.1, paybackMonths: 4 },
  food: { ratio: 1.8, paybackMonths: 2 },
  services: { ratio: 6.0, paybackMonths: 3 },
  education: { ratio: 5.5, paybackMonths: 1 },
  health: { ratio: 3.5, paybackMonths: 6 },
  realEstate: { ratio: 8.0, paybackMonths: 1 },
  personalBrand: { ratio: 7.0, paybackMonths: 1 },
  tourism: { ratio: 2.5, paybackMonths: 3 },
  other: { ratio: 3.0, paybackMonths: 6 },
};

// === GUARANTEE TYPES ===

export interface GuaranteeDef {
  type: GuaranteeType;
  label: BilingualText;
  trustScore: number; // 1-10 Israeli market
  bestFor: string[];
  template: BilingualText;
}

export const GUARANTEE_TYPES: GuaranteeDef[] = [
  { type: "unconditional", label: { he: "החזר כספי ללא תנאי", en: "Unconditional Money-Back" },
    trustScore: 8, bestFor: ["fashion", "food", "other"],
    template: { he: "לא מרוצה? החזר מלא תוך 30 יום. ללא שאלות, ללא תנאים.", en: "Not satisfied? Full refund within 30 days. No questions asked." } },
  { type: "conditional", label: { he: "אחריות מותנית בביצוע", en: "Conditional Performance Guarantee" },
    trustScore: 9, bestFor: ["education", "services", "personalBrand", "health"],
    template: { he: "אם תיישם את התוכנית ולא תראה תוצאות תוך 60 יום — החזר מלא. אנחנו שמים skin in the game.", en: "If you implement the plan and don't see results within 60 days — full refund. We put skin in the game." } },
  { type: "performance", label: { he: "אחריות תוצאה", en: "Performance Guarantee" },
    trustScore: 9, bestFor: ["tech", "services", "realEstate"],
    template: { he: "אנחנו מתחייבים ל-X תוצאה תוך Y זמן. לא הגענו? לא משלמים.", en: "We guarantee X result within Y timeframe. Didn't deliver? Don't pay." } },
  { type: "try_before_buy", label: { he: "נסה לפני שאתה קונה", en: "Try Before You Buy" },
    trustScore: 9, bestFor: ["tech", "education"],
    template: { he: "14 יום ניסיון חינם. אין כרטיס אשראי. מתחילים עכשיו.", en: "14-day free trial. No credit card. Start now." } },
];

// === ANNUAL DISCOUNT OPTIMIZATION ===

export const ANNUAL_DISCOUNT = {
  recommended: 17, // 2 months free — sweet spot
  conservativeMin: 10,
  aggressiveMax: 25,
  conversionRate: 0.30, // ~30% choose annual at 17% discount
};

// === OFFER STACK TEMPLATE (Hormozi) ===

export interface OfferBonusTemplate {
  type: "speed" | "ease" | "proof" | "exclusive" | "community";
  name: BilingualText;
  valueMultiplier: number; // of core price
  description: BilingualText;
}

export const OFFER_BONUS_TEMPLATES: OfferBonusTemplate[] = [
  { type: "speed", name: { he: "בונוס מהירות", en: "Speed Bonus" }, valueMultiplier: 0.4,
    description: { he: "קבל תוצאות מהר יותר — מדריך Quick Start שחוסך שבועות", en: "Get results faster — Quick Start guide that saves weeks" } },
  { type: "ease", name: { he: "בונוס קלות", en: "Ease Bonus" }, valueMultiplier: 0.3,
    description: { he: "תבניות מוכנות להעתקה — בלי לחשוב, רק ליישם", en: "Copy-paste templates — don't think, just implement" } },
  { type: "proof", name: { he: "בונוס הוכחה", en: "Proof Bonus" }, valueMultiplier: 0.25,
    description: { he: "3 Case Studies מפורטים מעסקים דומים לשלך", en: "3 detailed Case Studies from businesses like yours" } },
  { type: "exclusive", name: { he: "בונוס בלעדי", en: "Exclusive Bonus" }, valueMultiplier: 0.35,
    description: { he: "גישה ל-Masterclass סגור + Q&A חי", en: "Access to closed Masterclass + live Q&A" } },
  { type: "community", name: { he: "בונוס קהילה", en: "Community Bonus" }, valueMultiplier: 0.2,
    description: { he: "כניסה לקבוצת WhatsApp VIP עם בעלי עסקים כמוך", en: "Entry to VIP WhatsApp group with business owners like you" } },
];

// === WEBER-FECHNER LAW (JND) ===

export function calculateJND(price: number): number {
  if (price <= 50) return price * 0.175;
  if (price <= 200) return price * 0.125;
  if (price <= 500) return price * 0.10;
  if (price <= 2000) return price * 0.065;
  if (price <= 10000) return price * 0.04;
  return price * 0.025;
}

// === PRICE FRAMING TEMPLATES ===

export interface PriceFramingTemplate {
  context: "landing_page" | "sales_call" | "proposal" | "whatsapp" | "email";
  label: BilingualText;
  template: { he: string; en: string };
  principle: string;
}

export const PRICE_FRAMING_TEMPLATES: PriceFramingTemplate[] = [
  { context: "landing_page", label: { he: "דף נחיתה", en: "Landing Page" }, principle: "Anchor + Minimize + CTA",
    template: {
      he: "הערך שתקבל שווה ₪{totalValue}.\nהמחיר שלך: ₪{price} בלבד.\nזה פחות מ-₪{daily} ביום.\n{guarantee}\n[{cta}]",
      en: "The value you get is worth ₪{totalValue}.\nYour price: just ₪{price}.\nThat's less than ₪{daily}/day.\n{guarantee}\n[{cta}]",
    } },
  { context: "sales_call", label: { he: "שיחת מכירה", en: "Sales Call" }, principle: "Diagnose → Prescribe → Price as ROI",
    template: {
      he: "בואו נעשה חשבון קצר.\nאתה מפסיד ₪{monthlyWaste} בחודש בלי {solution}.\nההשקעה ב-{product} היא ₪{price}/חודש.\nזה אומר שהמערכת משלמת את עצמה תוך {paybackDays} ימים.",
      en: "Let's do a quick calculation.\nYou're losing ₪{monthlyWaste}/month without {solution}.\nThe investment in {product} is ₪{price}/month.\nThat means it pays for itself in {paybackDays} days.",
    } },
  { context: "proposal", label: { he: "הצעת מחיר", en: "Proposal" }, principle: "Stack + Strikethrough + Guarantee",
    template: {
      he: "השקעה: ₪{price}\n~~₪{totalValue}~~ ← ערך מלא\nכולל: {offerStack}\nאחריות: {guarantee}",
      en: "Investment: ₪{price}\n~~₪{totalValue}~~ ← full value\nIncludes: {offerStack}\nGuarantee: {guarantee}",
    } },
  { context: "whatsapp", label: { he: "וואטסאפ", en: "WhatsApp" }, principle: "Personal + ROI + Scarcity",
    template: {
      he: "היי {name},\nאחרי הבדיקה שעשינו — {product} יחסוך לך ₪{saving}/חודש.\nההשקעה: ₪{price}.\nהחזר תוך {paybackDays} ימים.\nרוצה שנתחיל?",
      en: "Hey {name},\nAfter our analysis — {product} will save you ₪{saving}/month.\nInvestment: ₪{price}.\nPayback in {paybackDays} days.\nReady to start?",
    } },
  { context: "email", label: { he: "אימייל", en: "Email" }, principle: "Subject: Curiosity → Body: Value → CTA: Urgency",
    template: {
      he: "נושא: ₪{saving} שאתה מפסיד כל חודש\n\n{name},\n{product} כבר עזר ל-{socialProof} עסקים כמוך.\nההשקעה: ₪{price} (פחות מ-₪{daily} ביום).\n{guarantee}\n\n[{cta}]",
      en: "Subject: ₪{saving} you lose every month\n\n{name},\n{product} has already helped {socialProof} businesses like yours.\nInvestment: ₪{price} (less than ₪{daily}/day).\n{guarantee}\n\n[{cta}]",
    } },
];
