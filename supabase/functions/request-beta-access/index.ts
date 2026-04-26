// request-beta-access — POST /functions/v1/request-beta-access
//
// Body: { email: string, utm?: Record<string,string> }
// Inserts a row into beta_waitlist.
// On duplicate email: returns 200 (silently idempotent — no double-signup UX needed).
// On missing/invalid email: returns 400.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL           = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { email?: string; utm?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: "Invalid email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const utm = body.utm ?? {};
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error } = await supabase.from("beta_waitlist").insert({
    email,
    utm_source:   utm.utm_source   ?? null,
    utm_medium:   utm.utm_medium   ?? null,
    utm_campaign: utm.utm_campaign ?? null,
    utm_content:  utm.utm_content  ?? null,
    utm_term:     utm.utm_term     ?? null,
    ref:          utm.ref          ?? null,
  });

  // Duplicate email — treat as success (idempotent)
  if (error && error.code !== "23505") {
    console.error("[request-beta-access] insert error:", error.message);
    return new Response(JSON.stringify({ error: "Could not save sign-up" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(JSON.stringify({ event: "beta_waitlist_signup", email, utm_source: utm.utm_source }));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
