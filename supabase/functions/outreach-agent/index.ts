// Outreach Agent Edge Function
//
// Turns blind-spot detection into autonomous multi-channel outreach:
//   1. Client detects a "stuck" user via useModuleDwell hook (dwell ≥ threshold)
//   2. Client POSTs to /functions/v1/outreach-agent with { moduleId, channel }
//   3. This function generates a contextual message via Claude
//      (grounded in archetype + pipeline friction + module gap)
//   4. Dispatches through the requested channel (in_app / email / whatsapp)
//
// Channels:
//   - in_app: logs to notifications table; client polls it
//   - email:  via Resend API (requires RESEND_API_KEY); dry-run log when unset
//   - whatsapp: stub — logs payload; real impl needs Twilio or WA Business API
//
// Auth: user JWT required. Rate limit: 5 req/min per user (outreach is sensitive).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders, corsDenied, isOriginAllowed } from "../_shared/cors.ts";
import { checkRateLimit, checkUserRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("DIGEST_FROM_EMAIL") ?? "outreach@funnelforge.app";

type Channel = "in_app" | "email" | "whatsapp";
type Archetype = "strategist" | "optimizer" | "pioneer" | "connector" | "closer";

interface OutreachRequest {
  moduleId: string;
  channel: Channel;
  archetype?: Archetype;
  language?: "he" | "en";
}

interface Profile {
  id: string;
  display_name?: string;
  email?: string;
}

// ───────────────────────────────────────────────
// Module → gap mapping (what the user got stuck on)
// ───────────────────────────────────────────────
const MODULE_GAPS: Record<string, { he: string; en: string }> = {
  differentiate: { he: "ניסוח הבידול של העסק", en: "defining business differentiation" },
  wizard: { he: "בניית תוכנית שיווק", en: "building a marketing plan" },
  sales: { he: "סקריפטי מכירה", en: "sales scripts" },
  pricing: { he: "מבנה תמחור", en: "pricing structure" },
  retention: { he: "אסטרטגיית שימור", en: "retention strategy" },
  data: { he: "חיבור מקורות נתונים", en: "connecting data sources" },
  ai: { he: "AI Coach", en: "AI Coach" },
};

// ───────────────────────────────────────────────
// Archetype-matched persuasion angle (Cialdini × Higgins)
// ───────────────────────────────────────────────
const ARCHETYPE_ANGLES: Record<Archetype, { he: string; en: string }> = {
  strategist: {
    he: "הדגש דאטה ומניעת-סיכון (Prevention Focus). הצע PSM grid / benchmark להפחתת אי-ודאות.",
    en: "Emphasize data + risk prevention (Prevention Focus). Offer a PSM grid / benchmark to reduce uncertainty.",
  },
  optimizer: {
    he: "הדגש מדידות + iteration. הצע A/B test או ניסוי קטן.",
    en: "Emphasize measurement + iteration. Offer an A/B test or small experiment.",
  },
  pioneer: {
    he: "הדגש חזון + אפשרות. השתמש במטפורות, ציורי תמונה של תוצאה.",
    en: "Emphasize vision + possibility. Use metaphors, paint the outcome picture.",
  },
  connector: {
    he: "הדגש קהילה ויחסים. הזכר סיפורי לקוחות שהצליחו.",
    en: "Emphasize community and relationships. Reference customer success stories.",
  },
  closer: {
    he: "הדגש דחיפות + action. משפטים קצרים, bullet list, CTA יחיד.",
    en: "Emphasize urgency + action. Short sentences, bullet list, single CTA.",
  },
};

async function generateOutreachCopy(
  req: OutreachRequest,
  profile: Profile,
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const lang = req.language ?? "he";
  const gap = MODULE_GAPS[req.moduleId] ?? { he: req.moduleId, en: req.moduleId };
  const archetype = req.archetype ?? "strategist";
  const angle = ARCHETYPE_ANGLES[archetype];
  const channelLimit: Record<Channel, string> = {
    whatsapp: "50 מילים מקסימום; ללא כותרת",
    email: "subject בשורה ראשונה, גוף עד 120 מילים",
    in_app: "כותרת קצרה + שורה אחת + CTA",
  };

  const systemPrompt = lang === "he"
    ? `אתה מאמן שיווק ישראלי. המשתמש נתקע ב-${gap.he} למשך מעל שבוע.
הזווית הפסיכולוגית לפי הארכיטיפ: ${angle.he}
כתוב הודעה קצרה, לא-דחפנית, עם ערך ברור והזמנה לפעולה אחת.
הגבלת ערוץ ${req.channel}: ${channelLimit[req.channel]}
אל תזכיר "AI" או "אוטומציה". כתוב כמו חבר.`
    : `You are an Israeli marketing coach. The user is stuck on ${gap.en} for over a week.
Psychology angle for archetype: ${angle.en}
Write a short, non-pushy message with clear value and one call to action.
Channel constraint for ${req.channel}: ${channelLimit[req.channel]}
Never mention "AI" or "automation". Write like a friend.`;

  const userMsg = lang === "he"
    ? `שלום ${profile.display_name ?? ""}, כתוב הודעה שתחזיר אותי למודול ${gap.he}.`
    : `Hi ${profile.display_name ?? ""}, write a message to bring me back to ${gap.en}.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Claude error ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function dispatchChannel(
  channel: Channel,
  message: string,
  profile: Profile,
  moduleId: string,
): Promise<{ sent: boolean; mode: "live" | "dry_run"; reason?: string }> {
  if (channel === "in_app") {
    // Persist as a feedback-table row with a special marker so the client
    // can surface it in NotificationCenter on next load.
    // (No dedicated outreach table — feedback is the user-visible channel.)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from("feedback").insert({
      message: `OUTREACH | module: ${moduleId} | channel: in_app\n\n${message}`,
      user_id: profile.id,
      email: null,
      page_url: "/outreach-dispatch",
      user_agent: "outreach-agent",
    });
    return { sent: true, mode: "live" };
  }

  if (channel === "email") {
    if (!RESEND_API_KEY || !profile.email) {
      console.log(JSON.stringify({
        event: "outreach_email_dry_run",
        userId: profile.id,
        moduleId,
        message,
        reason: !RESEND_API_KEY ? "RESEND_API_KEY not set" : "no profile.email",
      }));
      return { sent: false, mode: "dry_run", reason: !RESEND_API_KEY ? "resend_unconfigured" : "no_email" };
    }

    const lines = message.split("\n").filter(Boolean);
    const subject = lines[0]?.slice(0, 80) ?? "FunnelForge";
    const body = lines.slice(1).join("<br>");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: profile.email,
        subject,
        html: `<p style="font-family:sans-serif">${body}</p>`,
      }),
    });
    return { sent: res.ok, mode: "live" };
  }

  if (channel === "whatsapp") {
    // Stub — real impl needs Twilio (`to: 'whatsapp:+972...'`) or WA Business API.
    console.log(JSON.stringify({
      event: "outreach_whatsapp_dry_run",
      userId: profile.id,
      moduleId,
      message,
      note: "WhatsApp provider not configured; see docs/mcp-integration.md roadmap",
    }));
    return { sent: false, mode: "dry_run", reason: "whatsapp_provider_unconfigured" };
  }

  return { sent: false, mode: "dry_run", reason: "unknown_channel" };
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!isOriginAllowed(req)) return corsDenied(req);

  const rl = checkRateLimit(req, "outreach-agent", 5, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: authData } = await supabase.auth.getUser(token);
  if (!authData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Per-user cap — 5/min guards cost and email-volume. Also doubles as a
  // spam-prevention measure since an attacker could sign up with victim
  // emails and call this endpoint to spray messages from our domain.
  const userRl = checkUserRateLimit(authData.user.id, "outreach-agent", 5, 60_000);
  if (!userRl.allowed) return rateLimitResponse(userRl, corsHeaders);

  const body = (await req.json()) as OutreachRequest;
  if (!body.moduleId || !body.channel) {
    return new Response(JSON.stringify({ error: "moduleId and channel required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .eq("id", authData.user.id)
    .single();
  const profile: Profile = {
    id: authData.user.id,
    display_name: (profileRow as Profile | null)?.display_name,
    email: (profileRow as Profile | null)?.email ?? authData.user.email,
  };

  try {
    const message = await generateOutreachCopy(body, profile);
    const dispatch = await dispatchChannel(body.channel, message, profile, body.moduleId);

    console.log(JSON.stringify({
      event: "outreach_dispatched",
      ts: new Date().toISOString(),
      userId: profile.id,
      moduleId: body.moduleId,
      channel: body.channel,
      ...dispatch,
    }));

    return new Response(JSON.stringify({
      message,
      dispatch,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
