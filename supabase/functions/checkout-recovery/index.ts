// ═══════════════════════════════════════════════
// checkout-recovery — Abandoned checkout email
// Fires when checkoutStarted without conversionCompleted
// within 10 minutes. DISC-specific persuasion copy.
// Behavioral: Cialdini Commitment (they started → remind).
// ═══════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecoveryPayload {
  userId: string;
  email: string;
  tier: "lite" | "pro" | "business";
  archetypeId?: string;
}

// DISC-archetype recovery copy (Cialdini Commitment: "you already started")
const RECOVERY_COPY: Record<string, {
  subject: { he: string; en: string };
  body: { he: string; en: string };
}> = {
  closer: {
    subject: { he: "⚡ עצרת. שחקנים מהטובים לא עוצרים.", en: "⚡ You stopped. Top closers don't stop." },
    body: { he: "התחלת לשדרג ל-Pro. הלחיצה האחרונה נשארת. כל יום בלי זה = הפסד ₪2,400 בממוצע.", en: "You started upgrading to Pro. One click remains. Each day without it = ~₪2,400 lost." },
  },
  strategist: {
    subject: { he: "📊 הנתונים: עסקים שסיימו את השדרוג ראו 4.2× ROI", en: "📊 Data: businesses that completed upgrade saw 4.2× ROI" },
    body: { he: "התחלת. הנתונים מראים שהשלב האחרון הוא הקריטי ביותר. החזר ROI תוך 90 יום.", en: "You started. Data shows the last step is the most critical. ROI recovered within 90 days." },
  },
  optimizer: {
    subject: { he: "📈 63% שיפור בהמרות — צעד אחרון נשאר", en: "📈 63% conversion boost — one step remaining" },
    body: { he: "המשתמשים שסיימו שדרוג לראו עלייה ממוצעת של 63% בהמרות תוך חודש. צעד אחד נשאר.", en: "Users who completed the upgrade saw an average 63% conversion improvement within a month. One step remaining." },
  },
  pioneer: {
    subject: { he: "🚀 3,247 חלוצים שדרגו השבוע — אחד קדימה", en: "🚀 3,247 pioneers upgraded this week — one step ahead" },
    body: { he: "אתה כמעט שם. כל שבוע שעובר = חלון הזדמנות שנסגר. צעד אחד נשאר לשדרוג.", en: "You're almost there. Every week that passes = a closing opportunity window. One step left to upgrade." },
  },
  connector: {
    subject: { he: "🤝 נשאר רק צעד — ולגלות את הקהילה", en: "🤝 One step left — and access the community" },
    body: { he: "שדרוג ל-Pro פותח את גישה לקהילה הפרטית. 30 יום ניסיון חינמי, ביטול בלחיצה.", en: "Upgrading to Pro opens access to the private community. 30-day free trial, cancel with one click." },
  },
};

const TIER_NAMES = { lite: "Lite", pro: "Pro", business: "Business" };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload: RecoveryPayload = await req.json();
    const { userId, email, tier, archetypeId = "optimizer" } = payload;
    const copy = RECOVERY_COPY[archetypeId] ?? RECOVERY_COPY.optimizer;
    const tierName = TIER_NAMES[tier] ?? "Pro";

    // Default to Hebrew
    const isHe = true;
    const subject = copy.subject[isHe ? "he" : "en"];
    const body = copy.body[isHe ? "he" : "en"];

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #0f0f12; color: #e0e0e0; padding: 24px; max-width: 480px; margin: 0 auto;">
  <h2 style="color: #7c3aed;">${subject}</h2>
  <p style="color: #a0a0b0;">${body}</p>
  <a href="https://funnelforge.app/pricing" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">
    השלם שדרוג ל-${tierName} →
  </a>
  <p style="margin-top: 24px; font-size: 11px; color: #666;">
    <a href="https://funnelforge.app/unsubscribe?uid=${userId}" style="color: #666;">הסרה מרשימה</a>
  </p>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FunnelForge <checkout@funnelforge.app>",
        to: [email],
        subject,
        html,
      }),
    });

    if (!res.ok) throw new Error(`Resend: ${await res.text()}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
