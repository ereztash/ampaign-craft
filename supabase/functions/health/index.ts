// Health Check Edge Function
// GET /functions/v1/health              → shallow check (fast, free)
// GET /functions/v1/health?deep=1       → deep check (live 1-token ping to Anthropic)
//
// Returns system health across 3 subsystems:
//   - database: can we SELECT 1 from Supabase?
//   - ai: is ANTHROPIC_API_KEY set? (shallow) — does a 1-token request succeed? (deep)
//   - meta: is Meta integration enabled?
//
// Response: 200 = healthy, 503 = degraded/down
// The deep probe can be gated with HEALTH_DEEP_TOKEN to avoid unauthenticated billing.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HEALTH_DEEP_TOKEN = Deno.env.get("HEALTH_DEEP_TOKEN");

interface SubsystemStatus {
  status: "ok" | "degraded" | "down";
  latencyMs?: number;
  reason?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "down";
  ts: string;
  version: string;
  probe: { mode: "shallow" | "deep" };
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

async function checkAI(deep: boolean): Promise<SubsystemStatus> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return { status: "degraded", reason: "missing_api_key:ANTHROPIC_API_KEY not set" };
  if (!deep) return { status: "ok" };

  const t0 = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    const latencyMs = Date.now() - t0;

    if (res.ok) return { status: "ok", latencyMs };

    let errType = "";
    let errMsg = "";
    try {
      const body = await res.json();
      errType = body?.error?.type ?? "";
      errMsg = body?.error?.message ?? "";
    } catch {
      // response had no JSON body
    }

    if (res.status === 401 || errType === "authentication_error") {
      return { status: "down", reason: "invalid_api_key", latencyMs };
    }
    if (res.status === 403 || errType === "permission_error") {
      return { status: "down", reason: "unauthorized", latencyMs };
    }
    if (res.status === 429) {
      return { status: "degraded", reason: "rate_limited", latencyMs };
    }
    if ((res.status === 400 || res.status === 404) && /model|not_found/i.test(errType + errMsg)) {
      return { status: "down", reason: "model_not_found", latencyMs };
    }
    return { status: "degraded", reason: `upstream_error:${res.status}`, latencyMs };
  } catch (e) {
    const latencyMs = Date.now() - t0;
    const isAbort = e instanceof DOMException && e.name === "AbortError";
    return { status: "down", reason: isAbort ? "network_error:timeout" : `network_error:${String(e)}`, latencyMs };
  } finally {
    clearTimeout(timeout);
  }
}

function checkMeta(): SubsystemStatus {
  const enabled = Deno.env.get("VITE_META_ENABLED") !== "false";
  return { status: enabled ? "ok" : "degraded", reason: enabled ? undefined : "Meta integration disabled via ENV" };
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const deepRequested = url.searchParams.get("deep") === "1";
  const providedToken = url.searchParams.get("token");

  // Gate the deep probe when HEALTH_DEEP_TOKEN is configured.
  // When unset, deep is allowed unauthenticated (dev convenience).
  if (deepRequested && HEALTH_DEEP_TOKEN && providedToken !== HEALTH_DEEP_TOKEN) {
    return new Response(
      JSON.stringify({ error: "deep probe requires valid token" }),
      { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  }

  const start = Date.now();
  const [db, ai, meta] = await Promise.all([checkDatabase(), checkAI(deepRequested), checkMeta()]);

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
    probe: { mode: deepRequested ? "deep" : "shallow" },
    subsystems: { database: db, ai, meta },
  };

  console.log(JSON.stringify({ event: "health_check", mode: body.probe.mode, status: overall, durationMs: Date.now() - start }));

  return new Response(JSON.stringify(body, null, 2), {
    status: overall === "healthy" ? 200 : 503,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
