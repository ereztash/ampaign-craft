// ═══════════════════════════════════════════════
// Israeli Market Intelligence Calendar
// Cross-domain: Economics × Culture × Seasonal Psychology
// ═══════════════════════════════════════════════

export interface MarketEvent {
  id: string;
  name: { he: string; en: string };
  month: number; // 1-12
  dayRange?: [number, number]; // optional day range within month
  impact: { he: string; en: string };
  recommendation: { he: string; en: string };
  affectedIndustries: string[]; // "all" or specific fields
  budgetMultiplier: number; // 1.0 = normal, 1.4 = increase 40%
  emoji: string;
  type: "holiday" | "commercial" | "cultural" | "budget_cycle";
}

const EVENTS: MarketEvent[] = [
  // === Jewish Holidays (dates approximate, shift yearly) ===
  {
    id: "rosh_hashana", name: { he: "ראש השנה", en: "Rosh Hashana" },
    month: 9, dayRange: [15, 30], emoji: "🍎", type: "holiday",
    impact: { he: "עלייה של 40-60% ברכישות מתנות, אוכל, אופנה", en: "40-60% increase in gifts, food, fashion purchases" },
    recommendation: { he: "העלה תקציב retargeting 40%. הכן קמפיין 'שנה חדשה — התחלה חדשה'", en: "Increase retargeting budget 40%. Prepare 'New Year — New Beginning' campaign" },
    affectedIndustries: ["fashion", "food", "services", "other"], budgetMultiplier: 1.4,
  },
  {
    id: "sukkot", name: { he: "סוכות + חוה\"מ", en: "Sukkot + Chol HaMoed" },
    month: 10, dayRange: [1, 15], emoji: "🌿", type: "holiday",
    impact: { he: "תיירות פנים + בילויים + קניות. שבוע חופשה ארצי", en: "Domestic tourism + entertainment + shopping. National vacation week" },
    recommendation: { he: "מקד בתיירות פנים, בילויים, אירועים. הגבר קמפיינים לנייד", en: "Focus on domestic tourism, entertainment, events. Boost mobile campaigns" },
    affectedIndustries: ["tourism", "food", "other"], budgetMultiplier: 1.3,
  },
  {
    id: "black_friday_il", name: { he: "בלאק פריידי IL", en: "Black Friday IL" },
    month: 11, dayRange: [20, 30], emoji: "🛍️", type: "commercial",
    impact: { he: "עלייה של 100-300% בהזמנות אונליין. הכי גדול בשנה לאיקומרס", en: "100-300% increase in online orders. Biggest ecommerce day of the year" },
    recommendation: { he: "הכן מלאי + קמפיינים 3 שבועות מראש. Early access לרשימת מייל. Retargeting אגרסיבי", en: "Prepare inventory + campaigns 3 weeks ahead. Early access for email list. Aggressive retargeting" },
    affectedIndustries: ["fashion", "tech", "food", "health", "other"], budgetMultiplier: 2.0,
  },
  {
    id: "hanukkah", name: { he: "חנוכה", en: "Hanukkah" },
    month: 12, dayRange: [10, 25], emoji: "🕎", type: "holiday",
    impact: { he: "8 ימי קניות מתנות, חופשת ילדים, בילויים משפחתיים", en: "8 days of gift shopping, kids' vacation, family outings" },
    recommendation: { he: "קמפיין 'מתנה ליום' (8 ימים). הנחות מדורגות. תוכן ויראלי לחנוכה", en: "'Gift of the day' campaign (8 days). Tiered discounts. Viral Hanukkah content" },
    affectedIndustries: ["fashion", "tech", "food", "education", "tourism"], budgetMultiplier: 1.3,
  },
  {
    id: "tu_bishvat", name: { he: "ט\"ו בשבט", en: "Tu BiShvat" },
    month: 1, dayRange: [15, 30], emoji: "🌳", type: "holiday",
    impact: { he: "מיתוג ירוק/בר-קיימא. קמפיינים סביבתיים", en: "Green/sustainability branding. Environmental campaigns" },
    recommendation: { he: "קמפיין CSR + sustainability. תוכן 'ירוק' מתחבר לערכים ישראליים", en: "CSR + sustainability campaign. 'Green' content connects to Israeli values" },
    affectedIndustries: ["food", "health", "education"], budgetMultiplier: 1.1,
  },
  {
    id: "purim", name: { he: "פורים", en: "Purim" },
    month: 3, dayRange: [1, 15], emoji: "🎭", type: "holiday",
    impact: { he: "תחפושות, משלוחי מנות, אירועים. תוכן ויראלי ברמה הגבוהה ביותר", en: "Costumes, gift baskets, events. Highest viral content potential" },
    recommendation: { he: "תוכן הומוריסטי/ויראלי. משלוח מנות ממותג. קמפיינים בפייסבוק/אינסטגרם עם UGC", en: "Humorous/viral content. Branded gift baskets. FB/IG campaigns with UGC" },
    affectedIndustries: ["fashion", "food", "personalBrand", "other"], budgetMultiplier: 1.2,
  },
  {
    id: "pesach", name: { he: "פסח", en: "Passover" },
    month: 4, dayRange: [5, 25], emoji: "🫓", type: "holiday",
    impact: { he: "ניקיון + קניות מאסיבי. חופשה + תיירות. שינוי הרגלים", en: "Massive cleaning + shopping. Vacation + tourism. Habit change period" },
    recommendation: { he: "קמפיין 'ניקיון אביב' 3 שבועות לפני. חבילות חג. תיירות פנים + חו\"ל", en: "'Spring cleaning' campaign 3 weeks before. Holiday packages. Domestic + international tourism" },
    affectedIndustries: ["all"], budgetMultiplier: 1.5,
  },
  // === Commercial Events ===
  {
    id: "back_to_school", name: { he: "חזרה ללימודים", en: "Back to School" },
    month: 8, dayRange: [15, 31], emoji: "📚", type: "commercial",
    impact: { he: "ציוד, טכנולוגיה, ביגוד, חוגים. תקציב משפחתי מרוכז", en: "Supplies, tech, clothing, classes. Focused family budget" },
    recommendation: { he: "קמפיין לילדים + הורים. הנחות מוקדמות. שיתופי פעולה עם מותגי חינוך", en: "Campaign for kids + parents. Early bird discounts. Partnerships with education brands" },
    affectedIndustries: ["tech", "fashion", "education"], budgetMultiplier: 1.3,
  },
  {
    id: "summer", name: { he: "קיץ ישראלי", en: "Israeli Summer" },
    month: 7, emoji: "☀️", type: "cultural",
    impact: { he: "חופשות, בילויים, קייטנות. צריכת מדיה מוגברת בנייד", en: "Vacations, outings, camps. Increased mobile media consumption" },
    recommendation: { he: "הגבר קמפיינים לנייד. תוכן קליל. שעות שיא: 20:00-23:00", en: "Boost mobile campaigns. Light content. Peak hours: 8-11 PM" },
    affectedIndustries: ["tourism", "food", "health", "other"], budgetMultiplier: 1.2,
  },
  // === Budget Cycles ===
  {
    id: "q4_budget", name: { he: "אישור תקציבים Q1", en: "Q1 Budget Approvals" },
    month: 1, emoji: "💰", type: "budget_cycle",
    impact: { he: "חברות B2B מקבלות תקציב חדש. הזמן הכי טוב למכירות B2B", en: "B2B companies get new budgets. Best time for B2B sales" },
    recommendation: { he: "הגבר outreach ל-B2B. הצעות מוקדמות. 'השקיעו את התקציב החדש חכם'", en: "Increase B2B outreach. Early proposals. 'Invest the new budget wisely'" },
    affectedIndustries: ["tech", "services", "education"], budgetMultiplier: 1.3,
  },
  {
    id: "army_release", name: { he: "שחרור מצה\"ל", en: "Army Release Wave" },
    month: 8, dayRange: [1, 15], emoji: "🎖️", type: "cultural",
    impact: { he: "גל צעירים 21-22 שנכנסים לשוק. קהל חדש עם כסף שחרור", en: "Wave of 21-22 year-olds entering market. New audience with discharge funds" },
    recommendation: { he: "קמפיינים ממוקדים לצעירים: השכלה, טכנולוגיה, טיולים, קריירה ראשונה", en: "Youth-targeted campaigns: education, tech, travel, first career" },
    affectedIndustries: ["education", "tech", "tourism", "personalBrand"], budgetMultiplier: 1.2,
  },
  {
    id: "memorial_independence", name: { he: "יום הזיכרון + יום העצמאות", en: "Memorial Day + Independence Day" },
    month: 5, dayRange: [1, 10], emoji: "🇮🇱", type: "cultural",
    impact: { he: "יום זיכרון: שקט מוחלט (אל תפרסם). יום העצמאות: חגיגות, BBQ, בילויים", en: "Memorial Day: absolute quiet (don't advertise). Independence Day: celebrations, BBQ, outings" },
    recommendation: { he: "עצור פרסום ביום הזיכרון! יום העצמאות: תוכן פטריוטי, מבצעי חג, BBQ-related", en: "STOP advertising on Memorial Day! Independence Day: patriotic content, holiday deals, BBQ-related" },
    affectedIndustries: ["all"], budgetMultiplier: 0.5, // reduce on memorial, spike on independence
  },
];

/**
 * Get relevant events for current month or specific month
 */
export function getCurrentEvents(month?: number): MarketEvent[] {
  const m = month || new Date().getMonth() + 1;
  return EVENTS.filter((e) => e.month === m).sort((a, b) => b.budgetMultiplier - a.budgetMultiplier);
}

/**
 * Get upcoming events (next 3 months)
 */
export function getUpcomingEvents(fromMonth?: number): MarketEvent[] {
  const m = fromMonth || new Date().getMonth() + 1;
  const upcoming = [m, (m % 12) + 1, ((m + 1) % 12) + 1];
  return EVENTS.filter((e) => upcoming.includes(e.month))
    .sort((a, b) => {
      const aDist = (a.month - m + 12) % 12;
      const bDist = (b.month - m + 12) % 12;
      return aDist - bDist;
    });
}

/**
 * Get events relevant to a specific business field
 */
export function getEventsForField(businessField: string, month?: number): MarketEvent[] {
  return getUpcomingEvents(month).filter(
    (e) => e.affectedIndustries.includes("all") || e.affectedIndustries.includes(businessField)
  );
}

/**
 * Get budget recommendation for current period
 */
export function getSeasonalBudgetMultiplier(businessField: string, month?: number): {
  multiplier: number;
  reason: { he: string; en: string };
} {
  const events = getCurrentEvents(month).filter(
    (e) => e.affectedIndustries.includes("all") || e.affectedIndustries.includes(businessField)
  );
  if (events.length === 0) return { multiplier: 1.0, reason: { he: "תקופה רגילה", en: "Normal period" } };
  const top = events[0];
  return { multiplier: top.budgetMultiplier, reason: top.impact };
}
