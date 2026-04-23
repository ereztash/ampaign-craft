// ═══════════════════════════════════════════════
// Knowledge Graph Service — client API for M7 extraction + query.
//
// Thin wrapper around three operations:
//   1. persistRuleBasedFacts(input, ctx)      — run rule-based extractor
//      + verifyFact + write via RPC. Used inline on every form save.
//   2. requestLLMExtraction(items, userId)    — enqueue async extraction
//      of free-form text (productDescription, chat turns, etc.) via
//      the extract-knowledge edge function.
//   3. queryKnowledge(query)                  — call knowledge-query
//      edge function and surface the answer + evidence_refs.
//
// All three respect the existing llmRouter/circuitBreaker/auth
// infrastructure; the service itself is pure orchestration.
// ═══════════════════════════════════════════════

import { supabaseLoose as db } from "@/integrations/supabase/loose";
import { authFetch } from "@/lib/authFetch";
import {
  extractFacts,
  hasRuleCoverage,
  type ExtractionContext,
  type ExtractionInput,
} from "@/engine/optimization/knowledgeExtractor";
import { verifyFact } from "@/engine/optimization/ontologicalVerifier";
import {
  canonicalize,
  EXTRACTOR_VERSION,
  type ExtractedFact,
} from "@/engine/optimization/graosOntology";

// ───────────────────────────────────────────────
// Types surfaced to callers
// ───────────────────────────────────────────────

export interface PersistResult {
  attempted: number;
  rejectedByVerifier: number;
  entitiesUpserted: number;
  factsInserted: number;
  outcomes: Array<{ outcome: string; fact_id?: string; superseded?: string }>;
}

export interface KnowledgeAnswer {
  answer: string;
  evidence_refs: string[];
  intent: "LOOKUP" | "AGGREGATE" | "REASON" | "GENERATE" | "META";
  complexity: "no_retrieval" | "single_hop" | "multi_hop" | "global";
  cached: boolean;
  cost_tier: "cache" | "haiku" | "sonnet";
}

// ───────────────────────────────────────────────
// 1. Rule-based persistence (inline)
// ───────────────────────────────────────────────

/**
 * Runs the M7 rule-based extractor on a FormData-shaped input, filters
 * through verifyFact, and persists via the atomic reconciliation RPC.
 * Safe to call from any client path that already owns the user's
 * session. Never throws — returns a result that callers can log.
 */
export async function persistRuleBasedFacts(
  input: ExtractionInput,
  ctx: ExtractionContext,
): Promise<PersistResult> {
  const result: PersistResult = {
    attempted: 0,
    rejectedByVerifier: 0,
    entitiesUpserted: 0,
    factsInserted: 0,
    outcomes: [],
  };

  if (!hasRuleCoverage(input)) return result;

  const { facts } = extractFacts(input, ctx);
  result.attempted = facts.length;

  const accepted: ExtractedFact[] = [];
  for (const f of facts) {
    const v = verifyFact(f);
    if (!v.ok) {
      result.rejectedByVerifier += 1;
      continue;
    }
    accepted.push(f);
  }
  if (accepted.length === 0) return result;

  const entityMap = buildEntityMap(accepted);
  const idLookup = await upsertEntities(ctx.userId, entityMap);
  result.entitiesUpserted = idLookup.size;

  for (const f of accepted) {
    const subjectId = idLookup.get(keyFor(f.subject.type, f.subject.canonical));
    if (!subjectId) continue;
    const objectId = "type" in f.object
      ? (idLookup.get(keyFor(f.object.type, f.object.canonical)) ?? null)
      : null;
    const objectLiteral = !("type" in f.object) ? { value: f.object.literal } : null;

    const { data, error } = await db.rpc("kg_reconcile_and_insert_fact", {
      p_user_id: ctx.userId,
      p_subject_id: subjectId,
      p_predicate: f.predicate,
      p_object_id: objectId,
      p_object_literal: objectLiteral,
      p_confidence: f.confidence,
      p_evidence_source_table: f.evidence.source_table,
      p_evidence_source_id: f.evidence.source_id,
      p_evidence_quote: f.evidence.quote,
      p_extracted_by: f.extracted_by,
      p_extractor_version: f.extractor_version,
      p_dapl_snapshot: f.dapl_snapshot ?? null,
      p_regime: f.regime ?? null,
      p_mode: "auto",
    });
    if (error) {
      // Swallow per-fact errors so one bad fact doesn't tank the batch;
      // caller already has the count. Surface through telemetry later.
      continue;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.outcome === "new" || row?.outcome === "update") {
      result.factsInserted += 1;
    }
    if (row) result.outcomes.push(row as { outcome: string; fact_id?: string; superseded?: string });
  }

  return result;
}

// ───────────────────────────────────────────────
// 2. Request async LLM extraction
// ───────────────────────────────────────────────

export interface LLMExtractionItem {
  text: string;
  sourceTable:
    | "shared_context"
    | "saved_plans"
    | "differentiation_results"
    | "user_form_data"
    | "ai_coach_message"
    | "meta_insights"
    | "import";
  sourceId: string;
  hint?: "business_profile" | "competitor_insight" | "audience_pain" | "offer_detail" | "chat_turn";
}

/**
 * Submits free-form text to the extract-knowledge edge function for
 * LLM extraction. Returns immediately with the response; the heavy
 * lifting (Claude call + reconciliation) happens server-side.
 *
 * For async/bulk work prefer enqueuing a knowledge.extract.requested
 * event through eventQueue.ts instead — this direct path is for UI
 * previews.
 */
export async function requestLLMExtraction(
  items: LLMExtractionItem[],
  userId: string,
): Promise<{ extracted: number; rejected_schema: number; dropped_for_injection: unknown[] } | null> {
  if (items.length === 0) return { extracted: 0, rejected_schema: 0, dropped_for_injection: [] };
  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const resp = await authFetch(`${baseUrl}/functions/v1/extract-knowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      items: items.map((i) => ({
        text: i.text,
        source_table: i.sourceTable,
        source_id: i.sourceId,
        hint: i.hint,
      })),
    }),
  });
  if (!resp.ok) return null;
  return resp.json();
}

// ───────────────────────────────────────────────
// 3. Query knowledge
// ───────────────────────────────────────────────

export async function queryKnowledge(query: string): Promise<KnowledgeAnswer | null> {
  if (!query || query.trim().length === 0) return null;
  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const resp = await authFetch(`${baseUrl}/functions/v1/knowledge-query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: query.trim() }),
  });
  if (!resp.ok) return null;
  return (await resp.json()) as KnowledgeAnswer;
}

// ───────────────────────────────────────────────
// 4. Business-twin summary for the UI / churn guardian
// ───────────────────────────────────────────────

export interface BusinessTwinSummary {
  factCount: number;
  entityCount: number;
  entitiesByType: Record<string, number>;
  recentFacts: Array<{
    id: string;
    predicate: string;
    subject: string;
    object: string;
    confidence: number;
    created_at: string;
  }>;
}

/**
 * Cheap read used by the UI Knowledge Receipt (churn flow) and
 * Business Twin panel. Pure Supabase reads; RLS filters by user.
 */
export async function fetchBusinessTwinSummary(userId: string): Promise<BusinessTwinSummary> {
  const [{ count: factCount }, { data: entities }, { data: recent }] = await Promise.all([
    db.from("knowledge_facts").select("*", { count: "exact", head: true }).eq("user_id", userId).is("valid_until", null),
    db.from("knowledge_entities").select("entity_type").eq("user_id", userId),
    db
      .from("knowledge_facts")
      .select(`
        id, predicate, confidence, created_at,
        subject:knowledge_entities!knowledge_facts_subject_id_fkey (canonical_name, entity_type),
        object:knowledge_entities!knowledge_facts_object_id_fkey (canonical_name, entity_type)
      `)
      .eq("user_id", userId)
      .is("valid_until", null)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const entitiesByType: Record<string, number> = {};
  for (const e of (entities ?? []) as Array<{ entity_type: string }>) {
    entitiesByType[e.entity_type] = (entitiesByType[e.entity_type] ?? 0) + 1;
  }

  const recentFacts = ((recent ?? []) as Array<Record<string, unknown>>).map((r) => {
    const s = r.subject as { canonical_name: string; entity_type: string } | null;
    const o = r.object as { canonical_name: string; entity_type: string } | null;
    return {
      id: String(r.id),
      predicate: String(r.predicate),
      subject: s ? `${s.entity_type}/${s.canonical_name}` : "?",
      object: o ? `${o.entity_type}/${o.canonical_name}` : "(literal)",
      confidence: Number(r.confidence),
      created_at: String(r.created_at),
    };
  });

  return {
    factCount: factCount ?? 0,
    entityCount: ((entities ?? []) as unknown[]).length,
    entitiesByType,
    recentFacts,
  };
}

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

type EntityKey = string;

function keyFor(t: string, c: string): EntityKey {
  return `${t}::${c}`;
}

function buildEntityMap(facts: ExtractedFact[]): Map<EntityKey, { type: string; canonical: string }> {
  const m = new Map<EntityKey, { type: string; canonical: string }>();
  for (const f of facts) {
    m.set(keyFor(f.subject.type, f.subject.canonical), f.subject);
    if ("type" in f.object) {
      m.set(keyFor(f.object.type, f.object.canonical), f.object);
    }
  }
  return m;
}

async function upsertEntities(
  userId: string,
  entityMap: Map<EntityKey, { type: string; canonical: string }>,
): Promise<Map<EntityKey, string>> {
  const rows = [...entityMap.values()].map((e) => ({
    user_id: userId,
    entity_type: e.type,
    canonical_name: canonicalize(e.canonical),
    display_name: e.canonical,
    source_user_id: userId,
    extractor_version: EXTRACTOR_VERSION,
    mention_count: 1,
  }));
  const idLookup = new Map<EntityKey, string>();
  if (rows.length === 0) return idLookup;

  const { data, error } = await db
    .from("knowledge_entities")
    .upsert(rows, { onConflict: "user_id,entity_type,canonical_name", ignoreDuplicates: false })
    .select("id,entity_type,canonical_name");
  if (error) return idLookup;

  for (const row of (data ?? []) as Array<{ id: string; entity_type: string; canonical_name: string }>) {
    idLookup.set(keyFor(row.entity_type, row.canonical_name), row.id);
  }
  return idLookup;
}
