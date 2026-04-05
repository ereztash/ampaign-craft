import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.text();
    // In production: verify Stripe signature with STRIPE_WEBHOOK_SECRET
    // For now, parse the event directly
    const event = JSON.parse(body);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const tier = session.metadata?.tier;

      if (userId && tier) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Update user profile with new tier
        await supabase.from("profiles").update({
          display_name: tier, // Store tier in profile (temporary — should add tier column)
        }).eq("id", userId);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        // Downgrade to free
        await supabase.from("profiles").update({
          display_name: "free",
        }).eq("id", userId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
