// Health Check Edge Function
// GET /functions/v1/health
//
// Returns system health across the subsystems we depend on:
//   - database: SELECT 1 from event_queue, with latency
//   - ai: live ping to Anthropic models endpoint (cheap + cached upstream)
//   - meta: VITE_META_ENABLED kill-switch state
//   - queue: depth + lag of event_queue
//   - cron: last-run age of the daily cleanup jobs
//
// Response: 200 = healthy, 503 = degraded
// Used by uptime monitors, k6 smoke tests, and the incident runbook.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

interface SubsystemStatus {
  status: "ok" | "degraded" | "down";
  latencyMs?: number;
  reason?: string;
  detail?: Record<string, unknown>;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "down";
  ts: string;
  version: string;
  subsystems: {
    database: SubsystemStatus;
    ai: SubsystemStatus;
    meta: SubsystemStatus;
    queue: SubsystemStatus;
    cron: SubsystemStatus;
  };
}

async function checkDatabase(): Promise<SubsystemStatus> {
  const t0 = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error } = await supabase.from("event_queue").select("id").limit(1);
    if (error) return { status: "degraded", reason: error.message, latencyMs: Date.now() - t0 };
    const latencyMs = Date.now() - t0;
    // p95 SLO is 2000ms per docs/slo.md
    if (latencyMs > 2000) {
      return { status: "degraded", latencyMs, reason: "Latency above SLO threshold" };
    }
    return { status: "ok", latencyMs };
  } catch (e) {
    return { status: "down", reason: String(e), latencyMs: Date.now() - t0 };
  }
}

// Live ping to Anthropic. We hit the cheapest endpoint with a 2 sec
// timeout — a 5xx or timeout means the AI subsystem is degraded, even
// if our key is set correctly.
async function checkAI(): Promise<SubsystemStatus> {
  if (!ANTHROPIC_API_KEY) {
    return { status: "degraded", reason: "ANTHROPIC_API_KEY not set" };
  }
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 2000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    const latencyMs = Date.now() - t0;
    if (res.status === 200) return { status: "ok", latencyMs };
    if (res.status === 401 || res.status === 403) {
      return { status: "down", reason: `Anthropic auth failed (${res.status})`, latencyMs };
    }
    return { status: "degraded", reason: `Anthropic HTTP ${res.status}`, latencyMs };
  } catch (e) {
    clearTimeout(timeout);
    const reason = e instanceof Error && e.name === "AbortError"
      ? "Anthropic timeout (>2s)"
      : `Anthropic unreachable: ${e instanceof Error ? e.message : String(e)}`;
    return { status: "degraded", reason, latencyMs: Date.now() - t0 };
  }
}

function checkMeta(): SubsystemStatus {
  const enabled = Deno.env.get("VITE_META_ENABLED") !== "false";
  return {
    status: enabled ? "ok" : "degraded",
    reason: enabled ? undefined : "Meta integration disabled via ENV (kill-switch)",
  };
}

// Queue depth signals worker health. >1000 pending events = degraded.
async function checkQueue(): Promise<SubsystemStatus> {
  const t0 = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { count, error } = await supabase
      .from("event_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if (error) {
      return { status: "degraded", reason: error.message, latencyMs: Date.now() - t0 };
    }
    const depth = count ?? 0;
    if (depth > 1000) {
      return { status: "degraded", latencyMs: Date.now() - t0, detail: { depth }, reason: "Queue depth above threshold" };
    }
    return { status: "ok", latencyMs: Date.now() - t0, detail: { depth } };
  } catch (e) {
    return { status: "degraded", reason: String(e), latencyMs: Date.now() - t0 };
  }
}

// Cron lag — last successful run of cleanup-old-events. Stale cron is a
// silent risk: embeddings TTL stops kicking in, costs creep up.
async function checkCron(): Promise<SubsystemStatus> {
  const t0 = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    // cron.job_run_details is owned by the cron extension. Fall back to
    // "ok" if the extension isn't installed (dev/test envs).
    const { data, error } = await supabase
      .rpc("cron_last_run_age_seconds", { p_job_name: "cleanup-old-events" })
      .single();
    if (error) {
      // RPC may not exist; treat as informational, not a hard failure.
      return { status: "ok", latencyMs: Date.now() - t0, reason: "cron lag check unavailable" };
    }
    const ageSec = (data as unknown as number) ?? 0;
    // Daily job: > 36h since last run = stale.
    if (ageSec > 36 * 3600) {
      return {
        status: "degraded",
        latencyMs: Date.now() - t0,
        reason: `cleanup-old-events stale (${Math.round(ageSec / 3600)}h)`,
      };
    }
    return { status: "ok", latencyMs: Date.now() - t0, detail: { lastRunAgeSec: ageSec } };
  } catch (e) {
    return { status: "ok", reason: `cron probe error: ${String(e)}`, latencyMs: Date.now() - t0 };
  }
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const start = Date.now();
  const [db, ai, meta, queue, cron] = await Promise.all([
    checkDatabase(),
    checkAI(),
    checkMeta(),
    checkQueue(),
    checkCron(),
  ]);

  const statuses = [db.status, ai.status, meta.status, queue.status, cron.status];
  const overall: HealthResponse["status"] = statuses.includes("down")
    ? "down"
    : statuses.includes("degraded")
    ? "degraded"
    : "healthy";

  const body: HealthResponse = {
    status: overall,
    ts: new Date().toISOString(),
    version: Deno.env.get("APP_VERSION") ?? "unknown",
    subsystems: { database: db, ai, meta, queue, cron },
  };

  console.log(JSON.stringify({
    event: "health_check",
    status: overall,
    durationMs: Date.now() - start,
    db: db.status,
    ai: ai.status,
    queue: queue.status,
  }));

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
