// ═══════════════════════════════════════════════
// Prospect Research — Edge Function
//
// Called immediately after signup with { email, fullName }.
// Uses Claude to infer the prospect's business context from their email
// domain and name, then returns a ProspectProfile.
//
// Deliberately lightweight: one Claude call, no web crawling, 2-second budget.
// The output is best-effort — confidence < 0.4 means "we don't know much yet".
// ═══════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders, isOriginAllowed, corsDenied } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type FoggLeg = "motivation" | "ability" | "trigger";

interface ProspectProfile {
  email: string;
  fullName: string;
  confidence: number;
  inferredBusinessType?: string;
  inferredIndustry?: string;
  weakestLeg: FoggLeg;
  firstScreenMessage: { he: string; en: string };
  fetchedAt: number;
}

function domainFromEmail(email: string): string {
  return email.split("@")[1] ?? "";
}

const GENERIC_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "walla.co.il",
  "mail.com", "icloud.com", "me.com", "msn.com", "live.com", "qq.com",
]);

function isGenericDomain(domain: string): boolean {
  return GENERIC_DOMAINS.has(domain.toLowerCase());
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isOriginAllowed(req)) return corsDenied(req);

  // Low rate limit: prospect research is one-per-signup, so 5/min/IP is plenty.
  const rl = checkRateLimit(req, "prospect-research", 5, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  // Require valid JWT (user must be authenticated — fires right after signUp)
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    // Return a minimal low-confidence profile so the client can still proceed
    const { email, fullName } = await req.json().catch(() => ({ email: "", fullName: "" }));
    const fallback: ProspectProfile = {
      email: email ?? "",
      fullName: fullName ?? "",
      confidence: 0,
      weakestLeg: "motivation",
      firstScreenMessage: {
        he: "ספר לנו קצת על העסק שלך כדי שנוכל להתחיל",
        en: "Tell us a bit about your business so we can get started",
      },
      fetchedAt: Date.now(),
    };
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const email: string    = typeof body?.email    === "string" ? body.email.trim()    : "";
    const fullName: string = typeof body?.fullName === "string" ? body.fullName.trim() : "";

    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domain     = domainFromEmail(email);
    const isGeneric  = isGenericDomain(domain);

    const systemPrompt = `You are a B2B prospect intelligence analyst specialising in Israeli small businesses.
Given a signup email and full name, infer as much as you can about the prospect's business context.
Respond ONLY with valid JSON matching this schema:
{
  "confidence": <0.0-1.0 — how confident you are. Use 0.1 for generic emails, 0.6+ for business domains>,
  "inferredBusinessType": <"freelancer"|"agency"|"ecommerce"|"saas"|"local_service"|"b2b_services"|"unknown">,
  "inferredIndustry": <short English string like "marketing", "accounting", "retail", "tech", "health" or null>,
  "weakestLeg": <"motivation"|"ability"|"trigger" — which Fogg B=MAT leg most likely needs attention>,
  "firstScreenMessage": {
    "he": <20-word Hebrew sentence welcoming the user and hinting at what we found>,
    "en": <same in English>
  }
}

Fogg leg guidance:
- motivation: user probably doesn't have a concrete goal yet (generic email, vague name)
- ability: solo operator / very small business — time/resource constrained
- trigger: business domain looks established but hasn't started marketing automation yet`;

    const userPrompt = `Email: ${email}
Full name: ${fullName || "(not provided)"}
Domain is generic (gmail/yahoo/etc): ${isGeneric}
Domain: ${domain}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic ${res.status}`);
    }

    const data = await res.json();
    const raw  = data.content?.[0]?.text ?? "{}";

    let parsed: Partial<ProspectProfile> = {};
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch { /* ignore parse errors — fall through to defaults */ }

    const profile: ProspectProfile = {
      email,
      fullName,
      confidence: typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : (isGeneric ? 0.1 : 0.4),
      inferredBusinessType: parsed.inferredBusinessType,
      inferredIndustry: parsed.inferredIndustry,
      weakestLeg: (parsed.weakestLeg as FoggLeg) ?? "motivation",
      firstScreenMessage: parsed.firstScreenMessage ?? {
        he: "ברוך הבא! בוא נתחיל להבין את העסק שלך",
        en: "Welcome! Let's start understanding your business",
      },
      fetchedAt: Date.now(),
    };

    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
