/**
 * Marketing Glossary — Bilingual contextual help
 * Each term has a simple Hebrew explanation + English equivalent.
 * Used for tooltips next to advanced marketing concepts.
 */

export interface GlossaryTerm {
  term: { he: string; en: string };
  definition: { he: string; en: string };
  example?: { he: string; en: string };
}

const glossary: Record<string, GlossaryTerm> = {
  cpc: {
    term: { he: "CPC – עלות לקליק", en: "CPC – Cost per Click" },
    definition: { he: "כמה אתה משלם על כל קליק במודעה שלך", en: "How much you pay for each click on your ad" },
    example: { he: "CPC של ₪2 = 500 קליקים ב-₪1,000", en: "₪2 CPC = 500 clicks for ₪1,000" },
  },
  cpl: {
    term: { he: "CPL – עלות לליד", en: "CPL – Cost per Lead" },
    definition: { he: "כמה עולה לך להשיג לקוח פוטנציאלי אחד שהשאיר פרטים", en: "How much it costs to get one potential customer who left their details" },
    example: { he: "CPL של ₪30 = 33 לידים ב-₪1,000", en: "₪30 CPL = 33 leads for ₪1,000" },
  },
  cpa: {
    term: { he: "CPA – עלות לרכישה", en: "CPA – Cost per Acquisition" },
    definition: { he: "כמה עולה לך להשיג לקוח שבאמת קנה", en: "How much it costs to get a customer who actually bought" },
    example: { he: "CPA של ₪100 במוצר של ₪500 = רווח של ₪400", en: "₪100 CPA on a ₪500 product = ₪400 profit" },
  },
  cpm: {
    term: { he: "CPM – עלות לאלף חשיפות", en: "CPM – Cost per 1000 Impressions" },
    definition: { he: "כמה אתה משלם על כל 1,000 פעמים שהמודעה מוצגת", en: "How much you pay for every 1,000 times your ad is shown" },
  },
  roas: {
    term: { he: "ROAS – תשואה על הוצאות פרסום", en: "ROAS – Return on Ad Spend" },
    definition: { he: "כמה שקלים חוזרים על כל שקל שהושקע בפרסום", en: "How many shekels return for every shekel spent on ads" },
    example: { he: "ROAS של 4x = על כל ₪1 הושקע חזרו ₪4", en: "4x ROAS = ₪4 returned for every ₪1 spent" },
  },
  roi: {
    term: { he: "ROI – תשואה על השקעה", en: "ROI – Return on Investment" },
    definition: { he: "אחוז הרווח ביחס לסך ההשקעה — כולל את כל העלויות, לא רק פרסום", en: "Profit percentage relative to total investment — including all costs, not just ads" },
  },
  ltv: {
    term: { he: "LTV – ערך חיי לקוח", en: "LTV – Lifetime Value" },
    definition: { he: "כמה כסף לקוח ממוצע ישאיר אצלך לאורך כל תקופת הקשר", en: "How much money an average customer will spend with you over the entire relationship" },
    example: { he: "מנוי של ₪100/חודש × 12 חודשים = LTV של ₪1,200", en: "₪100/month subscription × 12 months = ₪1,200 LTV" },
  },
  cac: {
    term: { he: "CAC – עלות רכישת לקוח", en: "CAC – Customer Acquisition Cost" },
    definition: { he: "סך כל ההוצאות על שיווק ומכירות חלקי מספר הלקוחות שנרכשו", en: "Total marketing + sales spend divided by number of customers acquired" },
  },
  cvr: {
    term: { he: "CVR – שיעור המרה", en: "CVR – Conversion Rate" },
    definition: { he: "אחוז האנשים שביצעו את הפעולה הרצויה (רכישה, הרשמה, השארת פרטים)", en: "Percentage of people who completed the desired action (purchase, signup, form fill)" },
    example: { he: "100 מבקרים → 3 רכישות = CVR של 3%", en: "100 visitors → 3 purchases = 3% CVR" },
  },
  ctr: {
    term: { he: "CTR – שיעור הקלקה", en: "CTR – Click-Through Rate" },
    definition: { he: "אחוז האנשים שראו את המודעה ולחצו עליה", en: "Percentage of people who saw the ad and clicked on it" },
    example: { he: "1,000 חשיפות → 30 קליקים = CTR של 3%", en: "1,000 impressions → 30 clicks = 3% CTR" },
  },
  nps: {
    term: { he: "NPS – ציון נאמנות לקוחות", en: "NPS – Net Promoter Score" },
    definition: { he: "מדד שמראה כמה הלקוחות שלך ממליצים עליך (סקלה 10-0, ציון 100- עד 100)", en: "Metric showing how likely customers are to recommend you (0-10 scale, score -100 to 100)" },
  },
  plg: {
    term: { he: "PLG – צמיחה מובלת מוצר", en: "PLG – Product-Led Growth" },
    definition: { he: "אסטרטגיה שבה המוצר עצמו מושך ומגייס לקוחות — במקום אנשי מכירות", en: "Strategy where the product itself attracts and converts customers — instead of salespeople" },
  },
  ugc: {
    term: { he: "UGC – תוכן שנוצר ע\"י משתמשים", en: "UGC – User Generated Content" },
    definition: { he: "תוכן שהלקוחות שלך יוצרים — ביקורות, תמונות, סרטונים. אמין יותר מתוכן ממותג", en: "Content your customers create — reviews, photos, videos. More trusted than branded content" },
  },
  b2b: {
    term: { he: "B2B – עסק לעסק", en: "B2B – Business to Business" },
    definition: { he: "מכירת מוצרים או שירותים לעסקים אחרים, לא לצרכנים פרטיים", en: "Selling products or services to other businesses, not individual consumers" },
  },
  b2c: {
    term: { he: "B2C – עסק לצרכן", en: "B2C – Business to Consumer" },
    definition: { he: "מכירת מוצרים או שירותים ישירות לצרכנים פרטיים", en: "Selling products or services directly to individual consumers" },
  },
  funnel: {
    term: { he: "משפך שיווקי", en: "Marketing Funnel" },
    definition: { he: "המסלול שלקוח עובר מהרגע שהוא שומע עליך ועד שהוא קונה ומפנה אחרים", en: "The journey a customer takes from first hearing about you to buying and referring others" },
  },
  retargeting: {
    term: { he: "רטרגטינג – פרסום חוזר", en: "Retargeting – Remarketing" },
    definition: { he: "הצגת מודעות לאנשים שכבר ביקרו באתר שלך אבל לא קנו", en: "Showing ads to people who already visited your site but didn't buy" },
  },
  leadMagnet: {
    term: { he: "ליד מגנט – מגנט לידים", en: "Lead Magnet" },
    definition: { he: "תוכן חינמי בעל ערך (מדריך, צ'קליסט, וובינר) שמחליפים עליו פרטי קשר", en: "Free valuable content (guide, checklist, webinar) exchanged for contact details" },
  },
  socialProof: {
    term: { he: "הוכחה חברתית", en: "Social Proof" },
    definition: { he: "כשאנשים רואים שאחרים קנו/השתמשו — הם מרגישים בטוחים יותר לעשות את אותו דבר", en: "When people see others bought/used something — they feel safer doing the same" },
  },
  scarcity: {
    term: { he: "מחסור", en: "Scarcity" },
    definition: { he: "טכניקה שגורמת לאנשים לפעול מהר ע\"י הגבלת זמן או כמות: ״נשארו רק 3 מקומות!״", en: "Technique making people act fast by limiting time or quantity: 'Only 3 spots left!'" },
  },
};

export function getGlossaryTerm(key: string): GlossaryTerm | undefined {
  return glossary[key.toLowerCase()];
}

export function getAllGlossaryTerms(): { key: string; term: GlossaryTerm }[] {
  return Object.entries(glossary).map(([key, term]) => ({ key, term }));
}
