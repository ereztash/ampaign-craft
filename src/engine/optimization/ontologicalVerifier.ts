// ═══════════════════════════════════════════════
// M6 — Ontological Verifier
//
// Single write-gate for every blackboard (shared_context) write AND for
// every knowledge_facts insert (M7 overlay). Pure, synchronous, zero
// I/O. Callers decide what to do on rejection.
//
// The verifier is the only place that enforces the write contract:
//   - namespace prefix
//   - concept_key shape
//   - stage enum
//   - payload shape + JSON-serializability
//   - required created_at
//   - optional schema validator
//   - coherence vs previous write on the same concept_key
//
// verifyFact (added for M7) applies:
//   - Zod schema (extractedFactSchema)
//   - Cross-field contract (checkContract from graosOntology)
//   - Anti-injection check: canonical after sanitization must equal the
//     canonical before sanitization, else the input carried disallowed
//     content (OWASP LLM01 indirect injection).
//   - Regime-aware confidence floor: crisis demands 0.75, transitional
//     0.6, stable 0.5.
//
// Zero dependencies on React, Supabase, or any SDK. Zod is already in
// the client bundle so importing it costs nothing extra.
// ═══════════════════════════════════════════════

import {
  canonicalize,
  checkContract,
  extractedFactSchema,
  type ExtractedFact,
  type Regime,
} from "./graosOntology";

export type VerificationResult =
  | { ok: true }
  | { ok: false; reason: string; field?: string };

export interface BlackboardWrite {
  concept_key: string;
  stage: "discover" | "process" | "deploy";
  payload: Record<string, unknown>;
  schema_id?: string;
}

// ───────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────

const ALLOWED_PREFIXES = ["USER-", "BUSINESS-", "CAMPAIGN-", "SYSTEM-", "TASK-"] as const;
const ALLOWED_STAGES: ReadonlySet<string> = new Set(["discover", "process", "deploy"]);
const MAX_CONCEPT_KEY_LENGTH = 200;
// Characters allowed in the suffix (post-prefix) portion of concept_key.
const CONCEPT_KEY_SUFFIX_RE = /^[A-Za-z0-9_-]+$/;

// ───────────────────────────────────────────────
// Schema registry (module-scoped, idempotent)
// ───────────────────────────────────────────────

type SchemaValidator = (payload: unknown) => boolean;
const schemaRegistry: Map<string, SchemaValidator> = new Map();

/**
 * Register a schema validator for a given schema_id.
 * Calling twice with the same id replaces the prior entry (useful in tests).
 */
export function registerSchema(schema_id: string, validator: SchemaValidator): void {
  schemaRegistry.set(schema_id, validator);
}

/**
 * Testing-only: clear all registered schemas. Not exported through index.
 */
export function __resetSchemaRegistry(): void {
  schemaRegistry.clear();
}

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== null
  );
}

function findPrefix(conceptKey: string): string | null {
  for (const prefix of ALLOWED_PREFIXES) {
    if (conceptKey.startsWith(prefix)) return prefix;
  }
  return null;
}

function isJsonSerializable(payload: unknown): boolean {
  try {
    JSON.stringify(payload);
    return true;
  } catch {
    return false;
  }
}

function fail(reason: string, field?: string): VerificationResult {
  return field ? { ok: false, reason, field } : { ok: false, reason };
}

// ───────────────────────────────────────────────
// verifyWrite — main entry
// ───────────────────────────────────────────────

/**
 * Validate a blackboard write. Returns `{ ok: true }` on success,
 * or `{ ok: false, reason, field? }` on the first failure encountered.
 * Fail-fast order: namespace → key shape → stage → payload type →
 * JSON-serializable → created_at → schema → coherence.
 */
export function verifyWrite(
  write: BlackboardWrite,
  existing?: BlackboardWrite,
): VerificationResult {
  // 1. namespace prefix
  if (typeof write.concept_key !== "string" || write.concept_key.length === 0) {
    return fail("invalid namespace prefix", "concept_key");
  }
  const prefix = findPrefix(write.concept_key);
  if (!prefix) {
    return fail("invalid namespace prefix", "concept_key");
  }

  // 2. concept_key shape
  if (write.concept_key.length > MAX_CONCEPT_KEY_LENGTH) {
    return fail("malformed concept_key", "concept_key");
  }
  const suffix = write.concept_key.slice(prefix.length);
  if (suffix.length === 0 || !CONCEPT_KEY_SUFFIX_RE.test(suffix)) {
    return fail("malformed concept_key", "concept_key");
  }

  // 3. stage enum
  if (!ALLOWED_STAGES.has(write.stage)) {
    return fail("invalid stage", "stage");
  }

  // 4. payload must be a plain object
  if (!isPlainObject(write.payload)) {
    return fail("payload must be an object", "payload");
  }

  // 5. payload JSON-serializable
  if (!isJsonSerializable(write.payload)) {
    return fail("payload not JSON-serializable", "payload");
  }

  // 6. required created_at
  const createdAt = write.payload.created_at;
  if (typeof createdAt !== "number" || !Number.isFinite(createdAt) || createdAt <= 0) {
    return fail("missing or invalid created_at", "payload.created_at");
  }

  // 7. schema validator (optional)
  if (write.schema_id !== undefined) {
    const validator = schemaRegistry.get(write.schema_id);
    if (!validator) {
      return fail("unknown schema_id", "schema_id");
    }
    let validatorOk = false;
    try {
      validatorOk = validator(write.payload);
    } catch {
      validatorOk = false;
    }
    if (!validatorOk) {
      return fail("payload does not match schema", "payload");
    }
  }

  // 8. coherence vs existing
  if (existing) {
    if (existing.concept_key !== write.concept_key) {
      return fail("concept_key mismatch with existing", "concept_key");
    }
    const existingCreatedAt = existing.payload.created_at;
    if (typeof existingCreatedAt === "number" && Number.isFinite(existingCreatedAt)) {
      if (createdAt < existingCreatedAt) {
        return fail("created_at regression", "payload.created_at");
      }
    }
    // Optional immutability contract: if the previous write declared an
    // `immutable` array of field names, those must not change on update.
    const immutableFields = existing.payload.immutable;
    if (Array.isArray(immutableFields)) {
      for (const fieldName of immutableFields) {
        if (typeof fieldName !== "string") continue;
        const prevVal = existing.payload[fieldName];
        const nextVal = write.payload[fieldName];
        if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
          return fail(
            `immutable field changed: ${fieldName}`,
            `payload.${fieldName}`,
          );
        }
      }
    }
  }

  return { ok: true };
}

// ───────────────────────────────────────────────
// verifyFact — M7 knowledge-extraction write gate
// ───────────────────────────────────────────────

/**
 * Confidence floor per behavioral regime. A fact extracted while the
 * user's metrics are in "crisis" has higher priors for being wrong
 * (noisier input, stressed behavior) so we demand stronger evidence
 * before letting it land. "stable" keeps the normal 0.5 floor.
 */
const REGIME_CONFIDENCE_FLOOR: Record<Regime, number> = {
  stable: 0.5,
  transitional: 0.6,
  crisis: 0.75,
};

export interface VerifyFactOptions {
  /** Pass true only from the DP-aggregation job. Default false rejects
   *  predicates flagged as cross-tenant by the ontology. */
  allowCrossTenant?: boolean;
}

/**
 * Validates an extracted fact before it is written to knowledge_facts.
 *
 * Fail-fast order (cheapest → most expensive):
 *   1. Zod schema (shape, ranges, enums)
 *   2. Cross-field semantic contract (predicate accepts subject type,
 *      object kind matches, etc.)
 *   3. Anti-injection canonical equality (defence in depth — the
 *      extractor is supposed to have canonicalized already, but if the
 *      canonical form changes again after canonicalize() it means the
 *      input still carries disallowed chars / injection payload)
 *   4. Regime-aware confidence floor
 */
export function verifyFact(
  candidate: unknown,
  options: VerifyFactOptions = {},
): VerificationResult {
  const parsed = extractedFactSchema.safeParse(candidate);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return fail(
      `fact schema validation failed: ${firstIssue?.message ?? "invalid"}`,
      firstIssue?.path?.join(".") ?? undefined,
    );
  }
  const fact: ExtractedFact = parsed.data;

  const violation = checkContract(
    fact.subject,
    fact.predicate,
    fact.object,
    options.allowCrossTenant === true,
  );
  if (violation) {
    return fail(violation.message, "contract");
  }

  // Anti-injection canonical equality. After canonicalize() the string
  // should be a no-op (the extractor must have canonicalized already).
  // If it changes, the extractor leaked raw content — treat as attack.
  if (canonicalize(fact.subject.canonical) !== fact.subject.canonical) {
    return fail("subject.canonical not pre-canonicalized", "subject.canonical");
  }
  if ("type" in fact.object) {
    if (canonicalize(fact.object.canonical) !== fact.object.canonical) {
      return fail("object.canonical not pre-canonicalized", "object.canonical");
    }
  }

  // Regime-aware confidence floor.
  const floor = fact.regime ? REGIME_CONFIDENCE_FLOOR[fact.regime] : 0.5;
  if (fact.confidence < floor) {
    return fail(
      `confidence ${fact.confidence.toFixed(2)} below floor ${floor} for regime '${fact.regime ?? "stable"}'`,
      "confidence",
    );
  }

  return { ok: true };
}

