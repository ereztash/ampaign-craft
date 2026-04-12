// ═══════════════════════════════════════════════
// Fallback Templates — Pre-written copy for when LLM is unavailable
// Used by aiCopyService when circuit breaker trips or budget exceeded.
// 10 industries × 4 task types = 40 templates (bilingual)
// ═══════════════════════════════════════════════

export interface FallbackTemplate {
  he: string;
  en: string;
}

export type FallbackTaskType = "headline" | "ad-copy" | "email" | "whatsapp";

const TEMPLATES: Record<string, Record<FallbackTaskType, FallbackTemplate>> = {
  fashion: {
    headline: { he: "הסגנון שלך. המחיר שלך. עכשיו.", en: "Your style. Your price. Now." },
    "ad-copy": { he: "מבחר הבגדים שלנו מותאם בדיוק לסגנון שלך — חדש באתר, בואו לגלות.", en: "Our collection is tailored to your style — new arrivals, come discover." },
    email: { he: "היי! רצינו לעדכן — הגיעה קולקציה חדשה שחיכינו לה. בואו לראות לפני שנגמר.", en: "Hey! Just wanted to let you know — a new collection just dropped. Check it out before it's gone." },
    whatsapp: { he: "היי! 🛍️ יש לנו פריטים חדשים שיתאימו בול בשבילך. לחצו כאן לצפייה →", en: "Hey! 🛍️ We have new items perfect for you. Click here to browse →" },
  },
  tech: {
    headline: { he: "פתרון טכנולוגי שחוסך לך זמן ותקציב", en: "Tech solution that saves you time and budget" },
    "ad-copy": { he: "חברות כמו שלך כבר חוסכות 30% מהזמן עם הפלטפורמה שלנו. הגיע הזמן שגם אתם.", en: "Companies like yours already save 30% of their time with our platform. It's your turn." },
    email: { he: "שלום, רציתי לשתף אותך בפתרון שכבר עוזר ל-200+ עסקים לייעל תהליכים.", en: "Hi, wanted to share a solution already helping 200+ businesses streamline operations." },
    whatsapp: { he: "היי! 💡 חקרנו את הצרכים של חברות כמו שלכם — יש לנו פתרון מעניין. מתאים לשיחה?", en: "Hi! 💡 We studied companies like yours — we have something interesting. Up for a chat?" },
  },
  food: {
    headline: { he: "טעם שמחזיר את הלקוחות — שוב ושוב", en: "Flavor that brings customers back — again and again" },
    "ad-copy": { he: "האוכל שלנו מדבר בעד עצמו — אבל הביקורות של הלקוחות מדברות חזק יותר.", en: "Our food speaks for itself — but our customers' reviews speak louder." },
    email: { he: "שלום! רצינו להזמין אותך לטעום את התפריט החדש שלנו — הפתעות מחכות.", en: "Hi! We'd love to invite you to try our new menu — surprises await." },
    whatsapp: { he: "היי! 🍽️ תפריט חדש השבוע. רוצים להזמין שולחן? שלחו 'כן' ונחזור אליכם.", en: "Hey! 🍽️ New menu this week. Want to reserve? Reply 'yes' and we'll get back to you." },
  },
  services: {
    headline: { he: "שירות מקצועי שאפשר לסמוך עליו", en: "Professional service you can rely on" },
    "ad-copy": { he: "הלקוחות שלנו נשארים כי אנחנו מספקים תוצאות — לא רק הבטחות.", en: "Our clients stay because we deliver results — not just promises." },
    email: { he: "שלום, רציתי להציע לך שיחת היכרות קצרה — בלי התחייבות, רק ערך.", en: "Hi, I'd like to offer a short introductory call — no commitment, just value." },
    whatsapp: { he: "היי! 👋 ראיתי שאתם מחפשים פתרון ב{field}. אני מומחה בתחום — רוצים לדבר?", en: "Hey! 👋 I noticed you're looking for a {field} solution. I'm an expert — want to chat?" },
  },
  education: {
    headline: { he: "למד. יישם. צמח.", en: "Learn. Apply. Grow." },
    "ad-copy": { he: "הקורס שלנו כבר שינה את הקריירה של מאות סטודנטים. הבא בתור — אתה.", en: "Our course has already transformed hundreds of careers. You're next." },
    email: { he: "שלום! יש לנו תוכן חדש שיעזור לך להתקדם — בואו לראות.", en: "Hi! We have new content to help you advance — come check it out." },
    whatsapp: { he: "היי! 📚 שיעור חדש עלה למערכת. כנסו עכשיו לצפות →", en: "Hey! 📚 A new lesson is live. Watch now →" },
  },
  health: {
    headline: { he: "הבריאות שלך. הדרך שלך.", en: "Your health. Your way." },
    "ad-copy": { he: "אנחנו מאמינים שכל אחד יכול לשפר את הבריאות שלו — צעד אחד קטן בכל פעם.", en: "We believe everyone can improve their health — one small step at a time." },
    email: { he: "שלום! רצינו לשתף איתך טיפים פשוטים שעוזרים ללקוחות שלנו להרגיש טוב יותר.", en: "Hi! Wanted to share simple tips that help our clients feel better." },
    whatsapp: { he: "היי! 💚 תזכורת ידידותית — יש לנו תור פנוי השבוע. רוצים לקבוע?", en: "Hey! 💚 Friendly reminder — we have a slot open this week. Want to book?" },
  },
  realEstate: {
    headline: { he: "הנכס הבא שלך מחכה — אל תפספסו", en: "Your next property is waiting — don't miss out" },
    "ad-copy": { he: "עסקאות אמיתיות מגיעות ממומחים אמיתיים. 15 שנות ניסיון בשוק הנדל\"ן.", en: "Real deals come from real experts. 15 years of real estate experience." },
    email: { he: "שלום! יש לנו נכסים חדשים שהגיעו לשוק — רוצים לקבל עדכון?", en: "Hi! We have new properties on the market — want an update?" },
    whatsapp: { he: "היי! 🏠 נכס חדש שלא תמצאו בפורטלים. מעוניינים בפרטים?", en: "Hey! 🏠 A new property you won't find on portals. Interested in details?" },
  },
  tourism: {
    headline: { he: "חוויה שלא תשכחו — מתחילה כאן", en: "An unforgettable experience — starts here" },
    "ad-copy": { he: "הנוסעים שלנו חוזרים כי אנחנו לא מוכרים טיולים — אנחנו יוצרים זכרונות.", en: "Our travelers return because we don't sell trips — we create memories." },
    email: { he: "שלום! חלמתם על חופשה? יש לנו הצעה מיוחדת שלא כדאי לפספס.", en: "Hi! Dreaming of a vacation? We have a special offer you shouldn't miss." },
    whatsapp: { he: "היי! ✈️ דיל אחרון לשבוע הבא — מקומות מוגבלים. לחצו לפרטים →", en: "Hey! ✈️ Last-minute deal for next week — limited spots. Click for details →" },
  },
  personalBrand: {
    headline: { he: "הסיפור שלך הוא המותג שלך", en: "Your story is your brand" },
    "ad-copy": { he: "אנשים קונים מאנשים. בואו ללמוד איך לבנות מותג אישי שמוכר בשבילכם.", en: "People buy from people. Learn how to build a personal brand that sells for you." },
    email: { he: "שלום! רוצה לחזק את הנוכחות הדיגיטלית שלך? יש לנו תוכנית מותאמת.", en: "Hi! Want to strengthen your digital presence? We have a tailored plan." },
    whatsapp: { he: "היי! 🎯 טיפ מהיר למותג אישי: פרסמו תוכן אותנטי 3 פעמים בשבוע. רוצים עוד?", en: "Hey! 🎯 Quick personal brand tip: post authentic content 3x/week. Want more?" },
  },
  other: {
    headline: { he: "העסק שלך. האסטרטגיה שלנו. תוצאות אמיתיות.", en: "Your business. Our strategy. Real results." },
    "ad-copy": { he: "אנחנו עוזרים לעסקים כמו שלך לצמוח — עם אסטרטגיה מבוססת נתונים.", en: "We help businesses like yours grow — with data-driven strategy." },
    email: { he: "שלום! רצינו לשתף כמה תובנות שיווקיות שיכולות לעזור לעסק שלך.", en: "Hi! Wanted to share some marketing insights that could help your business." },
    whatsapp: { he: "היי! 👋 רוצים לדעת איך לשפר את השיווק שלכם? שלחו 'כן' ונחזור.", en: "Hey! 👋 Want to improve your marketing? Reply 'yes' and we'll get back." },
  },
};

/**
 * Get a fallback template for a given industry and task type.
 * Falls back to "other" if the specific industry doesn't exist.
 */
export function getFallbackTemplate(
  businessField: string,
  taskType: FallbackTaskType,
): FallbackTemplate {
  const industry = TEMPLATES[businessField] ?? TEMPLATES.other;
  return industry[taskType] ?? TEMPLATES.other[taskType];
}

/**
 * Map CopyTask to FallbackTaskType.
 */
export function mapTaskToFallback(task: string): FallbackTaskType {
  if (task.includes("headline") || task.includes("social")) return "headline";
  if (task.includes("email")) return "email";
  if (task.includes("whatsapp")) return "whatsapp";
  return "ad-copy";
}
