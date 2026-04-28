// Data Subject Right — Export (GDPR Art. 15 & 20, PPL §13)
//
// GET /functions/v1/dsr-export
// Returns a JSON dump of every record we hold for the authenticated user,
// across all tables that are user-scoped via auth.uid().
//
// This is the technical implementation of the "right to access" and the
// "right to data portability". The response is machine-readable JSON so
// callers can re-import into another service.
//
// Audit: every export is logged to security_audit_log via the
// emit_audit_row trigger (or an explicit insert here as a fallback).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAuthedUser } from "../_shared/auth.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { sanitizeClientError } from "../_shared/errors.ts";

// Defense-in-depth UUID check on the auth.id we interpolate into
// PostgREST .or() filter strings below. The Supabase gateway has
// already verified the JWT signature, but we never want a malformed
// `sub` claim to flow into a DSL fragment.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// User-scoped tables to include in the export, paired with the column
// that links the row to the user. Most tables use `user_id`; `profiles`
// uses the auth user id as its primary key, so we filter on `id`.
// Listing the column explicitly avoids a `user_id.eq.X,id.eq.X` .or()
// filter that mixed two semantically distinct columns and required
// per-row post-filtering to stay safe.
const USER_SCOPED_TABLES: ReadonlyArray<{ table: string; column: "user_id" | "id" }> = [
  { table: "profiles", column: "id" },
  { table: "saved_plans", column: "user_id" },
  { table: "user_archetype_profiles", column: "user_id" },
  { table: "user_progress", column: "user_id" },
  { table: "user_integrations", column: "user_id" },
  { table: "feedback", column: "user_id" },
  { table: "quotes", column: "user_id" },
  { table: "leads", column: "user_id" },
  { table: "tier_audit_log", column: "user_id" },
  { table: "engine_history", column: "user_id" },
  { table: "outcome_observations", column: "user_id" },
] as const;

interface ExportPayload {
  exportedAt: string;
  userId: string;
  email: string | null;
  schemaVersion: "1.0";
  tables: Record<string, unknown[]>;
  notes: {
    he: string;
    en: string;
  };
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "GET") {
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
  if (!UUID_RE.test(auth.id)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const tables: Record<string, unknown[]> = {};

  for (const { table, column } of USER_SCOPED_TABLES) {
    try {
      const { data, error } = await auth.supabase
        .from(table)
        .select("*")
        .eq(column, auth.id);
      if (error) {
        // Table may not have user_id column or row-level access — skip.
        tables[table] = [];
        continue;
      }
      // Defense-in-depth on top of RLS: drop any row that doesn't actually
      // belong to the authenticated user. Protects the export against an
      // accidentally permissive RLS policy or a future schema change.
      const ownedRows = (data ?? []).filter((row) => {
        const r = row as Record<string, unknown>;
        return r[column] === auth.id;
      });
      tables[table] = ownedRows;
    } catch (e) {
      console.warn(`dsr-export: failed for table ${table}`, sanitizeClientError(e));
      tables[table] = [];
    }
  }

  // Audit
  try {
    await auth.supabase.from("security_audit_log").insert({
      event_type: "dsr_export",
      user_id: auth.id,
      metadata: {
        tables: Object.keys(tables),
        rowCount: Object.values(tables).reduce((acc, t) => acc + t.length, 0),
      },
    });
  } catch (e) {
    console.warn("dsr-export: audit insert failed", sanitizeClientError(e));
  }

  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    userId: auth.id,
    email: auth.email,
    schemaVersion: "1.0",
    tables,
    notes: {
      he: "ייצוא זה כולל את הנתונים שאנו מאחסנים אצלנו. נתונים שעובדו אצל ספקי משנה (Anthropic, OpenAI, Stripe וכו') יש לבקש ישירות מהם — ראה /subprocessors.",
      en: "This export includes data we store. Data processed by subprocessors (Anthropic, OpenAI, Stripe, etc.) must be requested from them directly — see /subprocessors.",
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="funnelforge-export-${auth.id}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
