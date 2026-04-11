// ═══════════════════════════════════════════════
// Blackboard Client (read surface, E4 onwards)
//
// Thin boundary layer between the optimization engines and the
// shared_context table in Supabase. Currently exposes ONLY a read
// API — writeConcept will be added in a later expansion when
// persistence becomes mandatory.
//
// All callers go through this module instead of importing the
// Supabase client directly so that mocking, error handling, and
// stage normalization stay in one place.
//
// Stage normalization: the DB CHECK constraint on shared_context.stage
// allows ('discover', 'diagnose', 'design', 'deploy'), but the
// TypeScript ontologicalVerifier accepts only ('discover', 'process',
// 'deploy'). Rows whose stage is not in the verifier set are
// silently dropped at the boundary so downstream engines see a
// uniform shape.
// ═══════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";
import type { BlackboardWrite } from "./ontologicalVerifier";
import type { FailedCardSignature } from "./adaptiveVerifier";

const VALID_STAGES: ReadonlySet<BlackboardWrite["stage"]> = new Set([
  "discover",
  "process",
  "deploy",
]);

function isValidStage(s: unknown): s is BlackboardWrite["stage"] {
  return typeof s === "string" && (VALID_STAGES as ReadonlySet<string>).has(s);
}

interface RawRow {
  concept_key?: unknown;
  stage?: unknown;
  payload?: unknown;
}

function rowToWrite(row: RawRow): BlackboardWrite | null {
  const stage = row.stage;
  if (!isValidStage(stage)) return null;
  const concept_key = typeof row.concept_key === "string" ? row.concept_key : "";
  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {};
  return { concept_key, stage, payload };
}

/**
 * Read the most recent shared_context writes for a single user,
 * ordered by created_at descending. Returns at most `limit` rows
 * (clamped to [1, 100]). Rows with stages outside the verifier
 * enum are filtered out at the boundary.
 *
 * On any error or missing data the function returns an empty array
 * — engines that consume the result must treat an empty list as
 * "no signal" and avoid intervening.
 */
export async function readRecent(
  user_id: string,
  limit: number = 20,
): Promise<BlackboardWrite[]> {
  if (!user_id || typeof user_id !== "string") return [];
  const safeLimit = Math.max(
    1,
    Math.min(100, Math.floor(Number.isFinite(limit) ? limit : 20)),
  );

  // shared_context is not in the generated Supabase types, so the
  // query goes through a single localized cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  let data: unknown[] | null = null;
  try {
    const result = await client
      .from("shared_context")
      .select("concept_key, stage, payload")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(safeLimit);
    if (result?.error) return [];
    data = (result?.data ?? null) as unknown[] | null;
  } catch {
    return [];
  }

  if (!Array.isArray(data)) return [];
  const out: BlackboardWrite[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const w = rowToWrite(raw as RawRow);
    if (w !== null) out.push(w);
  }
  return out;
}

// ───────────────────────────────────────────────
// E6 — reflective_failures read + record
// ───────────────────────────────────────────────

interface RawFailureRow {
  engines_used?: unknown;
  falsifier_metric?: unknown;
  regime_at_time?: unknown;
  coherence_score_at_time?: unknown;
  failed_at?: unknown;
}

function parseFailureRow(row: RawFailureRow): FailedCardSignature | null {
  const engines_raw = row.engines_used;
  const engines_used: string[] = Array.isArray(engines_raw)
    ? (engines_raw.filter((e) => typeof e === "string") as string[])
    : [];
  const falsifier_metric =
    typeof row.falsifier_metric === "string" ? row.falsifier_metric : "";
  const regime_at_time =
    typeof row.regime_at_time === "string" ? row.regime_at_time : "unknown";
  const score =
    typeof row.coherence_score_at_time === "number" &&
    Number.isFinite(row.coherence_score_at_time)
      ? row.coherence_score_at_time
      : 0;
  let ts = 0;
  if (typeof row.failed_at === "string") {
    const parsed = Date.parse(row.failed_at);
    if (Number.isFinite(parsed)) ts = parsed;
  } else if (typeof row.failed_at === "number" && Number.isFinite(row.failed_at)) {
    ts = row.failed_at;
  }
  if (!falsifier_metric) return null;
  return { ts, engines_used, falsifier_metric, regime_at_time, score };
}

/**
 * Read recent FailedCardSignature rows from reflective_failures.
 * Returns an empty array on any error — the adaptive verifier
 * treats an empty list as "not enough data yet" and passes through.
 *
 * Global by default (no user_id filter): the moat principle is that
 * the system learns from every failure, not just the current user's,
 * so the data network effect compounds across users.
 */
export async function readFailures(
  limit: number = 100,
): Promise<FailedCardSignature[]> {
  const safeLimit = Math.max(
    1,
    Math.min(500, Math.floor(Number.isFinite(limit) ? limit : 100)),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  let data: unknown[] | null = null;
  try {
    const result = await client
      .from("reflective_failures")
      .select(
        "engines_used, falsifier_metric, regime_at_time, coherence_score_at_time, failed_at",
      )
      .order("failed_at", { ascending: false })
      .limit(safeLimit);
    if (result?.error) return [];
    data = (result?.data ?? null) as unknown[] | null;
  } catch {
    return [];
  }

  if (!Array.isArray(data)) return [];
  const out: FailedCardSignature[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const sig = parseFailureRow(raw as RawFailureRow);
    if (sig !== null) out.push(sig);
  }
  return out;
}

/**
 * Record a failure for a given reflective-action card.
 *
 * This is a best-effort stub for the scheduled task described in
 * section 3.E6 of the MOAT prompt ("recordFailure: called from a
 * scheduled task, not part of this prompt"). It reads the original
 * card from shared_context, derives the failure signature from its
 * payload, and inserts a row into reflective_failures. Any DB error
 * is swallowed silently — the scheduled task is expected to handle
 * its own retries.
 */
export async function recordFailure(
  card_id: string,
  observed_value: number,
): Promise<void> {
  if (!card_id || typeof card_id !== "string") return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  try {
    const readResult = await client
      .from("shared_context")
      .select("concept_key, payload, user_id")
      .eq("concept_key", card_id)
      .maybeSingle();
    if (readResult?.error || !readResult?.data) return;

    const row = readResult.data as {
      concept_key?: unknown;
      payload?: unknown;
      user_id?: unknown;
    };
    const payload =
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {};

    const falsifier_metric = payload.falsifier_metric;
    if (
      typeof falsifier_metric !== "string" ||
      falsifier_metric === "none" ||
      falsifier_metric.length === 0
    ) {
      return;
    }

    const user_id = typeof row.user_id === "string" ? row.user_id : "";
    if (!user_id) return;

    await client.from("reflective_failures").insert({
      card_id,
      user_id,
      engines_used: Array.isArray(payload.engines_used) ? payload.engines_used : [],
      falsifier_metric,
      falsifier_threshold:
        typeof payload.falsifier_threshold === "number"
          ? payload.falsifier_threshold
          : 0,
      falsifier_direction:
        payload.falsifier_direction === "below" ? "below" : "above",
      falsifier_window_days:
        typeof payload.falsification_window_days === "number"
          ? payload.falsification_window_days
          : 0,
      regime_at_time:
        typeof payload.regime_at_time === "string" ? payload.regime_at_time : null,
      coherence_score_at_time:
        typeof payload.coherence_score === "number" ? payload.coherence_score : null,
      observed_value,
    });
  } catch {
    // Scheduled task handles retries — swallow silently here.
  }
}
