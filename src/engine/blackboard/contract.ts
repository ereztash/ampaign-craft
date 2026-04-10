// ═══════════════════════════════════════════════
// Blackboard Contract — Shared state I/O for every engine
// Every engine reads from and writes to shared_context via
// this helper. Writes mirror automatically into training_pairs
// via a database trigger (see 20260410_002_blackboard_contract.sql).
// ═══════════════════════════════════════════════

import { supabase } from "@/integrations/supabase/client";

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export type ConceptScope = "BUSINESS" | "USER" | "CAMPAIGN";

/**
 * Canonical blackboard key.
 * Shape: `${scope}-${type}-${id}` e.g. "BUSINESS-dna-acme"
 */
export type ConceptKey = `${ConceptScope}-${string}-${string}`;

export type Stage = "discover" | "diagnose" | "design" | "deploy";

export interface SharedContextRow {
  id: string;
  user_id: string;
  plan_id: string | null;
  concept_key: string;
  stage: Stage;
  payload: Record<string, unknown>;
  written_by: string;
  created_at: string;
  updated_at: string;
}

export interface WriteContextParams {
  userId: string;
  planId: string | null;
  key: ConceptKey;
  stage: Stage;
  payload: Record<string, unknown>;
  writtenBy: string;
}

/**
 * Minimal scope that callers must pass into engines for them
 * to write into the blackboard. Engines treat this as opt-in —
 * if omitted, they still return their result but skip the write.
 */
export interface BlackboardWriteContext {
  userId: string;
  planId: string | null;
}

// ───────────────────────────────────────────────
// Untyped Supabase client escape hatch
// shared_context is not in the generated types.ts yet;
// we cast through `unknown` to preserve type-checking inside
// the helper while skipping the generic table type constraint.
// ───────────────────────────────────────────────

type BlackboardBuilder = {
  insert: (row: Record<string, unknown>) => {
    select: (cols: string) => {
      maybeSingle: () => Promise<{ data: SharedContextRow | null; error: { message: string } | null }>;
    };
  };
  update: (row: Record<string, unknown>) => {
    eq: (col: string, val: string) => {
      eq: (col: string, val: string | null) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  };
  select: (cols: string) => {
    eq: (col: string, val: string) => {
      eq: (col: string, val: string | null) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: SharedContextRow | null; error: { message: string } | null }>;
        };
      };
    };
  };
};

function blackboard(): BlackboardBuilder {
  return (supabase as unknown as { from: (table: string) => BlackboardBuilder }).from(
    "shared_context",
  );
}

// ───────────────────────────────────────────────
// readContext
// ───────────────────────────────────────────────

export async function readContext(
  userId: string,
  planId: string | null,
  key: ConceptKey,
): Promise<SharedContextRow | null> {
  try {
    const { data, error } = await blackboard()
      .select("*")
      .eq("user_id", userId)
      .eq("plan_id", planId)
      .eq("concept_key", key)
      .maybeSingle();

    if (error) {
      console.warn("[blackboard] readContext failed:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("[blackboard] readContext threw:", err);
    return null;
  }
}

// ───────────────────────────────────────────────
// writeContext — upsert semantics on (user_id, plan_id, concept_key)
// ───────────────────────────────────────────────

export async function writeContext(params: WriteContextParams): Promise<void> {
  const { userId, planId, key, stage, payload, writtenBy } = params;

  if (!userId) {
    // Anonymous / offline — silently skip rather than crashing the engine.
    return;
  }

  try {
    const existing = await readContext(userId, planId, key);

    if (existing) {
      const { error } = await blackboard()
        .update({
          stage,
          payload,
          written_by: writtenBy,
        })
        .eq("user_id", userId)
        .eq("plan_id", planId)
        .eq("concept_key", key);

      if (error) {
        console.warn("[blackboard] writeContext update failed:", error.message);
      }
      return;
    }

    const { error } = await blackboard()
      .insert({
        user_id: userId,
        plan_id: planId,
        concept_key: key,
        stage,
        payload,
        written_by: writtenBy,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.warn("[blackboard] writeContext insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[blackboard] writeContext threw:", err);
  }
}

// ───────────────────────────────────────────────
// ConceptKey helper — safer than template strings in callers
// ───────────────────────────────────────────────

export function conceptKey(
  scope: ConceptScope,
  type: string,
  id: string,
): ConceptKey {
  return `${scope}-${type}-${id}` as ConceptKey;
}
