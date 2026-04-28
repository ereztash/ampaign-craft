// ═══════════════════════════════════════════════
// Purchase Credits — Stripe Checkout for one-time credit packs.
//
// SCAFFOLD ONLY — does not work until the operator:
//   1. Creates a one-time price in Stripe for each pack size.
//      (e.g. price_1NXyz... = "100 credits — ₪35").
//   2. Sets STRIPE_PRICE_CREDITS_100, STRIPE_PRICE_CREDITS_500
//      env vars on the edge function.
//   3. Configures stripe-webhook to handle
//      payment_intent.succeeded with metadata.kind === "credits"
//      and call grant_credits() with the credit amount from
//      metadata.credits.
//
// Until those steps are done this endpoint returns 503 so the UI
// can show "purchase temporarily unavailable" instead of crashing.
//
// The flow on success looks like:
//   client → POST /purchase-credits { pack: "100" }
//   server → returns Stripe Checkout session URL
//   user pays in Stripe-hosted page
//   stripe webhook → payment_intent.succeeded
//   webhook handler → grant_credits(user_id, 100, 'purchase', payment_intent_id)
//   client polls /get-usage → sees new balance
// ═══════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders, corsDenied, isOriginAllowed } from "../_shared/cors.ts";
import { checkUserRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// One-time prices created in the Stripe dashboard. Until these are
// set the endpoint refuses to construct checkout sessions.
const PRICE_IDS_BY_PACK: Record<string, string | undefined> = {
  "100": Deno.env.get("STRIPE_PRICE_CREDITS_100"),
  "500": Deno.env.get("STRIPE_PRICE_CREDITS_500"),
};

const CREDITS_PER_PACK: Record<string, number> = {
  "100": 100,
  "500": 500,
};

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (!isOriginAllowed(req)) return corsDenied(req);

  if (!STRIPE_SECRET_KEY) {
    return new Response(
      JSON.stringify({ error: "credits_not_configured", message: "Credit purchase is not yet configured." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
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

  const userRl = checkUserRateLimit(user.id, "purchase-credits", 5, 60_000);
  if (!userRl.allowed) return rateLimitResponse(userRl, corsHeaders);

  try {
    const { pack } = await req.json();
    const priceId = PRICE_IDS_BY_PACK[pack as string];
    const creditAmount = CREDITS_PER_PACK[pack as string];

    if (!creditAmount) {
      return new Response(JSON.stringify({ error: "Invalid pack" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!priceId) {
      // Pack size is valid, but operator hasn't created the Stripe
      // price yet. Distinct error code so the UI can tell users
      // "this size isn't available yet, try the other one".
      return new Response(
        JSON.stringify({ error: "credits_pack_not_configured", pack }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const baseUrl =
      Deno.env.get("APP_URL") || req.headers.get("origin") || "https://funnelforge.co.il";

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "payment",
        "customer_email": user.email || "",
        "client_reference_id": user.id,
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        "success_url": `${baseUrl}/?credits=success`,
        "cancel_url": `${baseUrl}/?credits=cancel`,
        // The webhook handler reads these to know which user to
        // grant and how many credits.
        "metadata[user_id]": user.id,
        "metadata[kind]": "credits",
        "metadata[credits]": String(creditAmount),
        "payment_intent_data[metadata][user_id]": user.id,
        "payment_intent_data[metadata][kind]": "credits",
        "payment_intent_data[metadata][credits]": String(creditAmount),
      }),
    });

    const session = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: session?.error?.message || "stripe_error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
