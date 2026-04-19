// ═══════════════════════════════════════════════
// Webhook Receive — Inbound data ingestion endpoint
// Accepts external data (leads, conversions, metrics)
// from third-party services and stores in Supabase.
// ═══════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Kept as wildcard — this is a public inbound webhook endpoint called by
// third-party services (Zapier, Make, n8n) that don't send an Origin header.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, "webhook-receive", 100, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Authenticate via API key or JWT
  const apiKey = req.headers.get("X-API-Key");
  const authHeader = req.headers.get("Authorization");

  let userId: string | null = null;

  if (apiKey) {
    // Look up API key in user_integrations
    const { data: integration } = await supabase
      .from("user_integrations")
      .select("user_id")
      .eq("platform", "webhook")
      .eq("status", "connected")
      .contains("tokens", { api_key: apiKey })
      .single();

    if (integration) {
      userId = integration.user_id;
    }
  } else if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) {
      userId = user.id;
    }
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: "Invalid API key or token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { type, data } = body;

    // Validate event type
    const validTypes = ["lead", "conversion", "metric", "contact", "custom"];
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: `Invalid type. Valid types: ${validTypes.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store inbound event in event queue for processing
    await supabase.rpc("publish_event", {
      p_event_type: `inbound.${type}`,
      p_payload: { user_id: userId, type, data, received_at: new Date().toISOString() },
      p_user_id: userId,
    });

    return new Response(
      JSON.stringify({ received: true, type, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
