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

// === EXTENDED ISRAELI INDUSTRY BENCHMARKS (depth) ===
// Each entry includes Israeli-specific objections, expected haggle %,
// payment culture, and a sector-specific pricing trap to avoid.

export interface IsraeliIndustryBenchmark {
  field: string;
  label: BilingualText;
  typicalRange: BilingualText;
  expectedHagglePct: number;
  paymentNorm: "cash_or_check" | "tashlumim_3" | "tashlumim_12" | "annual_prepay" | "milestone_based";
  topObjection: BilingualText;
  topObjectionResponse: BilingualText;
  pricingTrap: BilingualText;
  competitorReference: BilingualText;
}

export const ISRAELI_INDUSTRY_BENCHMARKS: IsraeliIndustryBenchmark[] = [
  {
    field: "fashion",
    label: { he: "אופנה ואקססוריז", en: "Fashion & Accessories" },
    typicalRange: { he: "₪49-399", en: "₪49-399" },
    expectedHagglePct: 5,
    paymentNorm: "cash_or_check",
    topObjection: { he: "ב-Shein זה ב-₪29", en: "Shein has it for ₪29" },
    topObjectionResponse: { he: "Shein הוא 14 יום משלוח, איכות חד-פעמית. אנחנו מהיום, אחריות, החלפה חינם", en: "Shein is 14-day shipping, single-use quality. We deliver today, with returns" },
    pricingTrap: { he: "תמחור 'הוגן' מתחת ל-₪49 — גורר לקוחות שלא מתאימים", en: "'Fair' pricing below ₪49 — attracts wrong customers" },
    competitorReference: { he: "Shein, AliExpress, Castro, Renuar", en: "Shein, AliExpress, Castro, Renuar" },
  },
  {
    field: "tech_b2b_saas",
    label: { he: "SaaS B2B", en: "B2B SaaS" },
    typicalRange: { he: "₪500-15,000/חודש", en: "₪500-15,000/mo" },
    expectedHagglePct: 15,
    paymentNorm: "annual_prepay",
    topObjection: { he: "אצל Monday/Wix זה זול יותר", en: "Monday/Wix is cheaper" },
    topObjectionResponse: { he: "Monday הוא generic. אנחנו פתרון נישתי שעולה עליך פחות מ-15 דקות בשבוע — שעות עבודה במחיר מלא", en: "Monday is generic. We're a niche solution that costs you less than 15 min/week — billable hours equivalent" },
    pricingTrap: { he: "תמחור נמוך מ-₪500/חודש — נתפס כצעצוע, לא כלי רציני", en: "Pricing below ₪500/mo — perceived as toy, not serious tool" },
    competitorReference: { he: "Monday.com, Wix, Salesforce IL, Lightico", en: "Monday.com, Wix, Salesforce IL, Lightico" },
  },
  {
    field: "tech_b2c_app",
    label: { he: "אפליקציות B2C", en: "B2C Apps" },
    typicalRange: { he: "₪29-99/חודש", en: "₪29-99/mo" },
    expectedHagglePct: 0,
    paymentNorm: "tashlumim_12",
    topObjection: { he: "יש חינם בגוגל פליי", en: "Google Play has free version" },
    topObjectionResponse: { he: "החינם נותן 30%. אנחנו ה-100% — בלי פרסומות, בלי הגבלות, ייחודי לישראלים", en: "Free gives 30%. We give 100% — no ads, no limits, Israel-specific" },
    pricingTrap: { he: "תמחור $9.99 שבועי במקום ₪29 חודשי — מצריך USD המרה, מבלבל", en: "$9.99/wk pricing instead of ₪29/mo — requires USD conversion, confusing" },
    competitorReference: { he: "Calm, Headspace, Duolingo", en: "Calm, Headspace, Duolingo" },
  },
  {
    field: "food_takeaway",
    label: { he: "אוכל מוכן", en: "Takeaway Food" },
    typicalRange: { he: "₪30-150 למנה", en: "₪30-150/dish" },
    expectedHagglePct: 0,
    paymentNorm: "cash_or_check",
    topObjection: { he: "ב-10ביס יש דומה ב-₪50 פחות", en: "10bis has similar for ₪50 less" },
    topObjectionResponse: { he: "10bis זה קלוריות. אנחנו אוכל ביתי טרי — שווה את ההפרש לארוחת ערב משפחתית", en: "10bis is calories. We're fresh home-cooked — worth the gap for family dinner" },
    pricingTrap: { he: "מנה > ₪150 בלי מתנת חג בחגים — נתפס כקמצנות", en: "Dish > ₪150 without holiday gift on holidays — perceived as stinginess" },
    competitorReference: { he: "10bis, Wolt, BBB, Aroma", en: "10bis, Wolt, BBB, Aroma" },
  },
  {
    field: "food_catering",
    label: { he: "קייטרינג", en: "Catering" },
    typicalRange: { he: "₪80-250/אדם", en: "₪80-250/person" },
    expectedHagglePct: 12,
    paymentNorm: "milestone_based",
    topObjection: { he: "אצל הספקים ה'קטנים' זה בחצי", en: "Small suppliers do it for half" },
    topObjectionResponse: { he: "ספק קטן = סיכון. אם בריתמילה לא מגיעה, חרבת לעצמך את האירוע. אנחנו עם ערבות ביצוע", en: "Small supplier = risk. If brit dinner no-shows, you ruined the event. We have performance guarantee" },
    pricingTrap: { he: "תמחור per-tray במקום per-person — מטעה את הלקוח, מייצר תקלות", en: "Per-tray pricing instead of per-person — misleads customer, creates issues" },
    competitorReference: { he: "Liman, Eyal Shani Catering, Marakia", en: "Liman, Eyal Shani Catering, Marakia" },
  },
  {
    field: "services_consulting",
    label: { he: "ייעוץ עסקי", en: "Business Consulting" },
    typicalRange: { he: "₪500-3,000/שעה", en: "₪500-3,000/hour" },
    expectedHagglePct: 18,
    paymentNorm: "milestone_based",
    topObjection: { he: "₪X לשעה? זה הרבה", en: "₪X per hour? That's a lot" },
    topObjectionResponse: { he: "אני עובד retainer — ₪Y לחודש על תוצאות, לא על שעות. אם לא הגענו, החזר", en: "I work retainer — ₪Y/mo for outcomes, not hours. If we didn't deliver, refund" },
    pricingTrap: { he: "תמחור לפי שעה במקום לפי תוצאה — מקבע אותך כעובד-שעות", en: "Hourly pricing instead of outcome-based — locks you as hourly worker" },
    competitorReference: { he: "BDO, Deloitte IL, פירמות פרילנס", en: "BDO, Deloitte IL, freelancer firms" },
  },
  {
    field: "services_legal",
    label: { he: "שירותים משפטיים", en: "Legal Services" },
    typicalRange: { he: "₪800-2,500/שעה", en: "₪800-2,500/hour" },
    expectedHagglePct: 8,
    paymentNorm: "milestone_based",
    topObjection: { he: "פגשתי עו\"ד בחצי מהמחיר", en: "Met a lawyer at half the price" },
    topObjectionResponse: { he: "התיק שלך מורכב. עו\"ד זול = עוד תיק על הערמה. אצלי אתה הלקוח של היום", en: "Your case is complex. Cheap lawyer = another file on the pile. With me you're today's client" },
    pricingTrap: { he: "תמחור fixed-fee לתיקים מורכבים — חוסם לך את היכולת לטפל לעומק", en: "Fixed-fee for complex cases — blocks you from depth" },
    competitorReference: { he: "Goldfarb Seligman, Yigal Arnon, ש. הורוביץ", en: "Goldfarb Seligman, Yigal Arnon, S. Horowitz" },
  },
  {
    field: "education_courses",
    label: { he: "קורסים דיגיטליים", en: "Digital Courses" },
    typicalRange: { he: "₪297-7,997", en: "₪297-7,997" },
    expectedHagglePct: 5,
    paymentNorm: "tashlumim_12",
    topObjection: { he: "ביוטיוב יש חינם", en: "YouTube has it for free" },
    topObjectionResponse: { he: "ביוטיוב יש 1000 שעות בלי סדר. הקורס שלי 12 שעות עם ליווי — זה ההבדל בין רעש לתוצאה", en: "YouTube has 1000 hours unsorted. My course is 12 hours with mentorship — difference between noise and result" },
    pricingTrap: { he: "מתחת ₪297 — נתפס כ-'תוכן חינמי בכריכה'", en: "Below ₪297 — perceived as 'free content with cover'" },
    competitorReference: { he: "Udemy, Coursera, BeYourself, Mind Academy", en: "Udemy, Coursera, BeYourself, Mind Academy" },
  },
  {
    field: "education_coaching",
    label: { he: "אימון אישי", en: "Personal Coaching" },
    typicalRange: { he: "₪400-2,000/מפגש", en: "₪400-2,000/session" },
    expectedHagglePct: 10,
    paymentNorm: "tashlumim_3",
    topObjection: { he: "פסיכולוג עולה אותו דבר", en: "Therapist costs the same" },
    topObjectionResponse: { he: "פסיכולוג חופר אחורה. אני מאיץ קדימה — תוצאות בחודש, לא בשנים", en: "Therapist digs backward. I accelerate forward — results in months, not years" },
    pricingTrap: { he: "מפגש בודד מתחת ₪400 — תופס לקוחות שלא מתחייבים", en: "Single session below ₪400 — attracts non-committed clients" },
    competitorReference: { he: "Talky, BetterHelp, פרילנסרים", en: "Talky, BetterHelp, freelancers" },
  },
  {
    field: "health_clinic",
    label: { he: "מרפאה פרטית", en: "Private Clinic" },
    typicalRange: { he: "₪400-1,500/ביקור", en: "₪400-1,500/visit" },
    expectedHagglePct: 5,
    paymentNorm: "cash_or_check",
    topObjection: { he: "בקופ\"ח זה בהשתתפות עצמית", en: "HMO is co-pay" },
    topObjectionResponse: { he: "קופ\"ח = 8 דקות, רופא עייף, תור לחודש. אצלנו 45 דקות, פרטיות, היום", en: "HMO = 8 min, tired doctor, month wait. With us 45 min, private, today" },
    pricingTrap: { he: "ביטוח משלים 'מקבל' = הגבלה לתעריפי שב\"ן, מאבדים שליטה", en: "Accepting supplemental insurance = locked to insurance rates, lose control" },
    competitorReference: { he: "מכבי, כללית, רמב\"ם פרטי", en: "Maccabi, Klalit, Rambam Private" },
  },
  {
    field: "health_aesthetics",
    label: { he: "אסתטיקה ובריאות", en: "Aesthetics & Wellness" },
    typicalRange: { he: "₪200-3,500/טיפול", en: "₪200-3,500/treatment" },
    expectedHagglePct: 15,
    paymentNorm: "tashlumim_12",
    topObjection: { he: "ב-Groupon ראיתי דומה ב-50%", en: "Saw similar on Groupon at 50%" },
    topObjectionResponse: { he: "Groupon = משאיר 50% עמלה, החטיב מותר רק עם הנחה. אנחנו בלי מתווכים, אחריות מלאה", en: "Groupon = takes 50% commission. We're middleman-free, full warranty" },
    pricingTrap: { he: "מבצע משולב 'קנה 1 קבל 1' — שורף את ה-LTV", en: "Combo 'BOGO' deals — burns LTV" },
    competitorReference: { he: "Mor, Assuta, ProMed", en: "Mor, Assuta, ProMed" },
  },
  {
    field: "real_estate_residential",
    label: { he: "תיווך מגורים", en: "Residential Brokerage" },
    typicalRange: { he: "₪10K-200K/עסקה", en: "₪10K-200K/deal" },
    expectedHagglePct: 25,
    paymentNorm: "milestone_based",
    topObjection: { he: "2% זה הרבה כסף", en: "2% is a lot of money" },
    topObjectionResponse: { he: "ה-2% מחזירים את עצמם פי 3 בעמדת מיקוח. סוכן זול חוסך לך 2% וגוזר לך 6%", en: "The 2% pays back 3x in negotiation. Cheap agent saves you 2% and costs you 6%" },
    pricingTrap: { he: "עמלה 1.5% — נתפס כסוכן 'זול', מאבדים נכסים פרימיום", en: "1.5% commission — perceived as 'cheap' agent, lose premium properties" },
    competitorReference: { he: "Anglo-Saxon, Re/Max IL, Yad2 פרטי", en: "Anglo-Saxon, Re/Max IL, Yad2 private" },
  },
  {
    field: "real_estate_commercial",
    label: { he: "נדל\"ן מסחרי", en: "Commercial Real Estate" },
    typicalRange: { he: "₪50K-2M/עסקה", en: "₪50K-2M/deal" },
    expectedHagglePct: 30,
    paymentNorm: "milestone_based",
    topObjection: { he: "אחר מציע ב-3%, אתה ב-5%", en: "Another offers 3%, you 5%" },
    topObjectionResponse: { he: "ה-3% מקבל 1 עסקה בחודש. אצלי תיק של 12 משקיעים פעילים — מהירות סגירה כפולה", en: "The 3% closes 1 deal/month. I have 12 active investors — 2x close speed" },
    pricingTrap: { he: "תמחור flat — מאבד עסקאות גדולות לבעלי tier", en: "Flat pricing — loses large deals to tiered competitors" },
    competitorReference: { he: "Cushman & Wakefield IL, Avison Young, פרטי", en: "Cushman & Wakefield IL, Avison Young, private" },
  },
  {
    field: "personal_brand_courses",
    label: { he: "מותג אישי + קורסים", en: "Personal Brand + Courses" },
    typicalRange: { he: "₪997-19,997", en: "₪997-19,997" },
    expectedHagglePct: 0,
    paymentNorm: "tashlumim_12",
    topObjection: { he: "₪10K? זה משכורת", en: "₪10K? That's a salary" },
    topObjectionResponse: { he: "זה לא קורס. זה זהות חדשה. אם תיישם — תרוויח את זה ב-3 חודשים, ועוד פי 5 בשנה", en: "It's not a course. It's a new identity. If you implement — earn it back in 3 months, 5x in a year" },
    pricingTrap: { he: "מתחת ₪997 — מאבד את ה-'אני קונה זהות', נתפס כעוד מוצר", en: "Below ₪997 — loses 'buying an identity', perceived as another product" },
    competitorReference: { he: "Tony Robbins IL, אבי שילון, ערן בליק", en: "Tony Robbins IL, Avi Shilon, Eran Blik" },
  },
  {
    field: "tourism_packages",
    label: { he: "חבילות תיירות", en: "Tourism Packages" },
    typicalRange: { he: "₪1,500-15,000", en: "₪1,500-15,000" },
    expectedHagglePct: 8,
    paymentNorm: "tashlumim_12",
    topObjection: { he: "ב-Booking + טיסה זה זול יותר", en: "Booking + flight is cheaper" },
    topObjectionResponse: { he: "DIY = 30 שעות תכנון + סיכון. אצלי הכל סגור — אתה רק נוסע. ה-30 שעות שלך שוות יותר מההפרש", en: "DIY = 30 planning hours + risk. With me all-locked — you just travel. Your 30 hours worth more than the gap" },
    pricingTrap: { he: "תמחור קלאסי 'יום-יום' — לא מבדיל אותך מ-Booking", en: "Classic 'day-by-day' pricing — doesn't differentiate from Booking" },
    competitorReference: { he: "Issta, Kavei Hofesh, Ophir Tours", en: "Issta, Kavei Hofesh, Ophir Tours" },
  },
];

export function getIsraeliBenchmark(field: string): IsraeliIndustryBenchmark | undefined {
  return ISRAELI_INDUSTRY_BENCHMARKS.find((b) => b.field === field);
}

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
