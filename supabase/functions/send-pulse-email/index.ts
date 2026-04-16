// ═══════════════════════════════════════════════
// send-pulse-email — Weekly archetype-specific digest
// Triggered by cron (weekly) or direct invocation.
// Fogg B=MAT: hot trigger via familiar channel (email).
// ═══════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PulseEmailPayload {
  userId: string;
  email: string;
  archetypeId?: string;
  planCount?: number;
  healthScore?: number;
}

const ARCHETYPE_SUBJECTS: Record<string, { he: string; en: string }> = {
  strategist: { he: "האסטרטגיה השבועית שלך מוכנה 🧠", en: "Your weekly strategy brief is ready 🧠" },
  optimizer:  { he: "נתוני השבוע + 3 אופטימיזציות 📊", en: "This week's data + 3 optimizations 📊" },
  pioneer:    { he: "3 הזדמנויות חדשות לשבוע הבא 🚀", en: "3 new opportunities for next week 🚀" },
  connector:  { he: "השבוע שלך: חיבורים + שיתופי פעולה 🤝", en: "Your week: connections + partnerships 🤝" },
  closer:     { he: "5 לידים חמים — נסגור אותם ⚡", en: "5 hot leads — let's close them ⚡" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey   = Deno.env.get("RESEND_API_KEY");

    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload: PulseEmailPayload = await req.json();
    const { userId, email, archetypeId = "optimizer", planCount = 0, healthScore } = payload;

    const subject = ARCHETYPE_SUBJECTS[archetypeId] ?? ARCHETYPE_SUBJECTS.optimizer;
    const isHe = true; // default Hebrew; extend with user preference

    const htmlBody = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><title>FunnelForge Weekly</title></head>
<body style="font-family: Arial, sans-serif; background: #0f0f12; color: #e0e0e0; padding: 24px; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #7c3aed; font-size: 20px;">${subject[isHe ? "he" : "en"]}</h1>
  <p style="color: #a0a0b0;">${isHe ? "שלום," : "Hey,"}</p>
  <p>${isHe
    ? `השבוע יש לך <strong>${planCount} תוכניות</strong> פעילות${healthScore ? ` עם ציון בריאות של ${healthScore}/100` : ""}.`
    : `This week you have <strong>${planCount} active plans</strong>${healthScore ? ` with a health score of ${healthScore}/100` : ""}.`
  }</p>
  <div style="margin: 24px 0; padding: 16px; background: #1a1a2e; border-radius: 12px; border-right: 3px solid #7c3aed;">
    <p style="margin: 0; font-size: 14px;">${isHe
      ? "💡 <strong>פעולה מומלצת השבוע:</strong> כנס ל-FunnelForge ועדכן לפחות מודול אחד. עקביות = תוצאות."
      : "💡 <strong>Recommended action this week:</strong> Log into FunnelForge and update at least one module. Consistency = results."
    }</p>
  </div>
  <a href="https://funnelforge.app/dashboard" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
    ${isHe ? "כנס ל-Dashboard →" : "Open Dashboard →"}
  </a>
  <p style="margin-top: 24px; font-size: 11px; color: #666;">${isHe ? "לביטול הניוזלטר" : "Unsubscribe"}: <a href="https://funnelforge.app/unsubscribe?uid=${userId}" style="color: #666;">כאן</a></p>
</body>
</html>`;

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FunnelForge <pulse@funnelforge.app>",
        to: [email],
        subject: subject[isHe ? "he" : "en"],
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const err = await resendResponse.text();
      throw new Error(`Resend error: ${err}`);
    }

    // Log send in Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from("email_log").insert({
      user_id: userId,
      template: "weekly_pulse",
      archetype_id: archetypeId,
      sent_at: new Date().toISOString(),
    }).throwOnError().then(() => {}).catch(() => {});

    return new Response(
      JSON.stringify({ success: true, userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
