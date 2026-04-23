// ═══════════════════════════════════════════════
// Webhook Receive — Inbound data ingestion endpoint
// Accepts external data (leads, conversions, metrics)
// from third-party services and stores in Supabase.
// ═══════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";
import { sanitizeClientError } from "../_shared/errors.ts";
import { requireEnum, requireObject, ValidationError } from "../_shared/validate.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

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
    // Constant-time index lookup by SHA-256 of the API key. This replaces a
    // JSONB `.contains()` scan that was both a DoS vector on this public
    // endpoint and a timing side-channel.
    const apiKeyHash = await sha256Hex(apiKey);
    const { data: integration } = await supabase
      .from("user_integrations")
      .select("user_id")
      .eq("platform", "webhook")
      .eq("status", "connected")
      .eq("api_key_hash", apiKeyHash)
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
    return sanitizeClientError("no matching api key or jwt", "webhook-receive.auth", "Unauthorized", 401, { ...corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = requireObject(body, "body");
    const type = requireEnum(parsed.type, "type", [
      "lead", "conversion", "metric", "contact", "custom",
    ] as const);
    // data is passed through verbatim (opaque integration payload) but
    // its top-level shape is validated. The JSONB column has no size cap
    // at the schema level; guard here at 128KB so a giant payload cannot
    // clog the queue.
    const data = parsed.data;
    if (data !== undefined && data !== null) {
      const serialized = JSON.stringify(data);
      if (serialized.length > 128 * 1024) {
        throw new ValidationError("data too large (max 128KB)");
      }
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
    if (err instanceof ValidationError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return sanitizeClientError(err, "webhook-receive.exception", "Bad request", 400, { ...corsHeaders });
  }
});
