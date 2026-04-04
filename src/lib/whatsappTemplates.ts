/**
 * WhatsApp Funnel Templates — Pre-built Hebrew message templates
 * Ready to copy into WhatsApp Business for each funnel stage.
 * Israel: 97-98% WhatsApp penetration, Click-to-WA ads = -92% CPL.
 */

export interface WhatsAppTemplate {
  stage: string;
  stageName: { he: string; en: string };
  purpose: { he: string; en: string };
  template: { he: string; en: string };
  timing: { he: string; en: string };
  emoji: string;
}

const baseTemplates: WhatsAppTemplate[] = [
  {
    stage: "welcome",
    stageName: { he: "הודעת ברוכים הבאים", en: "Welcome Message" },
    purpose: { he: "תגובה אוטומטית ללקוח שפנה דרך Click-to-WhatsApp", en: "Auto-reply to customer from Click-to-WhatsApp ad" },
    template: {
      he: `היי {{שם}} 👋
תודה שפנית אלינו!

אני {{שם העסק}}, ואני שמח/ה שהגעת.

מה מעניין אותך?
1️⃣ לשמוע על {{מוצר/שירות}}
2️⃣ לקבל הצעת מחיר
3️⃣ לדבר עם נציג

פשוט שלח/י את המספר ואחזור אליך תוך דקות ⚡`,
      en: `Hi {{name}} 👋
Thanks for reaching out!

I'm {{business_name}}, glad you're here.

What interests you?
1️⃣ Learn about {{product/service}}
2️⃣ Get a quote
3️⃣ Talk to someone

Just send the number and I'll reply in minutes ⚡`,
    },
    timing: { he: "מיידי — תוך שניות מהפנייה", en: "Immediate — within seconds of inquiry" },
    emoji: "👋",
  },
  {
    stage: "value",
    stageName: { he: "הודעת ערך ראשונה", en: "First Value Message" },
    purpose: { he: "שליחת ערך לפני בקשה — עיקרון ההדדיות", en: "Deliver value before asking — Reciprocity principle" },
    template: {
      he: `{{שם}}, הכנתי בשבילך משהו 🎁

{{תיאור ליד מגנט — מדריך/צ'קליסט/טיפ}}

הנה הלינק: {{קישור}}

רוצה שאעזור לך ליישם את זה? 💬`,
      en: `{{name}}, I prepared something for you 🎁

{{lead magnet description — guide/checklist/tip}}

Here's the link: {{link}}

Want help implementing this? 💬`,
    },
    timing: { he: "24 שעות אחרי הודעת ברוכים הבאים", en: "24 hours after welcome message" },
    emoji: "🎁",
  },
  {
    stage: "social_proof",
    stageName: { he: "הוכחה חברתית", en: "Social Proof" },
    purpose: { he: "בניית אמון דרך סיפורי הצלחה — Social Proof + Loss Aversion", en: "Build trust through success stories — Social Proof + Loss Aversion" },
    template: {
      he: `{{שם}}, רציתי לשתף אותך 📊

{{שם לקוח}} מ{{תחום}} התחיל/ה בדיוק מאיפה שאתה/ה.

תוך {{זמן}}:
✅ {{תוצאה 1}}
✅ {{תוצאה 2}}
✅ {{תוצאה 3}}

רוצה לשמוע איך? 🤔`,
      en: `{{name}}, wanted to share 📊

{{client_name}} from {{field}} started exactly where you are.

Within {{time}}:
✅ {{result_1}}
✅ {{result_2}}
✅ {{result_3}}

Want to hear how? 🤔`,
    },
    timing: { he: "3 ימים אחרי הודעת הערך", en: "3 days after value message" },
    emoji: "📊",
  },
  {
    stage: "offer",
    stageName: { he: "הצעה עם דחיפות", en: "Offer with Urgency" },
    purpose: { he: "המרה — Scarcity + Anchoring + Loss Aversion", en: "Conversion — Scarcity + Anchoring + Loss Aversion" },
    template: {
      he: `{{שם}}, יש לי הצעה מיוחדת 🔥

{{תיאור ההצעה}}

💰 במקום {{מחיר מלא}} → רק {{מחיר מוזל}}
⏰ בתוקף עד {{תאריך}} (נשארו {{X}} מקומות)

לחץ/י כאן לפרטים: {{קישור}}

שאלות? פשוט תכתוב/י ואני כאן 💬`,
      en: `{{name}}, I have a special offer 🔥

{{offer_description}}

💰 Instead of {{full_price}} → only {{discount_price}}
⏰ Valid until {{date}} ({{X}} spots left)

Click here for details: {{link}}

Questions? Just reply and I'm here 💬`,
    },
    timing: { he: "5-7 ימים אחרי תחילת הקשר", en: "5-7 days after first contact" },
    emoji: "🔥",
  },
  {
    stage: "reengagement",
    stageName: { he: "הודעת הפעלה מחדש", en: "Re-engagement Message" },
    purpose: { he: "החזרת לקוח שלא הגיב — Pattern Interrupt + Curiosity Gap", en: "Re-engage inactive lead — Pattern Interrupt + Curiosity Gap" },
    template: {
      he: `{{שם}}, לא שמעתי ממך 🤔

אולי זה לא הזמן — ואני מבין/ה.

אבל רציתי לספר לך שמשהו השתנה:
{{חידוש/עדכון/הצעה חדשה}}

מעניין? 👀`,
      en: `{{name}}, haven't heard from you 🤔

Maybe it's not the right time — and I understand.

But I wanted to tell you something changed:
{{news/update/new_offer}}

Interested? 👀`,
    },
    timing: { he: "14 ימים אחרי אי-תגובה", en: "14 days after no response" },
    emoji: "🤔",
  },
  {
    stage: "referral",
    stageName: { he: "בקשת המלצה", en: "Referral Request" },
    purpose: { he: "הפיכת לקוח לשגריר — Network Effect + Reciprocity", en: "Turn customer into advocate — Network Effect + Reciprocity" },
    template: {
      he: `{{שם}}, אני ממש שמח/ה שנהנית מ{{מוצר/שירות}} 🙏

יש לי בקשה קטנה:
מכיר/ה מישהו שיכול להתאים?

על כל חבר/ה שמצטרף/ת:
🎁 {{תמריץ ללקוח}} בשבילך
🎁 {{תמריץ לחבר}} בשביל החבר/ה

פשוט שלח/י את ההודעה הזו ← {{לינק הפניה}}`,
      en: `{{name}}, I'm glad you enjoy {{product/service}} 🙏

Small ask:
Know someone who'd be a good fit?

For every friend who joins:
🎁 {{customer_incentive}} for you
🎁 {{friend_incentive}} for them

Just forward this → {{referral_link}}`,
    },
    timing: { he: "30 ימים אחרי רכישה", en: "30 days after purchase" },
    emoji: "🙏",
  },
];

export function getWhatsAppTemplates(): WhatsAppTemplate[] {
  return baseTemplates;
}

export function getWhatsAppCostEstimate(monthlyConversations: number): {
  marketing: { he: string; en: string };
  utility: { he: string; en: string };
  total: { he: string; en: string };
} {
  // Based on July 2025 Meta pricing per template message
  const marketingCost = monthlyConversations * 0.065; // ~$0.065 avg
  const utilityCost = monthlyConversations * 0.02; // ~$0.02 avg
  const total = marketingCost + utilityCost;
  const shekelRate = 3.7;

  return {
    marketing: { he: `₪${Math.round(marketingCost * shekelRate)}`, en: `$${Math.round(marketingCost)}` },
    utility: { he: `₪${Math.round(utilityCost * shekelRate)}`, en: `$${Math.round(utilityCost)}` },
    total: { he: `~₪${Math.round(total * shekelRate)}/חודש`, en: `~$${Math.round(total)}/month` },
  };
}
