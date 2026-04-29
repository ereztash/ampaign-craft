// ═══════════════════════════════════════════════
// Get Usage — read-only snapshot of the user's current month
// usage counters, tier limits, and credit balance.
//
// Used by the client to render the usage indicator and to decide
// when to show the "approaching limit" upsell. Never blocks; never
// mutates. Does not surface credits in the response unless balance
// is non-zero, so the onboarding UI sees only quota info.
// ═══════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders, corsDenied, isOriginAllowed } from "../_shared/cors.ts";
import { checkUserRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { readUsageSnapshot } from "../_shared/usage.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (!isOriginAllowed(req)) return corsDenied(req);
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // The UI polls this on focus + after every metered action, so cap
  // it at 60/min/user. That's well above any realistic UI poll rate
  // and still cheap (a couple of indexed reads per request).
  const userRl = checkUserRateLimit(user.id, "get-usage", 60, 60_000);
  if (!userRl.allowed) return rateLimitResponse(userRl, corsHeaders);

  try {
    const snapshot = await readUsageSnapshot(supabase, user.id);
    return new Response(JSON.stringify(snapshot), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
