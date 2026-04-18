// ═══════════════════════════════════════════════
// Nightly Benchmark Refresh — Edge Function (Loop 5)
//
// Replaces hardcoded industry benchmarks in campaignAnalyticsEngine.ts
// with data computed from real user outcomes stored in Supabase.
//
// Reads from:
//   outcome_loop_snapshots  — engine output snapshots (health score, bottlenecks, etc.)
//   outcome_reports         — delayed outcome reports (revenue_reported, etc.)
//   variant_pick_events     — variant pick signals
//
// Writes to:
//   campaign_benchmarks     — cross-cohort percentile benchmarks
//
// Invocation:
//   pg_cron: SELECT cron.schedule('nightly-benchmark', '0 3 * * *', ...)
//   Or manually: POST /functions/v1/nightly-benchmark-refresh
//
// Minimum sample size: 20 (below this, does not overwrite existing benchmark)
// ═══════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MIN_SAMPLE_SIZE = 20;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

interface OutcomeSnapshot {
  archetype_id: string;
  business_field: string;
  health_score: number | null;
  success_probability: number | null;
  bottleneck_count: number;
  snapshotted_at: string;
}

interface OutcomeReport {
  archetype_id: string;
  outcome_type: string;
  delta_value: number | null;
  horizon_days: number;
  reported_at: string;
}

interface BenchmarkRow {
  archetype_id: string;
  business_field: string;
  metric: string;
  p25: number;
  p50: number;
  p75: number;
  sample_n: number;
  computed_at: string;
}

// ───────────────────────────────────────────────
// Stats helpers
// ───────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.ceil(sorted.length * p) - 1);
  return sorted[idx];
}

function computePercentiles(values: number[]): { p25: number; p50: number; p75: number } {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p25: percentile(sorted, 0.25),
    p50: percentile(sorted, 0.50),
    p75: percentile(sorted, 0.75),
  };
}

// ───────────────────────────────────────────────
// Main handler
// ───────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Allow pg_cron service-role calls without user token
  const authHeader = req.headers.get("authorization");
  const isServiceRole = authHeader?.includes(SUPABASE_SERVICE_KEY);
  const isCronHeader = req.headers.get("x-pg-cron") === "1";
  if (!isServiceRole && !isCronHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const results: Record<string, number> = {};

  try {
    // ── 1. Fetch engine snapshots ──
    const { data: snapshots, error: snapErr } = await supabase
      .from("engine_snapshots")
      .select("archetype_id, business_field, health_score, success_probability, bottleneck_count, snapshotted_at")
      .gte("snapshotted_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (snapErr) throw new Error(`snapshots fetch: ${snapErr.message}`);

    // ── 2. Fetch outcome reports (revenue_reported only) ──
    const { data: outcomes, error: outErr } = await supabase
      .from("outcome_reports")
      .select("archetype_id, outcome_type, delta_value, horizon_days, reported_at")
      .eq("outcome_type", "revenue_reported")
      .not("delta_value", "is", null)
      .gte("reported_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (outErr) throw new Error(`outcomes fetch: ${outErr.message}`);

    const snapshotRows = (snapshots ?? []) as OutcomeSnapshot[];
    const outcomeRows = (outcomes ?? []) as OutcomeReport[];

    // ── 3. Group snapshots by (archetype, businessField) ──
    type GroupKey = string;
    const groups = new Map<GroupKey, { snapshots: OutcomeSnapshot[]; revenues: number[] }>();

    for (const snap of snapshotRows) {
      const key: GroupKey = `${snap.archetype_id}:${snap.business_field}`;
      if (!groups.has(key)) groups.set(key, { snapshots: [], revenues: [] });
      groups.get(key)!.snapshots.push(snap);
    }

    for (const out of outcomeRows) {
      // outcome_reports don't have business_field; match by archetype only (cross-field)
      for (const [key, group] of groups.entries()) {
        if (key.startsWith(`${out.archetype_id}:`)) {
          if (out.delta_value !== null) group.revenues.push(out.delta_value);
        }
      }
    }

    // ── 4. Compute and upsert benchmarks ──
    const benchmarkRows: BenchmarkRow[] = [];
    const now = new Date().toISOString();

    for (const [key, group] of groups.entries()) {
      const [archetypeId, businessField] = key.split(":", 2);
      const n = group.snapshots.length;
      if (n < MIN_SAMPLE_SIZE) continue;

      // Health score benchmark
      const healthScores = group.snapshots
        .map((s) => s.health_score)
        .filter((h): h is number => h !== null);
      if (healthScores.length >= MIN_SAMPLE_SIZE) {
        const hp = computePercentiles(healthScores);
        benchmarkRows.push({ archetype_id: archetypeId, business_field: businessField, metric: "health_score", ...hp, sample_n: healthScores.length, computed_at: now });
      }

      // Success probability benchmark
      const probScores = group.snapshots
        .map((s) => s.success_probability)
        .filter((p): p is number => p !== null);
      if (probScores.length >= MIN_SAMPLE_SIZE) {
        const pp = computePercentiles(probScores);
        benchmarkRows.push({ archetype_id: archetypeId, business_field: businessField, metric: "success_probability", ...pp, sample_n: probScores.length, computed_at: now });
      }

      // Revenue benchmark (from outcome_reports)
      if (group.revenues.length >= MIN_SAMPLE_SIZE) {
        const rp = computePercentiles(group.revenues);
        benchmarkRows.push({ archetype_id: archetypeId, business_field: businessField, metric: "revenue_reported", ...rp, sample_n: group.revenues.length, computed_at: now });
      }
    }

    // ── 5. Upsert benchmarks ──
    if (benchmarkRows.length > 0) {
      const { error: upsertErr } = await supabase
        .from("campaign_benchmarks")
        .upsert(benchmarkRows, { onConflict: "archetype_id,business_field,metric" });
      if (upsertErr) throw new Error(`upsert: ${upsertErr.message}`);
    }

    results.groups_processed = groups.size;
    results.benchmarks_upserted = benchmarkRows.length;
    results.snapshots_read = snapshotRows.length;
    results.outcomes_read = outcomeRows.length;

    console.log("[nightly-benchmark-refresh] done:", results);

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[nightly-benchmark-refresh] error:", message);
    return new Response(JSON.stringify({ ok: false, error: message, partial: results }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
