// Edge-runtime mirror of src/engine/optimization/graosOntology.ts.
//
// Why duplicate: Supabase edge functions run in Deno with a separate
// module graph; importing from src/ isn't viable. Keeping the
// canonical lists here next to validate.ts/scrub.ts is the same
// approach the repo already takes for other shared types.
//
// MUST stay in sync with src/engine/optimization/graosOntology.ts.
// A CI check (tests/sync-graos-ontology.test.ts) asserts equality.

export const ENTITY_TYPES = [
  "business", "product", "audience", "channel", "offer",
  "pain", "objection", "hook", "metric", "competitor", "persona",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export const PREDICATES = [
  "has_product", "targets_audience", "operates_in_market", "competes_with",
  "converted_on", "failed_with", "improved_metric",
  "exhibits_archetype", "resists_objection", "prefers_tone", "experiences_pain",
  "plans_to", "blocked_by",
  "similar_businesses_succeed_with",
] as const;

export type Predicate = (typeof PREDICATES)[number];

export const REGIME_VALUES = ["stable", "transitional", "crisis"] as const;
export type Regime = (typeof REGIME_VALUES)[number];

export const EVIDENCE_TABLES = [
  "shared_context", "saved_plans", "differentiation_results",
  "user_form_data", "ai_coach_message", "meta_insights", "import",
] as const;

export const EXTRACTOR_VERSION = "m7-1.0.0";

// Deterministic canonicalization. MUST match canonicalize() in src.
export function canonicalize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9֐-׿-]/g, "")
    .slice(0, 200);
}

// ───────────────────────────────────────────────
// Predicate semantic contract — mirror of PREDICATE_CONTRACT in src.
// ───────────────────────────────────────────────

interface PredicateContract {
  subjects: readonly EntityType[];
  objectKind: "entity" | "literal" | "either";
  objectTypes?: readonly EntityType[];
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
// Runtime fact shape (no zod in edge runtime — hand validation).
// ───────────────────────────────────────────────

export interface ExtractedFact {
  subject: { type: EntityType; canonical: string };
  predicate: Predicate;
  object:
    | { type: EntityType; canonical: string }
    | { literal: string | number | boolean };
  confidence: number;
  evidence: {
    source_table: typeof EVIDENCE_TABLES[number];
    source_id: string;
    quote: string;
  };
  regime?: Regime;
  dapl_snapshot?: Record<string, unknown>;
  extracted_by: string;
  extractor_version: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FactValidation {
  ok: boolean;
  reason?: string;
}

/** Validate an untrusted JSON object as ExtractedFact. */
export function validateFact(raw: unknown, allowCrossTenant = false): FactValidation {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "not an object" };
  const f = raw as Partial<ExtractedFact>;

  if (!f.subject || typeof f.subject !== "object") return { ok: false, reason: "missing subject" };
  if (!ENTITY_TYPES.includes(f.subject.type as EntityType)) return { ok: false, reason: "bad subject.type" };
  if (typeof f.subject.canonical !== "string" || f.subject.canonical.length === 0 || f.subject.canonical.length > 200) {
    return { ok: false, reason: "bad subject.canonical" };
  }
  if (canonicalize(f.subject.canonical) !== f.subject.canonical) {
    return { ok: false, reason: "subject.canonical not pre-canonicalized" };
  }

  if (!PREDICATES.includes(f.predicate as Predicate)) return { ok: false, reason: "bad predicate" };
  const contract = PREDICATE_CONTRACT[f.predicate as Predicate];
  if (!contract.subjects.includes(f.subject.type as EntityType)) {
    return { ok: false, reason: "predicate does not accept subject type" };
  }
  if (contract.crossTenant && !allowCrossTenant) {
    return { ok: false, reason: "cross-tenant predicate requires explicit allow" };
  }

  if (!f.object || typeof f.object !== "object") return { ok: false, reason: "missing object" };
  const objIsEntity = "type" in (f.object as object);
  if (contract.objectKind === "entity" && !objIsEntity) return { ok: false, reason: "object must be entity" };
  if (contract.objectKind === "literal" && objIsEntity) return { ok: false, reason: "object must be literal" };
  if (objIsEntity) {
    const o = f.object as { type: EntityType; canonical: string };
    if (!ENTITY_TYPES.includes(o.type)) return { ok: false, reason: "bad object.type" };
    if (contract.objectTypes && !contract.objectTypes.includes(o.type)) {
      return { ok: false, reason: "object type not allowed for predicate" };
    }
    if (canonicalize(o.canonical) !== o.canonical) return { ok: false, reason: "object.canonical not pre-canonicalized" };
  } else {
    const lit = (f.object as { literal: unknown }).literal;
    if (lit == null) return { ok: false, reason: "empty literal" };
    if (typeof lit === "string" && lit.trim().length === 0) return { ok: false, reason: "empty literal" };
    if (typeof lit === "string" && lit.length > 500) return { ok: false, reason: "literal too long" };
  }

  if (typeof f.confidence !== "number" || f.confidence < 0 || f.confidence > 1) {
    return { ok: false, reason: "confidence out of range" };
  }

  if (!f.evidence || typeof f.evidence !== "object") return { ok: false, reason: "missing evidence" };
  if (!EVIDENCE_TABLES.includes(f.evidence.source_table as typeof EVIDENCE_TABLES[number])) {
    return { ok: false, reason: "bad evidence.source_table" };
  }
  if (typeof f.evidence.source_id !== "string" || !UUID_RE.test(f.evidence.source_id)) {
    return { ok: false, reason: "evidence.source_id must be UUID" };
  }
  if (typeof f.evidence.quote !== "string" || f.evidence.quote.length === 0 || f.evidence.quote.length > 500) {
    return { ok: false, reason: "bad evidence.quote" };
  }

  if (f.regime && !REGIME_VALUES.includes(f.regime)) return { ok: false, reason: "bad regime" };

  if (typeof f.extracted_by !== "string" || f.extracted_by.length === 0) return { ok: false, reason: "missing extracted_by" };
  if (typeof f.extractor_version !== "string" || f.extractor_version.length === 0) return { ok: false, reason: "missing extractor_version" };

  // Regime-aware confidence floor (matches verifyFact in src).
  const floor = f.regime === "crisis" ? 0.75 : f.regime === "transitional" ? 0.6 : 0.5;
  if (f.confidence < floor) {
    return { ok: false, reason: `confidence below floor ${floor} for regime ${f.regime ?? "stable"}` };
  }

  return { ok: true };
}

// ───────────────────────────────────────────────
// Claude tool-use JSON schema (mirror of EXTRACTED_FACT_JSON_SCHEMA).
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
        source_table: { type: "string", enum: EVIDENCE_TABLES as unknown as string[] },
        source_id: { type: "string", pattern: "^[0-9a-fA-F-]{36}$" },
        quote: { type: "string", minLength: 1, maxLength: 500 },
      },
    },
    regime: { type: "string", enum: REGIME_VALUES as unknown as string[] },
    extracted_by: { type: "string", minLength: 1, maxLength: 64 },
    extractor_version: { type: "string", minLength: 1, maxLength: 32 },
  },
} as const;
