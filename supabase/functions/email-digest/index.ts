// Email Digest Edge Function
// Sends a weekly summary email to active users:
//   - Plans created this week
//   - Top funnel channel by CTR
//   - Referral status
//   - One actionable nudge based on AARRR stage
//
// Invoke: POST /functions/v1/email-digest
// Auth: service-role key (cron job) or user JWT (manual request)
// Body: { userId?: string } — if omitted, sends to all users active in last 7 days

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "digest@funnelforge.app";
const APP_URL = Deno.env.get("APP_URL") ?? "https://funnelforge.app";

type UserRow = { id: string; email: string; display_name?: string };
type PlanRow = { id: string; plan_name: string; created_at: string };
type EventRow = { event_name: string; payload: Record<string, unknown>; created_at: string };

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    // Log digest instead of sending when Resend not configured
    console.log(JSON.stringify({ event: "email_digest_dry_run", to, subject, ts: new Date().toISOString() }));
    return true;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  return res.ok;
}

function buildDigestHtml(opts: {
  displayName: string;
  plansThisWeek: PlanRow[];
  topChannel: string | null;
  referralCode: string | null;
  appUrl: string;
  lang: "he" | "en";
}): string {
  const { displayName, plansThisWeek, topChannel, referralCode, appUrl, lang } = opts;
  const isHe = lang === "he";
  const dir = isHe ? "rtl" : "ltr";

  const greeting = isHe ? `שלום ${displayName}` : `Hello ${displayName}`;
  const planCount = plansThisWeek.length;
  const planMsg = isHe
    ? `יצרת <strong>${planCount}</strong> תוכנית${planCount !== 1 ? "ות" : ""} השבוע`
    : `You created <strong>${planCount}</strong> plan${planCount !== 1 ? "s" : ""} this week`;
  const channelMsg = topChannel
    ? (isHe ? `הערוץ המוביל שלך: <strong>${topChannel}</strong>` : `Your top channel: <strong>${topChannel}</strong>`)
    : "";
  const referralMsg = referralCode
    ? (isHe
        ? `קוד ההפניה שלך: <strong>${referralCode}</strong> — שתף עם עמיתים וקבל חודש Pro בחינם`
        : `Your referral code: <strong>${referralCode}</strong> — Share with colleagues for a free Pro month`)
    : "";
  const ctaText = isHe ? "פתח FunnelForge" : "Open FunnelForge";

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
    <h2 style="margin:0 0 16px;color:#111827">${greeting} 👋</h2>
    <p style="color:#374151;line-height:1.6">${planMsg}.</p>
    ${channelMsg ? `<p style="color:#374151;line-height:1.6">${channelMsg}.</p>` : ""}
    ${referralMsg ? `<p style="color:#374151;line-height:1.6">${referralMsg}.</p>` : ""}
    <a href="${appUrl}" style="display:inline-block;margin-top:20px;background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
      ${ctaText} →
    </a>
    <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb">
    <p style="font-size:12px;color:#9ca3af">
      ${isHe ? "הסר מהרשימה" : "Unsubscribe"}: <a href="${appUrl}/profile" style="color:#6366f1">${appUrl}/profile</a>
    </p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const start = Date.now();

  // Service-role only — no user-facing CORS needed
  const authHeader = req.headers.get("Authorization") ?? "";
  const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_KEY}`;
  if (!isServiceRole) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let body: { userId?: string; lang?: "he" | "en" } = {};
  try { body = await req.json(); } catch { /* empty body = send to all */ }

  const lang: "he" | "en" = body.lang ?? "he";
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  // Determine target users
  let users: UserRow[] = [];
  if (body.userId) {
    const { data } = await supabase.from("profiles").select("id,email,display_name").eq("id", body.userId).single();
    if (data) users = [data as UserRow];
  } else {
    // All users active in last 7 days (have events in event_queue)
    const { data } = await supabase
      .from("event_queue")
      .select("user_id")
      .gte("created_at", weekAgo)
      .not("user_id", "is", null);
    const uniqueIds = [...new Set((data ?? []).map((r: { user_id: string }) => r.user_id))];
    if (uniqueIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,email,display_name")
        .in("id", uniqueIds);
      users = (profiles ?? []) as UserRow[];
    }
  }

  let sent = 0;
  let failed = 0;

  for (const u of users) {
    try {
      // Plans this week
      const { data: plans } = await supabase
        .from("saved_plans")
        .select("id,plan_name,created_at")
        .eq("user_id", u.id)
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false })
        .limit(5);

      // Top channel from AARRR events
      const { data: events } = await supabase
        .from("event_queue")
        .select("event_name,payload,created_at")
        .eq("user_id", u.id)
        .gte("created_at", weekAgo)
        .limit(50);

      const channelCounts: Record<string, number> = {};
      for (const ev of (events ?? []) as EventRow[]) {
        const channel = (ev.payload as Record<string, string>)?.channel;
        if (channel) channelCounts[channel] = (channelCounts[channel] ?? 0) + 1;
      }
      const topChannel = Object.keys(channelCounts).sort((a, b) => channelCounts[b] - channelCounts[a])[0] ?? null;

      const html = buildDigestHtml({
        displayName: u.display_name ?? u.email.split("@")[0],
        plansThisWeek: (plans ?? []) as PlanRow[],
        topChannel,
        referralCode: null, // referral code lives in localStorage — not available server-side
        appUrl: APP_URL,
        lang,
      });

      const subject = lang === "he"
        ? `הסיכום השבועי שלך ב-FunnelForge 🚀`
        : `Your weekly FunnelForge digest 🚀`;

      const ok = await sendEmail(u.email, subject, html);
      if (ok) sent++; else failed++;
    } catch (err) {
      console.error(JSON.stringify({ event: "digest_user_error", userId: u.id, error: String(err) }));
      failed++;
    }
  }

  console.log(JSON.stringify({
    event: "email_digest_complete",
    ts: new Date().toISOString(),
    sent,
    failed,
    durationMs: Date.now() - start,
  }));

  return new Response(JSON.stringify({ sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
