import { describe, it, expect, beforeEach } from "vitest";
import {
  verifyWrite,
  registerSchema,
  __resetSchemaRegistry,
  type BlackboardWrite,
} from "../ontologicalVerifier";

// ───────────────────────────────────────────────
// Fixtures
// ───────────────────────────────────────────────

const validBase = (): BlackboardWrite => ({
  concept_key: "USER-profile-vector-abc123",
  stage: "discover",
  payload: {
    created_at: 1_700_000_000_000,
    risk_tolerance: 0.5,
  },
});

describe("ontologicalVerifier", () => {
  beforeEach(() => {
    __resetSchemaRegistry();
  });

  // ── GREEN cases ──

  it("accepts a fully valid write", () => {
    const result = verifyWrite(validBase());
    expect(result).toEqual({ ok: true });
  });

  it("accepts a valid write whose schema_id is registered and passes", () => {
    registerSchema("user-profile-v1", (payload) => {
      if (typeof payload !== "object" || payload === null) return false;
      return "risk_tolerance" in (payload as Record<string, unknown>);
    });
    const write: BlackboardWrite = {
      ...validBase(),
      schema_id: "user-profile-v1",
    };
    expect(verifyWrite(write)).toEqual({ ok: true });
  });

  it("accepts an update with a newer created_at than existing", () => {
    const existing = validBase();
    const next: BlackboardWrite = {
      ...validBase(),
      payload: { ...validBase().payload, created_at: 1_700_000_100_000 },
    };
    expect(verifyWrite(next, existing)).toEqual({ ok: true });
  });

  it("accepts an update with identical created_at (idempotency, no regression)", () => {
    const existing = validBase();
    const next = validBase();
    expect(verifyWrite(next, existing)).toEqual({ ok: true });
  });

  // ── RED cases ──

  it("rejects concept_key with invalid namespace prefix", () => {
    const write: BlackboardWrite = {
      ...validBase(),
      concept_key: "foo-bar-123",
    };
    const result = verifyWrite(write);
    expect(result).toEqual({
      ok: false,
      reason: "invalid namespace prefix",
      field: "concept_key",
    });
  });

  it("rejects write with an invalid stage value", () => {
    const write = {
      ...validBase(),
      stage: "discoverx",
    } as unknown as BlackboardWrite;
    const result = verifyWrite(write);
    expect(result).toEqual({
      ok: false,
      reason: "invalid stage",
      field: "stage",
    });
  });

  it("rejects payload containing a circular reference", () => {
    const circular: Record<string, unknown> = {
      created_at: 1_700_000_000_000,
    };
    circular.self = circular;
    const write: BlackboardWrite = {
      ...validBase(),
      payload: circular,
    };
    const result = verifyWrite(write);
    expect(result).toEqual({
      ok: false,
      reason: "payload not JSON-serializable",
      field: "payload",
    });
  });

  it("rejects an unknown schema_id", () => {
    const write: BlackboardWrite = {
      ...validBase(),
      schema_id: "not-registered",
    };
    const result = verifyWrite(write);
    expect(result).toEqual({
      ok: false,
      reason: "unknown schema_id",
      field: "schema_id",
    });
  });

  it("rejects an update whose created_at is older than existing (regression)", () => {
    const existing: BlackboardWrite = {
      ...validBase(),
      payload: { ...validBase().payload, created_at: 1_700_000_100_000 },
    };
    const next = validBase(); // older created_at
    const result = verifyWrite(next, existing);
    expect(result).toEqual({
      ok: false,
      reason: "created_at regression",
      field: "payload.created_at",
    });
  });

  it("rejects payload that is null", () => {
    const write = {
      ...validBase(),
      payload: null,
    } as unknown as BlackboardWrite;
    const result = verifyWrite(write);
    expect(result).toEqual({
      ok: false,
      reason: "payload must be an object",
      field: "payload",
    });
  });
});
