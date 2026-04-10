// ═══════════════════════════════════════════════
// M6 — Ontological Verifier
//
// Single write-gate for every blackboard (shared_context) write.
// Pure, synchronous, zero I/O. Callers decide what to do on rejection.
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
// Zero dependencies on React, Supabase, or any SDK.
// ═══════════════════════════════════════════════

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
