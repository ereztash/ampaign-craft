// ═══════════════════════════════════════════════
// Retention & Growth — Embedded Knowledge Base
// Cross-domain: Nir Eyal × Lincoln Murphy × Klaviyo × Israeli Market
// ═══════════════════════════════════════════════

import { OnboardingStep, ChurnSignal, RetentionTrigger } from "@/types/retention";

// === ONBOARDING SEQUENCES BY BUSINESS TYPE ===

export const ONBOARDING_SEQUENCES: Record<string, OnboardingStep[]> = {
  ecommerce: [
    { day: 0, name: { he: "אישור הזמנה", en: "Order Confirmation" }, channel: "email", emoji: "📦",
      template: { he: "היי {שם}! ההזמנה שלך בדרך 🎉\nמספר מעקב: {tracking}\nצפי הגעה: {date}", en: "Hey {name}! Your order is on its way 🎉\nTracking: {tracking}\nETA: {date}" },
      goal: { he: "ביטחון — ההזמנה עברה", en: "Reassurance — order went through" } },
    { day: 1, name: { he: "איך להפיק את המקסימום", en: "How to Get the Most" }, channel: "whatsapp", emoji: "💡",
      template: { he: "היי {שם}, הזמנת {מוצר} — מעולה! 💡\nהנה 3 טיפים שיעזרו לך להפיק ממנו את המקסימום:", en: "Hey {name}, you ordered {product} — great! 💡\nHere are 3 tips to get the most from it:" },
      goal: { he: "הפחתת חרטה + הגדלת ערך נתפס", en: "Reduce regret + increase perceived value" } },
    { day: 3, name: { he: "הוכחה חברתית", en: "Social Proof" }, channel: "email", emoji: "⭐",
      template: { he: "{שם}, ככה {שם_לקוח} משתמש/ת ב-{מוצר}:\n\"{ציטוט}\" ⭐⭐⭐⭐⭐", en: "{name}, here's how {customer} uses {product}:\n\"{quote}\" ⭐⭐⭐⭐⭐" },
      goal: { he: "אישור חברתי — בחרת נכון", en: "Social validation — you chose right" } },
    { day: 7, name: { he: "בקשת ביקורת", en: "Review Request" }, channel: "whatsapp", emoji: "📝",
      template: { he: "היי {שם}, איך ה-{מוצר}? 😊\nנשמח לביקורת קצרה (30 שניות):\n{link}\nכל ביקורת = ₪10 הנחה על ההזמנה הבאה!", en: "Hey {name}, how's the {product}? 😊\nWe'd love a quick review (30 sec):\n{link}\nEvery review = ₪10 off next order!" },
      goal: { he: "UGC + social proof + שיתוף", en: "UGC + social proof + sharing" } },
    { day: 14, name: { he: "הזמנה חוזרת", en: "Reorder Prompt" }, channel: "whatsapp", emoji: "🔄",
      template: { he: "היי {שם}, הגיע הזמן? 😉\nהזמן שוב עם 10% הנחה:\n{link}\nנגמר ב-{date}", en: "Hey {name}, time for a refill? 😉\nReorder with 10% off:\n{link}\nExpires {date}" },
      goal: { he: "רכישה חוזרת + FOMO", en: "Repeat purchase + FOMO" } },
  ],
  saas: [
    { day: 0, name: { he: "ברוכים הבאים + Quick Win", en: "Welcome + Quick Win" }, channel: "email", emoji: "🚀",
      template: { he: "ברוך/ה הבא/ה ל-{מוצר}! 🚀\nהנה הדבר הראשון שכדאי לעשות (2 דקות):\n{quickWinLink}\nזה יראה לך ערך מיידי.", en: "Welcome to {product}! 🚀\nHere's the first thing to do (2 min):\n{quickWinLink}\nThis will show you immediate value." },
      goal: { he: "הגע ל-aha moment תוך 24 שעות", en: "Reach aha moment within 24 hours" } },
    { day: 1, name: { he: "מדריך aha moment", en: "Aha Moment Guide" }, channel: "email", emoji: "💡",
      template: { he: "היי {שם}, אתמול התחלת — מעולה!\nהצעד הבא: {ahaAction}\nזה מה שהפריד בין משתמשים שנשארו לבין אלה שעזבו.", en: "Hey {name}, you started yesterday — great!\nNext step: {ahaAction}\nThis is what separates users who stay from those who leave." },
      goal: { he: "activation — הפעולה שמבדילה חוזרים מנוטשים", en: "activation — the action that separates retained from churned" } },
    { day: 3, name: { he: "גילוי פיצ'ר", en: "Feature Discovery" }, channel: "in_app", emoji: "🔍",
      template: { he: "ידעת ש-{מוצר} גם יכול {פיצר}?\nרוב המשתמשים מגלים את זה רק אחרי חודש — אבל אתה כבר כאן.", en: "Did you know {product} can also {feature}?\nMost users discover this after a month — but you're already here." },
      goal: { he: "הרחבת שימוש + sticky features", en: "Expand usage + sticky features" } },
    { day: 7, name: { he: "חגיגת Milestone", en: "Milestone Celebration" }, channel: "email", emoji: "🎉",
      template: { he: "🎉 שבוע ראשון ב-{מוצר}!\nהנה מה שהשגת עד עכשיו: {achievements}\nאתה בדרך הנכונה.", en: "🎉 First week at {product}!\nHere's what you've achieved: {achievements}\nYou're on the right track." },
      goal: { he: "dopamine + identity lock-in", en: "dopamine + identity lock-in" } },
    { day: 14, name: { he: "הזמנה לשדרוג", en: "Upgrade Invitation" }, channel: "email", emoji: "⬆️",
      template: { he: "היי {שם}, אתה משתמש ב-80% מהפיצ'רים של החינמי.\nהמשתמשים ברמה שלך בדרך כלל עוברים ל-Pro ורואים {result}.\nנסה 7 ימים חינם: {link}", en: "Hey {name}, you're using 80% of free features.\nUsers at your level usually go Pro and see {result}.\nTry 7 days free: {link}" },
      goal: { he: "expansion revenue", en: "expansion revenue" } },
  ],
  services: [
    { day: 0, name: { he: "Kickoff", en: "Kickoff" }, channel: "email", emoji: "🤝",
      template: { he: "היי {שם}, מתרגש/ת שמתחילים! 🤝\nהנה מה שצפוי בשבועות הקרובים:\n1. {step1}\n2. {step2}\n3. {step3}\nשאלות? אני כאן.", en: "Hey {name}, excited to start! 🤝\nHere's what to expect:\n1. {step1}\n2. {step2}\n3. {step3}\nQuestions? I'm here." },
      goal: { he: "הגדרת ציפיות + ביטחון", en: "Set expectations + confidence" } },
    { day: 1, name: { he: "הגדרת ציפיות", en: "Expectations Setting" }, channel: "whatsapp", emoji: "📋",
      template: { he: "היי {שם}, רק לוודא — הבנתי שהמטרה העיקרית שלך היא {goal}.\nאם משהו השתנה, ספר/י לי. אני מתאים את הגישה.", en: "Hey {name}, just confirming — your main goal is {goal}.\nIf anything changed, let me know. I'll adjust my approach." },
      goal: { he: "personalization signal + trust", en: "personalization signal + trust" } },
    { day: 7, name: { he: "צ'ק-אין ראשון", en: "First Check-In" }, channel: "whatsapp", emoji: "📞",
      template: { he: "היי {שם}, שבוע ראשון! 📞\nמה עבד? מה עוד לא?\nרוצה שנדבר 10 דקות?", en: "Hey {name}, first week! 📞\nWhat worked? What didn't?\nWant a 10-min call?" },
      goal: { he: "early warning + relationship building", en: "early warning + relationship building" } },
    { day: 30, name: { he: "סיכום חודשי (QBR)", en: "Monthly Review (QBR)" }, channel: "email", emoji: "📊",
      template: { he: "היי {שם}, הנה הסיכום החודשי שלך:\n📊 מה הושג: {results}\n🎯 מה בתוכנית: {nextSteps}\n💡 המלצה: {recommendation}", en: "Hey {name}, here's your monthly summary:\n📊 Achieved: {results}\n🎯 Next: {nextSteps}\n💡 Recommendation: {recommendation}" },
      goal: { he: "ROI visibility + upsell foundation", en: "ROI visibility + upsell foundation" } },
    { day: 60, name: { he: "הזמנה להפניה", en: "Referral Invitation" }, channel: "whatsapp", emoji: "🤝",
      template: { he: "היי {שם}, שמח/ה שאת/ה מרוצה! 🤝\nיש לך חבר/ה שזה יכול לעזור לו/ה?\nכל הפניה = {reward} לשניכם.", en: "Hey {name}, glad you're happy! 🤝\nKnow someone this could help?\nEvery referral = {reward} for both of you." },
      goal: { he: "referral + social proof", en: "referral + social proof" } },
  ],
  creator: [
    { day: 0, name: { he: "ברוכים הבאים לקהילה", en: "Welcome to the Community" }, channel: "whatsapp", emoji: "🌟",
      template: { he: "ברוך/ה הבא/ה למשפחה! 🌟\nהנה הקישור לקבוצה: {link}\nהתחל/י בהצגה קצרה של עצמך — הקהילה מחכה!", en: "Welcome to the family! 🌟\nHere's the group link: {link}\nStart with a quick intro — the community is waiting!" },
      goal: { he: "belonging + first interaction", en: "belonging + first interaction" } },
    { day: 3, name: { he: "ערך ראשון", en: "First Value Delivery" }, channel: "email", emoji: "🎁",
      template: { he: "היי {שם}, הנה הדבר הראשון שהבטחתי:\n{contentLink}\nזה לבד שווה את ההשקעה. יש עוד הרבה.", en: "Hey {name}, here's the first thing I promised:\n{contentLink}\nThis alone is worth the investment. There's much more." },
      goal: { he: "immediate value delivery", en: "immediate value delivery" } },
    { day: 7, name: { he: "אתגר / משימה", en: "Challenge / Assignment" }, channel: "whatsapp", emoji: "🏋️",
      template: { he: "שבוע ראשון! 🏋️\nהנה האתגר שלך השבוע: {challenge}\nשתף/י את התוצאה בקבוצה — הכי טוב מקבל {prize}", en: "First week! 🏋️\nHere's your challenge: {challenge}\nShare results in the group — best one wins {prize}" },
      goal: { he: "engagement + IKEA effect", en: "engagement + IKEA effect" } },
    { day: 14, name: { he: "Upsell", en: "Upsell Opportunity" }, channel: "email", emoji: "⬆️",
      template: { he: "היי {שם}, ראיתי שאת/ה {engagement}.\nלמשתמשים ברמה שלך מומלץ {upsell}.\nמוכן/ה לשלב הבא?", en: "Hey {name}, I see you're {engagement}.\nFor users at your level I recommend {upsell}.\nReady for the next level?" },
      goal: { he: "expansion revenue", en: "expansion revenue" } },
  ],
};

// === CHURN PREDICTION SIGNALS ===

export const CHURN_SIGNALS: ChurnSignal[] = [
  { signal: { he: "כשל תשלום (כרטיס אשראי)", en: "Payment failure (credit card)" }, risk: "critical",
    intervention: { he: "שלח Dunning email מיידי + SMS + WhatsApp. הצע עדכון פרטי תשלום", en: "Send immediate dunning email + SMS + WhatsApp. Offer payment update" }, channel: "email+whatsapp" },
  { signal: { he: "ירידה של 50%+ בשימוש ב-14 יום", en: "50%+ usage drop in 14 days" }, risk: "high",
    intervention: { he: "WhatsApp אישי: 'שמתי לב שלא השתמשת — מה חוסם?' + הצע שיחה", en: "Personal WhatsApp: 'Noticed you haven't used — what's blocking?' + offer a call" }, channel: "whatsapp" },
  { signal: { he: "אין כניסה 30+ יום", en: "No login 30+ days" }, risk: "high",
    intervention: { he: "Win-back campaign: תוכן חדש + הצעה מיוחדת + FOMO", en: "Win-back campaign: new content + special offer + FOMO" }, channel: "email" },
  { signal: { he: "פנייה לתמיכה ללא מענה 48+ שעות", en: "Support ticket unanswered 48+ hours" }, risk: "medium",
    intervention: { he: "אסקלציה מיידית + מענה אישי + פיצוי (חודש חינם)", en: "Immediate escalation + personal response + compensation (free month)" }, channel: "email" },
  { signal: { he: "אימוץ פיצ'רים <20% אחרי 30 יום", en: "Feature adoption <20% after 30 days" }, risk: "medium",
    intervention: { he: "סדרת emails של feature discovery + webinar + שיחת onboarding", en: "Feature discovery email series + webinar + onboarding call" }, channel: "email" },
];

// === REFERRAL TEMPLATES ===

export interface ReferralTemplate {
  model: "two_sided" | "one_sided" | "tiered";
  label: { he: string; en: string };
  mechanics: { he: string; en: string };
  reward: { he: string; en: string };
  whatsappTemplate: { he: string; en: string };
}

export const REFERRAL_TEMPLATES: ReferralTemplate[] = [
  { model: "two_sided",
    label: { he: "הפניה דו-צדדית", en: "Two-Sided Referral" },
    mechanics: { he: "הפנה חבר → שניכם מקבלים הטבה", en: "Refer a friend → both get a reward" },
    reward: { he: "₪50 הנחה לכל אחד / חודש חינם לשניכם", en: "₪50 off each / free month for both" },
    whatsappTemplate: { he: "היי! אני משתמש/ת ב-{מוצר} וזה פשוט מעולה.\nדרך הלינק הזה גם אתה וגם אני מקבלים {reward}:\n{link}", en: "Hey! I'm using {product} and it's amazing.\nThrough this link we both get {reward}:\n{link}" } },
  { model: "one_sided",
    label: { he: "הפניה חד-צדדית", en: "One-Sided Referral" },
    mechanics: { he: "הפנה → אתה מקבל הטבה", en: "Refer → you get a reward" },
    reward: { he: "חודש חינם על כל הפניה מוצלחת", en: "Free month for every successful referral" },
    whatsappTemplate: { he: "היי! תנסה את {מוצר} — לגמרי שינה לי את ה-{benefit}.\nהנה לינק: {link}", en: "Hey! Try {product} — totally changed my {benefit}.\nHere's a link: {link}" } },
  { model: "tiered",
    label: { he: "הפניות מדורגות", en: "Tiered Referral Program" },
    mechanics: { he: "3 הפניות = Silver, 10 = Gold, 25 = Platinum", en: "3 referrals = Silver, 10 = Gold, 25 = Platinum" },
    reward: { he: "Silver: 10% הנחה | Gold: 25% הנחה | Platinum: חינם לנצח", en: "Silver: 10% off | Gold: 25% off | Platinum: free forever" },
    whatsappTemplate: { he: "היי! אני כבר {tier} ב-{מוצר}. אם תצטרף דרכי אני מתקדם ל-{nextTier}:\n{link}", en: "Hey! I'm already {tier} at {product}. If you join through me I advance to {nextTier}:\n{link}" } },
];

// === RETENTION TRIGGERS ===

export const RETENTION_TRIGGERS: RetentionTrigger[] = [
  { trigger: { he: "יום הולדת ללקוח", en: "Customer Birthday" }, timing: { he: "ביום ההולדת", en: "On birthday" },
    channel: "whatsapp", action: { he: "הודעה אישית + קופון מתנה", en: "Personal message + gift coupon" }, emoji: "🎂" },
  { trigger: { he: "יום שנה לרכישה הראשונה", en: "First Purchase Anniversary" }, timing: { he: "12 חודשים", en: "12 months" },
    channel: "email", action: { he: "סיכום שנתי + הצעה מיוחדת", en: "Annual summary + special offer" }, emoji: "🎉" },
  { trigger: { he: "השלמת 10 רכישות", en: "10th Purchase Milestone" }, timing: { he: "ברכישה ה-10", en: "On 10th purchase" },
    channel: "whatsapp", action: { he: "תודה + סטטוס VIP + הפתעה", en: "Thank you + VIP status + surprise" }, emoji: "🏆" },
  { trigger: { he: "חג ישראלי", en: "Israeli Holiday" }, timing: { he: "3 ימים לפני", en: "3 days before" },
    channel: "whatsapp", action: { he: "ברכת חג + הצעה עונתית", en: "Holiday greeting + seasonal offer" }, emoji: "🕎" },
  { trigger: { he: "ביקורת חיובית", en: "Positive Review" }, timing: { he: "מיד אחרי", en: "Immediately after" },
    channel: "whatsapp", action: { he: "תודה + בקשת הפניה", en: "Thank you + referral request" }, emoji: "⭐" },
];
