import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders, corsDenied, isOriginAllowed } from "../_shared/cors.ts";
import { checkRateLimit, checkUserRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const STRIPE_PRICE_PRO = Deno.env.get("STRIPE_PRICE_PRO");
const STRIPE_PRICE_BUSINESS = Deno.env.get("STRIPE_PRICE_BUSINESS");

const PRICE_IDS: Record<string, string | undefined> = {
  pro: STRIPE_PRICE_PRO,
  business: STRIPE_PRICE_BUSINESS,
};

// PricingPage advertises 14-day free trial for Pro and Business.
// Without this, checkout silently skips the trial - bait-and-switch risk.
const TRIAL_DAYS: Record<string, number> = { pro: 14, business: 14 };

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isOriginAllowed(req)) return corsDenied(req);

  const rl = checkRateLimit(req, "create-checkout", 10, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

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

    // Per-user cap prevents checkout spam / enumeration even if the
    // caller rotates source IPs.
    const userRl = checkUserRateLimit(user.id, "create-checkout", 5, 60_000);
    if (!userRl.allowed) return rateLimitResponse(userRl, corsHeaders);

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

    // Block duplicate subscriptions. A user who double-clicks "upgrade" or
    // who returns after an interrupted checkout could otherwise spawn a
    // second active subscription. If we know their Stripe customer ID,
    // check for an active sub and send them to the portal instead.
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    const customerId = profile?.stripe_customer_id;
    if (customerId) {
      const subsResp = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=active&limit=1`,
        { headers: { "Authorization": `Bearer ${STRIPE_SECRET_KEY}` } },
      );
      const subs = await subsResp.json();
      if (Array.isArray(subs.data) && subs.data.length > 0) {
        return new Response(
          JSON.stringify({
            error: "already_subscribed",
            message: "כבר יש לך מנוי פעיל. נהל אותו דרך פורטל הלקוחות.",
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Create Stripe Checkout Session
    const baseUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://funnelforge.co.il";
    const checkoutParams: Record<string, string> = {
      "mode": "subscription",
      "customer_email": user.email || "",
      "client_reference_id": user.id,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "success_url": `${baseUrl}/?checkout=success`,
      "cancel_url": `${baseUrl}/?checkout=cancel`,
      "metadata[user_id]": user.id,
      "metadata[tier]": tier,
      // Propagate metadata to the Subscription object so customer.subscription.*
      // webhook events (e.g. cancellation) can still resolve the user.
      "subscription_data[metadata][user_id]": user.id,
      "subscription_data[metadata][tier]": tier,
      "allow_promotion_codes": "true",
    };
    if (TRIAL_DAYS[tier]) {
      checkoutParams["subscription_data[trial_period_days]"] = String(TRIAL_DAYS[tier]);
    }
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(checkoutParams),
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
