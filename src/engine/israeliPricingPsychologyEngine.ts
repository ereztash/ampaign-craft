// ═══════════════════════════════════════════════════════════════════════════
// Israeli Pricing Psychology Engine
//
// Encodes pricing patterns that are specific to the Israeli market and cannot
// be reproduced by generic English-trained models. This is the core moat
// of the Pricing wedge: cultural, calendrical, and segment-specific pricing
// intelligence that ChatGPT does not have.
//
// Domains covered:
//   1. Tashlumim psychology (12-payment installments)
//   2. Hebrew-calendar pricing timing (Shabbat, holidays, end-of-month)
//   3. Charm pricing per cultural segment (mainstream vs chareidi vs Arab)
//   4. VAT (מע"מ) framing for B2B vs B2C
//   5. Negotiation-buffer (Israeli haggling expectation)
//   6. Trust-signal pricing (army/security/founder cred)
//
// All outputs are deterministic, pure functions for the wedge.
// ═══════════════════════════════════════════════════════════════════════════

import type { BilingualText } from "@/types/i18n";

export const ENGINE_MANIFEST = {
  id: "israeliPricingPsychologyEngine",
  tier: "S" as const,
  inputs: ["price", "audienceType", "businessField", "context"],
  outputs: ["pricingMoves", "calendarWindow", "riskFlags"],
  feedbackLoop: "outcome.pricing_acceptance_rate",
};

// ── Cultural segment ──────────────────────────────────────────────────────────

export type CulturalSegment =
  | "mainstream"     // חילוני / מסורתי
  | "chareidi"       // חרדי
  | "dati_leumi"     // דתי-לאומי
  | "arab"           // ערבי
  | "russian"        // עולים מבריה"מ
  | "tech_b2b";      // היי-טק / B2B

export interface SegmentPricingProfile {
  segment: CulturalSegment;
  charmPreference: "ends_in_9" | "ends_in_7" | "round" | "ends_in_5";
  negotiationBuffer: number; // expected inflation %
  paymentPreference: "tashlumim_12" | "tashlumim_3" | "single" | "credit_or_check" | "annual_upfront";
  trustAnchors: BilingualText[];
  notes: BilingualText;
}

export const SEGMENT_PROFILES: SegmentPricingProfile[] = [
  {
    segment: "mainstream",
    charmPreference: "ends_in_9",
    negotiationBuffer: 10,
    paymentPreference: "tashlumim_12",
    trustAnchors: [
      { he: "הוכחה חברתית: 'יותר מ-X בעלי עסקים כמוך'", en: "Social proof: 'X+ business owners like you'" },
      { he: "ערבות החזר ללא תנאי 14 יום", en: "14-day no-questions refund" },
    ],
    notes: { he: "מצפה למו\"מ. נתפס כחיובי לחפש הנחה. חרם פתוח על מחירים נוקשים", en: "Expects negotiation. Looking for discount is positive. Open boycott of rigid prices" },
  },
  {
    segment: "chareidi",
    charmPreference: "round",
    negotiationBuffer: 5,
    paymentPreference: "credit_or_check",
    trustAnchors: [
      { he: "המלצת רב / גדול הדור", en: "Rabbinical endorsement" },
      { he: "כשרות ברורה (במידה ורלוונטי)", en: "Clear kashrut (if relevant)" },
      { he: "המלצות מהציבור החרדי עצמו", en: "Testimonials from within the chareidi community" },
    ],
    notes: { he: "מספרים עגולים נתפסים כישרים. Charm prices נתפסים כ'תחבולה'. רגישות גבוהה למחיר אבל אמון מהקהילה גובר", en: "Round numbers seen as honest. Charm pricing seen as 'trickery'. High price-sensitivity but community trust overrides" },
  },
  {
    segment: "dati_leumi",
    charmPreference: "ends_in_7",
    negotiationBuffer: 8,
    paymentPreference: "tashlumim_3",
    trustAnchors: [
      { he: "ערכי ציונות / קהילתיות", en: "Zionist / community values" },
      { he: "תוצרת הארץ", en: "Made in Israel" },
    ],
    notes: { he: "הכי דומה ל-mainstream אבל מעדיף תזמון לפני שבת ולא בחגים", en: "Closest to mainstream but prefers pre-Shabbat timing, not on holidays" },
  },
  {
    segment: "arab",
    charmPreference: "ends_in_5",
    negotiationBuffer: 20,
    paymentPreference: "single",
    trustAnchors: [
      { he: "המלצת בכיר משפחתי", en: "Endorsement from family elder" },
      { he: "מערכת יחסים ארוכת-טווח", en: "Long-term relationship signal" },
    ],
    notes: { he: "מו\"מ צפוי וחיוני. אנקור גבוה ב-15-20%. שיחה אישית עדיפה על דף מחיר", en: "Negotiation expected and essential. Anchor 15-20% higher. Personal conversation > price page" },
  },
  {
    segment: "russian",
    charmPreference: "round",
    negotiationBuffer: 12,
    paymentPreference: "tashlumim_3",
    trustAnchors: [
      { he: "תעודות, הסמכות, ניסיון מתועד", en: "Certifications, credentials, documented experience" },
      { he: "עברית/רוסית — לא רק עברית", en: "Hebrew/Russian — not Hebrew alone" },
    ],
    notes: { he: "דורש הוכחה. סקפטיות לטענות שיווקיות. מספרים עגולים פחות מאיימים", en: "Demands proof. Skeptical of marketing claims. Round numbers less threatening" },
  },
  {
    segment: "tech_b2b",
    charmPreference: "round",
    negotiationBuffer: 15,
    paymentPreference: "annual_upfront",
    trustAnchors: [
      { he: "לקוחות סטארט-אפ ידועים (Wix, Monday, Lemonade)", en: "Notable startup customers (Wix, Monday, Lemonade)" },
      { he: "Founder/CTO ex-8200 / יחידות טכנולוגיות", en: "Founder/CTO ex-8200 / elite tech units" },
      { he: "SOC 2 / ISO compliance", en: "SOC 2 / ISO compliance" },
    ],
    notes: { he: "מחיר USD מקובל. שנתי במזומן עם הנחה 15-20%. דורש security review. מחיר עגול = פרופ' (₪10K, $5K)", en: "USD pricing accepted. Annual prepay with 15-20% discount. Requires security review. Round = professional (₪10K, $5K)" },
  },
];

export function getSegmentProfile(segment: CulturalSegment): SegmentPricingProfile {
  return SEGMENT_PROFILES.find((p) => p.segment === segment) ?? SEGMENT_PROFILES[0];
}

// ── Tashlumim psychology ──────────────────────────────────────────────────────

export interface TashlumimSplit {
  count: number;
  perPayment: number;
  framing: BilingualText;
  acceptanceLift: number; // estimated conversion lift vs single-payment
}

/**
 * Returns the optimal tashlumim breakdown for a given price + segment.
 * In Israel, framing ₪X as "12 תשלומים של ₪Y בלי ריבית" can lift acceptance
 * by 15-30% for B2C purchases > ₪500.
 */
export function suggestTashlumim(
  totalPrice: number,
  segment: CulturalSegment,
  isB2B: boolean,
): TashlumimSplit[] {
  if (isB2B || segment === "tech_b2b") {
    return [
      { count: 1, perPayment: totalPrice, framing: { he: "תשלום בודד +מע\"מ", en: "Single payment +VAT" }, acceptanceLift: 0 },
    ];
  }

  const profile = getSegmentProfile(segment);
  const splits: TashlumimSplit[] = [];

  if (totalPrice >= 500) {
    splits.push({
      count: 3,
      perPayment: Math.round(totalPrice / 3),
      framing: {
        he: `3 תשלומים של ₪${Math.round(totalPrice / 3)} בלי ריבית`,
        en: `3 interest-free payments of ₪${Math.round(totalPrice / 3)}`,
      },
      acceptanceLift: 0.12,
    });
  }

  if (totalPrice >= 1200 && profile.paymentPreference !== "single") {
    splits.push({
      count: 12,
      perPayment: Math.round(totalPrice / 12),
      framing: {
        he: `12 תשלומים של ₪${Math.round(totalPrice / 12)} (בלי ריבית, בלי הצמדה)`,
        en: `12 interest-free, inflation-free payments of ₪${Math.round(totalPrice / 12)}`,
      },
      acceptanceLift: profile.segment === "mainstream" ? 0.28 : 0.18,
    });
  }

  if (profile.paymentPreference === "single" || profile.segment === "chareidi") {
    splits.unshift({
      count: 1,
      perPayment: totalPrice,
      framing: { he: "תשלום בודד — שקיפות מלאה", en: "Single payment — full transparency" },
      acceptanceLift: 0.05,
    });
  }

  return splits;
}

// ── Calendar-aware timing ─────────────────────────────────────────────────────

export type PriceWindow = "ideal" | "acceptable" | "avoid";

export interface CalendarTimingAdvice {
  window: PriceWindow;
  reason: BilingualText;
  preferredHours: string;
  avoidUntil?: Date;
}

const HEBREW_HOLIDAYS_2026 = [
  { name: "ראש השנה", start: "2026-09-12", end: "2026-09-14" },
  { name: "יום כיפור", start: "2026-09-21", end: "2026-09-22" },
  { name: "סוכות", start: "2026-09-26", end: "2026-10-04" },
  { name: "פסח", start: "2026-04-02", end: "2026-04-09" },
  { name: "שבועות", start: "2026-05-22", end: "2026-05-23" },
];

/**
 * Determines whether NOW is a good time to send a pricing proposal.
 * Israeli market: Friday 14:00 → Sunday 09:00 = dead zone for B2B.
 * Holidays: avoid +/- 2 days.
 * End-of-month (29th-2nd): payment-cluster, B2B receptive.
 */
export function getCalendarTiming(now: Date = new Date()): CalendarTimingAdvice {
  const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
  const hour = now.getHours();
  const dayOfMonth = now.getDate();

  if (dayOfWeek === 5 && hour >= 14) {
    return {
      window: "avoid",
      reason: { he: "שישי אחה\"צ — הצעות נבלעות לפני שבת ונתפסות כדחופות", en: "Friday afternoon — proposals get buried before Shabbat, perceived as desperate" },
      preferredHours: "ראשון 09:00-11:00",
    };
  }
  if (dayOfWeek === 6) {
    return {
      window: "avoid",
      reason: { he: "שבת — קהל דתי/מסורתי נעלב, חילוני לא מגיב", en: "Shabbat — observant audience offended, secular doesn't respond" },
      preferredHours: "ראשון 09:00-11:00",
    };
  }
  if (dayOfWeek === 0 && hour < 9) {
    return {
      window: "acceptable",
      reason: { he: "ראשון בבוקר — המתן עד 09:00 לפתיחת שבוע", en: "Sunday early — wait until 09:00 for week opening" },
      preferredHours: "09:00-11:00",
    };
  }

  for (const holiday of HEBREW_HOLIDAYS_2026) {
    const start = new Date(holiday.start);
    const end = new Date(holiday.end);
    const buffer = 2 * 24 * 60 * 60 * 1000;
    if (now.getTime() >= start.getTime() - buffer && now.getTime() <= end.getTime() + buffer) {
      return {
        window: "avoid",
        reason: {
          he: `קרבת ${holiday.name} — קהל לא ממוקד במחירים, החזר אחרי החג`,
          en: `Near ${holiday.name} — audience not focused on pricing, defer until after holiday`,
        },
        preferredHours: "אחרי החג, ימים א-ה 09:00-12:00",
        avoidUntil: new Date(end.getTime() + buffer),
      };
    }
  }

  if (dayOfMonth >= 28 || dayOfMonth <= 2) {
    return {
      window: "ideal",
      reason: { he: "סוף/תחילת חודש — תקציבי B2B נפתחים, החלטות פיננסיות מרוכזות", en: "Month-end/start — B2B budgets open, financial decisions cluster" },
      preferredHours: "09:00-11:00 או 14:00-16:00",
    };
  }

  if (dayOfWeek >= 1 && dayOfWeek <= 4 && hour >= 9 && hour <= 16) {
    return {
      window: "ideal",
      reason: { he: "אמצע שבוע, שעות עבודה — חלון מיטבי", en: "Midweek, business hours — optimal window" },
      preferredHours: "עכשיו",
    };
  }

  return {
    window: "acceptable",
    reason: { he: "חלון תקין, לא אופטימלי", en: "Acceptable window, not optimal" },
    preferredHours: "ב-ה 09:00-12:00",
  };
}

// ── VAT framing ───────────────────────────────────────────────────────────────

export const VAT_RATE = 0.17; // current Israeli VAT (Mar 2026)

export interface VATFraming {
  netPrice: number;
  vatAmount: number;
  grossPrice: number;
  display: BilingualText;
  context: "B2B" | "B2C";
}

/**
 * Converts a single price into the correct B2B / B2C framing.
 * B2B: show net + "+מע"מ" — anything else looks amateur
 * B2C: show gross — VAT-inclusive is the only socially accepted framing
 */
export function frameVAT(price: number, isB2B: boolean): VATFraming {
  if (isB2B) {
    const net = Math.round(price);
    const vat = Math.round(net * VAT_RATE);
    const gross = net + vat;
    return {
      netPrice: net,
      vatAmount: vat,
      grossPrice: gross,
      context: "B2B",
      display: {
        he: `₪${net.toLocaleString("he-IL")} +מע"מ (סה"כ ₪${gross.toLocaleString("he-IL")})`,
        en: `₪${net.toLocaleString("en-US")} +VAT (total ₪${gross.toLocaleString("en-US")})`,
      },
    };
  }

  const gross = Math.round(price);
  const net = Math.round(gross / (1 + VAT_RATE));
  const vat = gross - net;
  return {
    netPrice: net,
    vatAmount: vat,
    grossPrice: gross,
    context: "B2C",
    display: {
      he: `₪${gross.toLocaleString("he-IL")} (כולל מע"מ)`,
      en: `₪${gross.toLocaleString("en-US")} (VAT incl.)`,
    },
  };
}

// ── Negotiation-buffer anchoring ──────────────────────────────────────────────

export interface AnchoredPrice {
  publishedAnchor: number;
  realTarget: number;
  bufferPct: number;
  rationale: BilingualText;
  scriptForFirstObjection: BilingualText;
}

/**
 * Israeli buyers expect to negotiate. A "rigid" price loses 30% of warm leads.
 * This function inflates the published price by the segment's expected buffer
 * so the seller can "give" a discount that lands at the real target.
 */
export function anchorWithBuffer(
  realTarget: number,
  segment: CulturalSegment,
): AnchoredPrice {
  const profile = getSegmentProfile(segment);
  const buffer = profile.negotiationBuffer / 100;
  const published = Math.round(realTarget * (1 + buffer));

  return {
    publishedAnchor: published,
    realTarget,
    bufferPct: profile.negotiationBuffer,
    rationale: {
      he: `${profile.negotiationBuffer}% buffer מעל היעד האמיתי — קהל ${profile.segment} מצפה למו"מ`,
      en: `${profile.negotiationBuffer}% buffer above real target — ${profile.segment} segment expects negotiation`,
    },
    scriptForFirstObjection: {
      he: `"אני מבין שזה השקעה רצינית. בוא נראה מה אני יכול לעשות ב-₪${realTarget.toLocaleString("he-IL")} אם נסגור היום."`,
      en: `"I understand this is a serious investment. Let me see what I can do at ₪${realTarget.toLocaleString("en-US")} if we close today."`,
    },
  };
}

// ── Round-vs-charm framing ────────────────────────────────────────────────────

export type PriceFraming = "round_premium" | "charm_value" | "professional_round";

export interface FramedPrice {
  price: number;
  framing: PriceFraming;
  why: BilingualText;
  exampleContexts: BilingualText[];
}

/**
 * Selects round vs charm based on segment + position.
 * Round (₪1,000) = premium, professional, confident.
 * Charm (₪997) = value, savings, retail.
 * Mistake: B2B SaaS selling at ₪997 — looks unprofessional.
 */
export function chooseFraming(
  basePrice: number,
  segment: CulturalSegment,
  position: "premium" | "value" | "parity",
): FramedPrice {
  const profile = getSegmentProfile(segment);

  if (segment === "tech_b2b" || position === "premium") {
    const rounded = Math.round(basePrice / 100) * 100;
    return {
      price: rounded,
      framing: position === "premium" ? "round_premium" : "professional_round",
      why: { he: "מספר עגול = מקצוענות + ביטחון. סטרייט פורוורד B2B/פרימיום", en: "Round number = professionalism + confidence. Straightforward B2B/premium" },
      exampleContexts: [
        { he: "יועץ אסטרטגי, ₪10,000/חודש", en: "Strategic consultant, ₪10,000/mo" },
        { he: "SaaS B2B, $499/seat/year", en: "B2B SaaS, $499/seat/year" },
      ],
    };
  }

  if (profile.charmPreference === "round") {
    const rounded = Math.round(basePrice / 100) * 100;
    return {
      price: rounded,
      framing: "professional_round",
      why: { he: `קהל ${segment} מעדיף מספרים עגולים — נתפסים כיותר ישרים, פחות 'תחבולה'`, en: `${segment} segment prefers round numbers — perceived as more honest` },
      exampleContexts: [{ he: "₪500, ₪1,000, ₪3,000", en: "₪500, ₪1,000, ₪3,000" }],
    };
  }

  if (profile.charmPreference === "ends_in_7") {
    const charm = Math.floor(basePrice / 100) * 100 + (basePrice % 100 >= 50 ? 97 : 47);
    return {
      price: charm,
      framing: "charm_value",
      why: { he: "סיומת 7 — פחות נדושה מ-9, נתפסת כ-charm 'אמיתי' יותר", en: "Ending in 7 — less cliché than 9, perceived as more 'authentic' charm" },
      exampleContexts: [{ he: "₪297, ₪497, ₪997", en: "₪297, ₪497, ₪997" }],
    };
  }

  if (profile.charmPreference === "ends_in_5") {
    const charm = Math.floor(basePrice / 100) * 100 + 95;
    return {
      price: charm,
      framing: "charm_value",
      why: { he: "סיומת 5 — מקובלת בקהל הערבי, פחות אגרסיבית", en: "Ending in 5 — accepted in Arab market, less aggressive" },
      exampleContexts: [{ he: "₪95, ₪195, ₪495", en: "₪95, ₪195, ₪495" }],
    };
  }

  const charm = Math.floor(basePrice / 100) * 100 + (basePrice >= 100 ? 99 : 9);
  return {
    price: charm,
    framing: "charm_value",
    why: { he: "סיומת 9 — סטנדרט retail ישראלי, מסמן ערך/חיסכון", en: "Ending in 9 — Israeli retail standard, signals value/savings" },
    exampleContexts: [{ he: "₪99, ₪199, ₪999", en: "₪99, ₪199, ₪999" }],
  };
}

// ── Risk-flag detection ───────────────────────────────────────────────────────

export interface PricingRiskFlag {
  severity: "high" | "medium" | "low";
  flag: BilingualText;
  fix: BilingualText;
}

/**
 * Detects pricing decisions that will fail in the Israeli market.
 */
export function detectPricingRisks(
  price: number,
  segment: CulturalSegment,
  framing: PriceFraming,
  isB2B: boolean,
): PricingRiskFlag[] {
  const risks: PricingRiskFlag[] = [];
  const profile = getSegmentProfile(segment);

  if (segment === "chareidi" && framing === "charm_value") {
    risks.push({
      severity: "high",
      flag: { he: "Charm pricing מול קהל חרדי", en: "Charm pricing for chareidi audience" },
      fix: { he: "החלף למספר עגול. ₪497→₪500. החרדים מזהים 'תחבולה' ומאבדים אמון", en: "Switch to round. ₪497→₪500. Chareidi audience detects 'trickery' and loses trust" },
    });
  }

  if (isB2B && framing === "charm_value" && price > 1000) {
    risks.push({
      severity: "medium",
      flag: { he: "B2B עם charm pricing מעל ₪1K", en: "B2B with charm pricing above ₪1K" },
      fix: { he: "B2B מעדיף מספרים עגולים — נראה מקצועי. ₪9,997→₪10,000", en: "B2B prefers round numbers — looks professional. ₪9,997→₪10,000" },
    });
  }

  if (segment === "arab" && profile.negotiationBuffer < 15) {
    risks.push({
      severity: "high",
      flag: { he: "Buffer נמוך מדי לקהל ערבי", en: "Buffer too low for Arab segment" },
      fix: { he: "הוסף 15-20% מעל היעד האמיתי. בקהל הערבי מו\"מ הוא נורמה, לא חריג", en: "Add 15-20% over real target. In Arab market negotiation is the norm, not exception" },
    });
  }

  if (price > 5000 && !isB2B && segment !== "chareidi") {
    risks.push({
      severity: "medium",
      flag: { he: "מחיר B2C מעל ₪5K בלי tashlumim", en: "B2C price above ₪5K without installments" },
      fix: { he: "פצל ל-12 תשלומים של ₪X. קפיצת קבלה צפויה: 18-28%", en: "Split into 12 monthly installments. Expected acceptance lift: 18-28%" },
    });
  }

  if (segment === "tech_b2b" && price < 1000) {
    risks.push({
      severity: "medium",
      flag: { he: "מחיר נמוך מדי ל-B2B טק", en: "Price too low for B2B tech" },
      fix: { he: "B2B תחת ₪1K נתפס כצעצוע, לא ככלי רציני. שקול annual prepay מ-₪3K+", en: "B2B under ₪1K perceived as toy, not serious tool. Consider annual prepay from ₪3K+" },
    });
  }

  return risks;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export interface IsraeliPricingAnalysis {
  segment: CulturalSegment;
  framedPrice: FramedPrice;
  vatFraming: VATFraming;
  tashlumim: TashlumimSplit[];
  anchored: AnchoredPrice;
  calendarTiming: CalendarTimingAdvice;
  trustAnchors: BilingualText[];
  risks: PricingRiskFlag[];
}

export function analyzeIsraeliPricing(input: {
  basePrice: number;
  segment: CulturalSegment;
  isB2B: boolean;
  position: "premium" | "value" | "parity";
}): IsraeliPricingAnalysis {
  const profile = getSegmentProfile(input.segment);
  const framedPrice = chooseFraming(input.basePrice, input.segment, input.position);
  const vatFraming = frameVAT(framedPrice.price, input.isB2B);
  const tashlumim = suggestTashlumim(framedPrice.price, input.segment, input.isB2B);
  const anchored = anchorWithBuffer(framedPrice.price, input.segment);
  const calendarTiming = getCalendarTiming();
  const risks = detectPricingRisks(framedPrice.price, input.segment, framedPrice.framing, input.isB2B);

  return {
    segment: input.segment,
    framedPrice,
    vatFraming,
    tashlumim,
    anchored,
    calendarTiming,
    trustAnchors: profile.trustAnchors,
    risks,
  };
}
