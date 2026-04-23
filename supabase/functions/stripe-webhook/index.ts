import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sanitizeClientError } from "../_shared/errors.ts";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = Object.fromEntries(
    sigHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key.trim(), value];
    })
  );

  const timestamp = parts["t"];
  const signature = parts["v1"];

  if (!timestamp || !signature) return false;

  // Reject timestamps older than 5 minutes to prevent replay attacks
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const expectedSig = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Timing-safe comparison
  if (expectedSig.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expectedSig.length; i++) {
    mismatch |= expectedSig.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.text();
    const sigHeader = req.headers.get("stripe-signature");

    if (!sigHeader) {
      return sanitizeClientError("missing stripe-signature header", "stripe-webhook.sig", "Unauthorized", 401);
    }

    const isValid = await verifyStripeSignature(body, sigHeader, STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      return sanitizeClientError("invalid stripe signature", "stripe-webhook.sig", "Unauthorized", 401);
    }

    const event = JSON.parse(body);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.user_id ?? session.client_reference_id;
      const tier = session.metadata?.tier;

      if (userId && tier) {
        const { data: result, error } = await supabase.rpc("process_stripe_tier_change", {
          p_event_id: typeof event.id === "string" ? event.id : null,
          p_event_type: event.type,
          p_user_id: userId,
          p_new_tier: tier,
          p_stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
          p_stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
        });
        if (error) throw error;
        if (result === "duplicate") {
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

      // Prefer metadata; fall back to customer-id lookup if metadata was lost.
      let resolvedUserId: string | null = null;
      if (userId) {
        const { data } = await supabase
          .from("profiles").select("id").eq("id", userId).maybeSingle();
        if (data) resolvedUserId = data.id;
      } else if (customerId) {
        const { data } = await supabase
          .from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
        if (data) resolvedUserId = data.id;
      }

      if (resolvedUserId) {
        const { data: result, error } = await supabase.rpc("process_stripe_tier_change", {
          p_event_id: typeof event.id === "string" ? event.id : null,
          p_event_type: event.type,
          p_user_id: resolvedUserId,
          p_new_tier: "free",
          p_stripe_customer_id: null,
          p_stripe_subscription_id: null,
        });
        if (error) throw error;
        if (result === "duplicate") {
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      } else {
        // Unresolved: couldn't find a user for this cancellation. Record it
        // so a reconciliation job can clean up later without the webhook
        // silently leaving a paying-tier ghost.
        const reason = !userId && !customerId
          ? "no_user_id_and_no_customer_id"
          : userId
            ? `user_id_not_found:${userId}`
            : `customer_id_not_found:${customerId}`;
        console.error("stripe_webhook.unresolved", { eventId: event.id, reason });
        if (typeof event.id === "string" && event.id.length > 0) {
          await supabase
            .from("stripe_events_processed")
            .upsert({
              event_id: event.id,
              event_type: event.type,
              unresolved: true,
              unresolved_reason: reason,
            }, { onConflict: "event_id" });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return sanitizeClientError(err, "stripe-webhook.exception", "Bad request", 400);
  }
});
