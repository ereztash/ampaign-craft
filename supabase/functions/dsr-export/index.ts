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

// User-scoped tables to include in the export. Add new tables here as
// the schema grows. Service-only tables (event_queue, audit logs, etc.)
// are intentionally excluded.
const USER_SCOPED_TABLES = [
  "profiles",
  "saved_plans",
  "user_archetype_profiles",
  "user_progress",
  "user_integrations",
  "feedback",
  "quotes",
  "leads",
  "tier_audit_log",
  "engine_history",
  "outcome_observations",
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

  const tables: Record<string, unknown[]> = {};

  for (const table of USER_SCOPED_TABLES) {
    try {
      const { data, error } = await auth.supabase
        .from(table)
        .select("*")
        .or(`user_id.eq.${auth.id},id.eq.${auth.id}`);
      if (error) {
        // Table may not have user_id column or row-level access — skip.
        tables[table] = [];
        continue;
      }
      tables[table] = data ?? [];
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
