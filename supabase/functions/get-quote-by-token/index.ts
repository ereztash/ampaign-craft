// get-quote-by-token — Public endpoint for share-token quote access.
//
// Replaces the dangerous RLS policy "Public read via share token" that
// granted SELECT on any quote row whose share_token was not null. This
// function looks up the quote by the exact token using the service role
// and returns a single row if and only if the token matches.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders, corsDenied, isOriginAllowed } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { sanitizeClientError } from "../_shared/errors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// 128-bit hex tokens have predictable length. Rejecting malformed input
// early prevents expensive queries on nonsense.
const TOKEN_RE = /^[a-f0-9]{16,64}$/i;

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!isOriginAllowed(req)) return corsDenied(req);

  // Public endpoint; cap traffic tightly so enumeration attacks are slow.
  const rl = checkRateLimit(req, "get-quote-by-token", 30, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token") ?? "";
    if (!token && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      token = typeof body.token === "string" ? body.token : "";
    }

    if (!TOKEN_RE.test(token)) {
      return sanitizeClientError("invalid token format", "get-quote-by-token.fmt", "Not found", 404, { ...corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
      .from("quotes")
      .select("id, data, status, recipient_name, recipient_company, valid_until, created_at")
      .eq("share_token", token)
      .maybeSingle();

    if (error) {
      return sanitizeClientError(error, "get-quote-by-token.db", "Not found", 404, { ...corsHeaders });
    }
    if (!data) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (data.valid_until && new Date(data.valid_until) < new Date()) {
      return new Response(JSON.stringify({ error: "Expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ quote: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return sanitizeClientError(err, "get-quote-by-token.exception", "Bad request", 400, { ...corsHeaders });
  }
});
