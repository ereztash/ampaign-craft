import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_PRICE_PRO = Deno.env.get("STRIPE_PRICE_PRO");
const STRIPE_PRICE_BUSINESS = Deno.env.get("STRIPE_PRICE_BUSINESS");

const PRICE_IDS: Record<string, string | undefined> = {
  pro: STRIPE_PRICE_PRO,
  business: STRIPE_PRICE_BUSINESS,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get user from JWT
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tier } = await req.json();
    const priceId = PRICE_IDS[tier];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: tier in PRICE_IDS ? "Stripe price not configured for this tier" : "Invalid tier" }),
        {
          status: tier in PRICE_IDS ? 500 : 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Stripe Checkout Session
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "subscription",
        "customer_email": user.email || "",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        "success_url": `${Deno.env.get("APP_URL") || req.headers.get("origin") || "https://funnelforge.co.il"}/?checkout=success`,
        "cancel_url": `${Deno.env.get("APP_URL") || req.headers.get("origin") || "https://funnelforge.co.il"}/?checkout=cancel`,
        "metadata[user_id]": user.id,
        "metadata[tier]": tier,
      }),
    });

    const session = await response.json();

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
