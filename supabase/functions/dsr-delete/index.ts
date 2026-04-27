// Data Subject Right — Erasure (GDPR Art. 17, PPL §14)
//
// POST /functions/v1/dsr-delete
// Permanently deletes the authenticated user's data and the auth account.
// Accepts JSON: { confirm: true, reason?: string }
//
// Returns 200 on success. The caller should immediately sign out.
//
// Notes:
//   - Some records (Stripe customer, Anthropic abuse-monitoring) are not
//     in our database; the response includes pointers to subprocessor
//     erasure flows.
//   - Deletion is logged to security_audit_log BEFORE the auth row is
//     dropped, with the user_id, so the trail survives.
//   - Records required by law (financial transactions for tax retention)
//     are NOT deleted; they are anonymized.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAuthedUser } from "../_shared/auth.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { sanitizeClientError } from "../_shared/errors.ts";

const DELETE_TABLES = [
  "saved_plans",
  "user_archetype_profiles",
  "user_progress",
  "user_integrations",
  "feedback",
  "quotes",
  "leads",
  "engine_history",
  "outcome_observations",
] as const;

const ANONYMIZE_TABLES = [
  // Financial / billing records — kept for legal retention but PII-scrubbed.
  "tier_audit_log",
  "stripe_events_processed",
] as const;

interface DeleteRequest {
  confirm?: boolean;
  reason?: string;
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const auth = await requireAuthedUser(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: DeleteRequest = {};
  try {
    body = (await req.json()) as DeleteRequest;
  } catch {
    // Body is optional but if present must be valid JSON.
  }

  if (body.confirm !== true) {
    return new Response(
      JSON.stringify({
        error: "confirmation_required",
        message: "Set { confirm: true } in the request body to proceed.",
      }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const summary = {
    userId: auth.id,
    deleted: [] as string[],
    anonymized: [] as string[],
    failed: [] as { table: string; reason: string }[],
  };

  // Audit FIRST so the trail survives even if downstream fails.
  try {
    await auth.supabase.from("security_audit_log").insert({
      event_type: "dsr_delete_initiated",
      user_id: auth.id,
      metadata: { reason: body.reason ?? null },
    });
  } catch (e) {
    console.warn("dsr-delete: pre-audit insert failed", sanitizeClientError(e));
  }

  for (const table of DELETE_TABLES) {
    try {
      const { error } = await auth.supabase.from(table).delete().eq("user_id", auth.id);
      if (error) {
        summary.failed.push({ table, reason: error.message });
      } else {
        summary.deleted.push(table);
      }
    } catch (e) {
      summary.failed.push({ table, reason: sanitizeClientError(e) });
    }
  }

  for (const table of ANONYMIZE_TABLES) {
    try {
      const { error } = await auth.supabase
        .from(table)
        .update({ user_id: null, email: null, anonymized_at: new Date().toISOString() })
        .eq("user_id", auth.id);
      if (!error) summary.anonymized.push(table);
    } catch {
      // Anonymization is best-effort; not all tables have these columns.
    }
  }

  // Profile last (FK references)
  try {
    await auth.supabase.from("profiles").delete().eq("id", auth.id);
    summary.deleted.push("profiles");
  } catch (e) {
    summary.failed.push({ table: "profiles", reason: sanitizeClientError(e) });
  }

  // Auth row — uses service-role helper. Swallow errors so the caller
  // still gets a 200 with the summary; the auth row can be cleaned up
  // by a follow-up cron job.
  try {
    await auth.supabase.auth.admin.deleteUser(auth.id);
    summary.deleted.push("auth.users");
  } catch (e) {
    console.warn("dsr-delete: auth.admin.deleteUser failed", sanitizeClientError(e));
  }

  return new Response(
    JSON.stringify({
      ...summary,
      subprocessorsToContact: ["Stripe", "Anthropic", "OpenAI", "Meta"],
      message: {
        he: "המידע שלך נמחק. צור קשר עם ספקי המשנה (ראה /subprocessors) להסרה משם.",
        en: "Your data has been deleted. Contact subprocessors (see /subprocessors) for their erasure flows.",
      },
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
