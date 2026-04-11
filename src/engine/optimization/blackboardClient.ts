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
