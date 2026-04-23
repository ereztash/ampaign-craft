import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders, corsDenied, isOriginAllowed } from "../_shared/cors.ts";
import { checkRateLimit, checkUserRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { sanitizeClientError } from "../_shared/errors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const started = Date.now();
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isOriginAllowed(req)) {
    console.log(JSON.stringify({
      event: "meta_token_exchange.origin_denied",
      origin: req.headers.get("origin"),
      ts: new Date().toISOString(),
    }));
    return corsDenied(req);
  }

  // 3 exchanges per minute per IP is plenty for a legitimate user flow.
  const rl = checkRateLimit(req, "meta-token-exchange", 3, 60_000);
  if (!rl.allowed) {
    console.log(JSON.stringify({
      event: "meta_token_exchange.rate_limited",
      retryAfterSec: rl.retryAfterSec,
      ts: new Date().toISOString(),
    }));
    return rateLimitResponse(rl, corsHeaders);
  }

  // Verify JWT
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return sanitizeClientError("invalid jwt", "meta-token-exchange.auth", "Unauthorized", 401, { ...corsHeaders });
  }

  // Per-user cap as well as per-IP. Token exchange is low-frequency for a
  // legitimate flow; 3/min is more than enough for manual reconnects.
  const userRl = checkUserRateLimit(user.id, "meta-token-exchange", 3, 60_000);
  if (!userRl.allowed) return rateLimitResponse(userRl, { ...corsHeaders });

  try {
    const { shortLivedToken } = await req.json();

    const appId = Deno.env.get("META_APP_ID");
    const appSecret = Deno.env.get("META_APP_SECRET");

    if (!appId || !appSecret) {
      throw new Error("META_APP_ID or META_APP_SECRET not configured");
    }

    const url = `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    console.log(JSON.stringify({
      event: "meta_token_exchange.success",
      userId: user.id,
      ts: new Date().toISOString(),
      durationMs: Date.now() - started,
    }));

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.log(JSON.stringify({
      event: "meta_token_exchange.error",
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
      ts: new Date().toISOString(),
      durationMs: Date.now() - started,
    }));
    return sanitizeClientError(err, "meta-token-exchange.exception", "Token exchange failed", 400, { ...corsHeaders });
  }
});
