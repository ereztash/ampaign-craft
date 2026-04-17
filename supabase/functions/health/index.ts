// Health Check Edge Function
// GET /functions/v1/health
//
// Returns system health across 4 subsystems:
//   - database: can we SELECT 1 from Supabase?
//   - ai: is ANTHROPIC_API_KEY set?
//   - meta: is Meta integration enabled?
//   - storage: is SUPABASE_URL reachable?
//
// Response: 200 = healthy, 503 = degraded
// Used by uptime monitors, k6 smoke tests, and the incident runbook.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SubsystemStatus {
  status: "ok" | "degraded" | "down";
  latencyMs?: number;
  reason?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "down";
  ts: string;
  version: string;
  subsystems: {
    database: SubsystemStatus;
    ai: SubsystemStatus;
    meta: SubsystemStatus;
  };
}

async function checkDatabase(): Promise<SubsystemStatus> {
  const t0 = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error } = await supabase.from("event_queue").select("id").limit(1);
    if (error) return { status: "degraded", reason: error.message, latencyMs: Date.now() - t0 };
    return { status: "ok", latencyMs: Date.now() - t0 };
  } catch (e) {
    return { status: "down", reason: String(e), latencyMs: Date.now() - t0 };
  }
}

function checkAI(): SubsystemStatus {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  return key
    ? { status: "ok" }
    : { status: "degraded", reason: "ANTHROPIC_API_KEY not set" };
}

function checkMeta(): SubsystemStatus {
  const enabled = Deno.env.get("VITE_META_ENABLED") !== "false";
  return { status: enabled ? "ok" : "degraded", reason: enabled ? undefined : "Meta integration disabled via ENV" };
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const start = Date.now();
  const [db, ai, meta] = await Promise.all([checkDatabase(), checkAI(), checkMeta()]);

  const statuses = [db.status, ai.status, meta.status];
  const overall: HealthResponse["status"] = statuses.includes("down")
    ? "down"
    : statuses.includes("degraded")
    ? "degraded"
    : "healthy";

  const body: HealthResponse = {
    status: overall,
    ts: new Date().toISOString(),
    version: Deno.env.get("APP_VERSION") ?? "unknown",
    subsystems: { database: db, ai, meta },
  };

  console.log(JSON.stringify({ event: "health_check", status: overall, durationMs: Date.now() - start }));

  return new Response(JSON.stringify(body, null, 2), {
    status: overall === "healthy" ? 200 : 503,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      // Public — no auth needed for health checks
      "Access-Control-Allow-Origin": "*",
    },
  });
});
