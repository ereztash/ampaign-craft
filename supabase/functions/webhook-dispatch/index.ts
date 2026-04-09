// ═══════════════════════════════════════════════
// Webhook Dispatch — Outbound webhook delivery
// Sends event payloads to user-configured webhook URLs.
// Compatible with Zapier, Make, n8n, and custom endpoints.
// ═══════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function computeHMAC(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verify JWT
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

  try {
    const { event, data } = await req.json();

    // Fetch user's webhook integrations
    const { data: integrations } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "webhook")
      .eq("status", "connected");

    if (!integrations || integrations.length === 0) {
      return new Response(JSON.stringify({ dispatched: 0, message: "No webhook integrations configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data,
      source: "campaign-craft",
      version: "1.0",
    });

    const results = [];

    for (const integration of integrations) {
      const webhookUrl = integration.tokens?.webhook_url;
      const secret = integration.tokens?.webhook_secret || "";

      if (!webhookUrl) continue;

      const signature = secret ? await computeHMAC(secret, payload) : "";

      // Attempt delivery with retry
      let success = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": signature,
              "X-Webhook-Source": "campaign-craft",
              "X-Webhook-Event": event,
            },
            body: payload,
          });

          if (response.ok) {
            success = true;
            break;
          }
        } catch {
          // Retry after backoff
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
          }
        }
      }

      results.push({ url: webhookUrl, success });
    }

    return new Response(
      JSON.stringify({ dispatched: results.filter((r) => r.success).length, total: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
