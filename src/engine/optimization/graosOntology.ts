// ═══════════════════════════════════════════════
// M7 — GRAOS Knowledge Ontology
//
// Closed schema for the knowledge-extraction overlay. Every fact that
// lands in knowledge_facts MUST name an entity_type from ENTITY_TYPES
// and a predicate from PREDICATES. Open extraction (free-form triples)
// drops reliability below ~75% per Adaptive-RAG evals; a closed
// ontology with Zod-enforced tool-use output hits >92%.
//
// This module is pure — no Supabase, no React, zero I/O. It sits next to
// M1–M6 under src/engine/optimization/ and is consumed by:
//   1. knowledgeExtractor.ts (M7 rule-based engine, same directory)
//   2. ontologicalVerifier.ts (verifyFact — single write gate)
//   3. supabase/functions/extract-knowledge (LLM tool-use schema)
//   4. supabase/functions/knowledge-query (retrieval types)
//
// When adding a predicate or entity type, update DB CHECK constraints in
// the knowledge_graph migration to match — they are deliberately
// redundant so a misbehaving extractor can't poison the graph.
// ═══════════════════════════════════════════════

import { z } from "zod";

// ───────────────────────────────────────────────
// Entity types
// Keep deliberately narrow. Anything that doesn't fit one of these ids
// is NOT a first-class entity and should be stored as object_literal
// instead. Expansion requires a migration CHECK-constraint update.
// ───────────────────────────────────────────────

export const ENTITY_TYPES = [
  "business",    // the tenant's company / brand
  "product",     // what they sell
  "audience",    // who they sell to
  "channel",     // facebook, whatsapp, etc.
  "offer",       // a specific package / pricing construct
  "pain",        // pain point owned by an audience or persona
  "objection",   // resistance that blocks conversion
  "hook",        // a specific creative angle / message
  "metric",      // a measured quantity (ctr, cvr, cpl)
  "competitor",  // a named competitor
  "persona",     // a buyer persona / DISC profile
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

// ───────────────────────────────────────────────
// Predicates
// Grouped by semantic family. Each predicate declares:
//   - valid subject types (what it makes sense to predicate ABOUT)
//   - valid object shape: "entity" | "literal" | "either"
// ───────────────────────────────────────────────

export const PREDICATES = [
  // Business context
  "has_product",              // business → product
  "targets_audience",         // business|product → audience
  "operates_in_market",       // business → literal
  "competes_with",            // business → competitor
  // Performance / outcome
  "converted_on",             // hook|offer|channel → metric (literal)
  "failed_with",              // hook|offer|channel → audience|literal
  "improved_metric",          // offer|hook → metric
  // Psychology / audience modeling
  "exhibits_archetype",       // business|persona → literal (archetype id)
  "resists_objection",        // audience|persona → objection
  "prefers_tone",             // audience|persona → literal
  "experiences_pain",         // audience|persona → pain
  // Intent
  "plans_to",                 // business → literal
  "blocked_by",               // business → objection|literal
  // Cross-tenant, anonymized (user_id IS NULL on resulting facts)
  "similar_businesses_succeed_with", // business → hook|offer|channel
] as const;

export type Predicate = (typeof PREDICATES)[number];

// Object arity contract per predicate. The verifier uses this to reject
// facts whose subject/object types are nonsensical (e.g., a metric with
// "targets_audience"). Two benefits:
//   1. catches LLM hallucinations that wire the wrong entity types
//   2. enables static planning for retrieval (we know which types live
//      on each side of each edge)
interface PredicateContract {
  subjects: readonly EntityType[];
  objectKind: "entity" | "literal" | "either";
  objectTypes?: readonly EntityType[]; // required when objectKind is "entity" or "either"
  /** Marks predicates safe for cross-tenant anonymized storage. */
  crossTenant?: boolean;
}

export const PREDICATE_CONTRACT: Readonly<Record<Predicate, PredicateContract>> = {
  has_product:              { subjects: ["business"],                 objectKind: "entity",  objectTypes: ["product"] },
  targets_audience:         { subjects: ["business", "product"],      objectKind: "entity",  objectTypes: ["audience"] },
  operates_in_market:       { subjects: ["business"],                 objectKind: "literal" },
  competes_with:            { subjects: ["business"],                 objectKind: "entity",  objectTypes: ["competitor"] },
  converted_on:             { subjects: ["hook", "offer", "channel"], objectKind: "literal" },
  failed_with:              { subjects: ["hook", "offer", "channel"], objectKind: "either",  objectTypes: ["audience"] },
  improved_metric:          { subjects: ["offer", "hook", "channel"], objectKind: "entity",  objectTypes: ["metric"] },
  exhibits_archetype:       { subjects: ["business", "persona"],      objectKind: "literal" },
  resists_objection:        { subjects: ["audience", "persona"],      objectKind: "entity",  objectTypes: ["objection"] },
  prefers_tone:             { subjects: ["audience", "persona"],      objectKind: "literal" },
  experiences_pain:         { subjects: ["audience", "persona"],      objectKind: "entity",  objectTypes: ["pain"] },
  plans_to:                 { subjects: ["business"],                 objectKind: "literal" },
  blocked_by:               { subjects: ["business"],                 objectKind: "either",  objectTypes: ["objection"] },
  similar_businesses_succeed_with: { subjects: ["business"],          objectKind: "entity",  objectTypes: ["hook", "offer", "channel"], crossTenant: true },
};

// ───────────────────────────────────────────────
// Regime + DAPL snapshot types (re-exported for convenience, matches M1 & M5)
// ───────────────────────────────────────────────

export const REGIME_VALUES = ["stable", "transitional", "crisis"] as const;
export type Regime = (typeof REGIME_VALUES)[number];

// ───────────────────────────────────────────────
// Zod schemas — single source of truth
// These drive:
//   - tool-use JSON schema in the extract-knowledge edge function
//   - runtime validation in verifyFact
//   - client-side type inference via z.infer
// ───────────────────────────────────────────────

const entityRefSchema = z.object({
  type: z.enum(ENTITY_TYPES),
  canonical: z.string().min(1).max(200),
});

const objectRefSchema = z.union([
  entityRefSchema,
  z.object({
    literal: z.union([z.string().max(500), z.number().finite(), z.boolean()]),
  }),
]);

const evidenceSchema = z.object({
  source_table: z.enum([
    "shared_context",
    "saved_plans",
    "differentiation_results",
    "user_form_data",
    "ai_coach_message",
    "meta_insights",
    "import",
  ]),
  source_id: z.string().uuid(),
  quote: z.string().min(1).max(500),
});

const daplSnapshotSchema = z
  .object({
    risk_tolerance: z.number().min(0).max(1).optional(),
    speed_preference: z.number().min(0).max(1).optional(),
    detail_orientation: z.number().min(0).max(1).optional(),
    strategic_depth: z.number().min(0).max(1).optional(),
    channel_confidence: z.number().min(0).max(1).optional(),
    brand_maturity: z.number().min(0).max(1).optional(),
    data_literacy: z.number().min(0).max(1).optional(),
    updated_at: z.number().optional(),
  })
  .passthrough();

export const extractedFactSchema = z.object({
  subject: entityRefSchema,
  predicate: z.enum(PREDICATES),
  object: objectRefSchema,
  confidence: z.number().min(0).max(1),
  evidence: evidenceSchema,
  dapl_snapshot: daplSnapshotSchema.optional(),
  regime: z.enum(REGIME_VALUES).optional(),
  extracted_by: z.string().min(1).max(64),
  extractor_version: z.string().min(1).max(32),
});

export type EntityRef = z.infer<typeof entityRefSchema>;
export type ObjectRef = z.infer<typeof objectRefSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type ExtractedFact = z.infer<typeof extractedFactSchema>;

// ───────────────────────────────────────────────
// Canonicalization — maps free-form text to canonical entity keys.
// Keeping this deterministic avoids duplicate entities that differ only
// in casing / whitespace / punctuation. Fuzzy near-duplicates (e.g.,
// "B2B SaaS" vs "SaaS B2B") are handled downstream via embedding
// similarity at Entity Resolution stage.
// ───────────────────────────────────────────────

export function canonicalize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9֐-׿-]/g, "") // keep ascii-alnum + Hebrew block
    .slice(0, 200);
}

// ───────────────────────────────────────────────
// Contract helpers used by verifyFact
// ───────────────────────────────────────────────

export interface ContractViolation {
  code:
    | "bad_subject_for_predicate"
    | "bad_object_kind"
    | "bad_object_entity_type"
    | "empty_literal"
    | "cross_tenant_not_allowed";
  message: string;
}

/**
 * Pure check: does this (subject, predicate, object) triple satisfy the
 * semantic contract? Does NOT duplicate the Zod schema checks — those
 * are run separately; this one is about cross-field consistency.
 *
 * Pass `allowCrossTenant=true` only when inserting an anonymized,
 * DP-noised fact into the global pool (user_id IS NULL).
 */
export function checkContract(
  subject: EntityRef,
  predicate: Predicate,
  object: ObjectRef,
  allowCrossTenant: boolean = false,
): ContractViolation | null {
  const contract = PREDICATE_CONTRACT[predicate];

  if (!contract.subjects.includes(subject.type)) {
    return {
      code: "bad_subject_for_predicate",
      message: `predicate '${predicate}' does not accept subject type '${subject.type}'`,
    };
  }

  if (contract.crossTenant && !allowCrossTenant) {
    return {
      code: "cross_tenant_not_allowed",
      message: `predicate '${predicate}' is cross-tenant only; pass allowCrossTenant=true`,
    };
  }

  const objectIsEntity = "type" in object;

  if (contract.objectKind === "entity" && !objectIsEntity) {
    return {
      code: "bad_object_kind",
      message: `predicate '${predicate}' requires an entity object, got literal`,
    };
  }
  if (contract.objectKind === "literal" && objectIsEntity) {
    return {
      code: "bad_object_kind",
      message: `predicate '${predicate}' requires a literal object, got entity`,
    };
  }

  if (objectIsEntity && contract.objectTypes && !contract.objectTypes.includes(object.type)) {
    return {
      code: "bad_object_entity_type",
      message: `predicate '${predicate}' object must be one of [${contract.objectTypes.join(", ")}], got '${object.type}'`,
    };
  }

  if (!objectIsEntity) {
    const lit = (object as { literal: unknown }).literal;
    if (typeof lit === "string" && lit.trim().length === 0) {
      return { code: "empty_literal", message: "object literal is empty" };
    }
  }

  return null;
}

// ───────────────────────────────────────────────
// JSON schema for Claude tool-use — hand-built to avoid runtime zod-to-json
// dependencies inside Deno edge runtime. Must be kept in sync with
// `extractedFactSchema` above — the tests cover the round-trip.
// ───────────────────────────────────────────────

export const EXTRACTED_FACT_JSON_SCHEMA = {
  type: "object",
  required: ["subject", "predicate", "object", "confidence", "evidence", "extracted_by", "extractor_version"],
  properties: {
    subject: {
      type: "object",
      required: ["type", "canonical"],
      properties: {
        type: { type: "string", enum: ENTITY_TYPES as unknown as string[] },
        canonical: { type: "string", minLength: 1, maxLength: 200 },
      },
    },
    predicate: { type: "string", enum: PREDICATES as unknown as string[] },
    object: {
      oneOf: [
        {
          type: "object",
          required: ["type", "canonical"],
          properties: {
            type: { type: "string", enum: ENTITY_TYPES as unknown as string[] },
            canonical: { type: "string", minLength: 1, maxLength: 200 },
          },
        },
        {
          type: "object",
          required: ["literal"],
          properties: { literal: { oneOf: [{ type: "string", maxLength: 500 }, { type: "number" }, { type: "boolean" }] } },
        },
      ],
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    evidence: {
      type: "object",
      required: ["source_table", "source_id", "quote"],
      properties: {
        source_table: { type: "string", enum: ["shared_context", "saved_plans", "differentiation_results", "user_form_data", "ai_coach_message", "meta_insights", "import"] },
        source_id: { type: "string", pattern: "^[0-9a-fA-F-]{36}$" },
        quote: { type: "string", minLength: 1, maxLength: 500 },
      },
    },
    regime: { type: "string", enum: REGIME_VALUES as unknown as string[] },
    extracted_by: { type: "string", minLength: 1, maxLength: 64 },
    extractor_version: { type: "string", minLength: 1, maxLength: 32 },
  },
} as const;

export const EXTRACTOR_VERSION = "m7-1.0.0";
