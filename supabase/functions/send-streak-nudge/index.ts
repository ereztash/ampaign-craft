// ═══════════════════════════════════════════════
// send-streak-nudge — Fogg Hot Trigger
// Fires when streak is at risk (≥12h since last visit).
// Behavioral: hot trigger delivered via high-attention channel.
// ═══════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NudgePayload {
  userId: string;
  email: string;
  streakDays: number;
  archetypeId?: string;
}

const NUDGE_MESSAGES: Record<string, { subject: string; body: string }> = {
  closer:    { subject: "⚡ הסטריק שלך בסכנה — 1 דקה שומרת אותו", body: "שחקני מכירות מהטובים לא נשברים באמצע. כנס עכשיו ושמור על הסטריק." },
  strategist:{ subject: "🧠 הסטריק שלך: {N} ימים. אל תפסיד אותם", body: "הנתונים ברורים: עקביות יומית = ROI של 4×. כנס ב-2 דקות." },
  optimizer: { subject: "📊 אזהרה: הסטריק שלך עומד לאיפוס", body: "כל יום מוסיף 3% לביצועים הממוצעים. שמור על הרצף." },
  pioneer:   { subject: "🚀 חלוצים לא עוצרים באמצע הדרך", body: "ביקור קצר = הרגל שנבנה. כנס ב-60 שניות." },
  connector: { subject: "🤝 הקהילה שלך מחכה לך", body: "שמור על הרצף — זה מה שמבדיל את המצליחים." },
};

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

    const payload: NudgePayload = await req.json();
    const { userId, email, streakDays, archetypeId = "optimizer" } = payload;
    const template = NUDGE_MESSAGES[archetypeId] ?? NUDGE_MESSAGES.optimizer;

    const subject = template.subject.replace("{N}", String(streakDays));
    const body = template.body;

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #0f0f12; color: #e0e0e0; padding: 24px; max-width: 480px; margin: 0 auto;">
  <h2 style="color: #f97316;">${subject}</h2>
  <p>${body}</p>
  <p style="font-weight: bold;">הסטריק שלך: <span style="color: #f97316; font-size: 24px;">${streakDays}</span> ימים</p>
  <a href="https://funnelforge.app/dashboard" style="display: inline-block; background: #f97316; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 12px;">
    שמור על הסטריק →
  </a>
  <p style="margin-top: 24px; font-size: 11px; color: #666;"><a href="https://funnelforge.app/unsubscribe?uid=${userId}" style="color: #666;">הסרה מרשימה</a></p>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "FunnelForge <nudge@funnelforge.app>",
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
