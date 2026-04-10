// ═══════════════════════════════════════════════
// M5 — DAPL User Profile (Dynamic Adaptive Preference Learning)
//
// Builds and updates an 8-dimensional user profile vector from
// individual form-field events. Runs alongside funnelEngine — reads
// its output if needed, but never mutates it.
//
// Pure, deterministic, idempotent. Zero I/O.
//
// Idempotency guarantee:
//   updateProfile(updateProfile(state, E), E) === updateProfile(state, E)
// This is achieved by making each event's effect a FIELD REPLACEMENT
// whose target value depends only on the event (not on prior state).
//
// Persistence contract (handled by caller, NOT this module):
//   concept_key = `USER-profile-vector-${user_id}`
//   write goes through ontologicalVerifier.verifyWrite BEFORE any
//   Supabase call. This module stays pure.
//
// 12 principles mapping: placeholder ids (P01..P12) keyed to the
// profile dimensions. When the real Graos corpus principle catalog
// is supplied, update PRINCIPLES below in place — the public API
// does not change.
// ═══════════════════════════════════════════════

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export interface UserProfileVector {
  risk_tolerance: number;      // 0..1
  speed_preference: number;    // 0..1 (how fast the user fills the form)
  detail_orientation: number;  // 0..1 (optional fields filled)
  strategic_depth: number;     // 0..1 (complex, multi-step choices)
  channel_confidence: number;  // 0..1 (certainty in channel choice)
  brand_maturity: number;      // 0..1
  data_literacy: number;       // 0..1
  updated_at: number;          // epoch ms of last event applied
}

export interface ProfileEvent {
  field: string;
  value: unknown;
  ts: number;
}

// ───────────────────────────────────────────────
// Dimensions enum (for readability in rules)
// ───────────────────────────────────────────────

type Dimension = Exclude<keyof UserProfileVector, "updated_at">;

const ALL_DIMENSIONS: readonly Dimension[] = [
  "risk_tolerance",
  "speed_preference",
  "detail_orientation",
  "strategic_depth",
  "channel_confidence",
  "brand_maturity",
  "data_literacy",
] as const;

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function asArrayLength(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

// ───────────────────────────────────────────────
// Field rules: (field, value) → { dimension, score }
// Each rule is a pure function of the event. Same event = same output.
// ───────────────────────────────────────────────

interface FieldRule {
  dimension: Dimension;
  score: (value: unknown) => number;
}

const FIELD_RULES: Record<string, FieldRule> = {
  // Business-level
  businessField: {
    dimension: "brand_maturity",
    score: (v) => {
      const s = asString(v).toLowerCase();
      if (s.includes("enterprise") || s.includes("corporate")) return 0.8;
      if (s.includes("startup") || s.includes("new")) return 0.3;
      return 0.5;
    },
  },
  audienceType: {
    dimension: "channel_confidence",
    score: (v) => {
      const s = asString(v).toLowerCase();
      if (s === "b2b") return 0.6;
      if (s === "b2c") return 0.5;
      return 0.5;
    },
  },
  budgetRange: {
    dimension: "risk_tolerance",
    score: (v) => {
      const s = asString(v).toLowerCase();
      if (s === "low") return 0.3;
      if (s === "medium") return 0.5;
      if (s === "high") return 0.8;
      return 0.5;
    },
  },
  salesModel: {
    dimension: "strategic_depth",
    score: (v) => {
      const s = asString(v).toLowerCase();
      if (s === "subscription" || s === "retainer") return 0.7;
      if (s === "onetime") return 0.4;
      return 0.5;
    },
  },
  experienceLevel: {
    dimension: "data_literacy",
    score: (v) => {
      const s = asString(v).toLowerCase();
      if (s === "beginner") return 0.3;
      if (s === "intermediate") return 0.5;
      if (s === "expert" || s === "advanced") return 0.8;
      return 0.5;
    },
  },
  productDescription: {
    dimension: "detail_orientation",
    score: (v) => {
      const len = asString(v).length;
      if (len > 200) return 0.8;
      if (len > 100) return 0.6;
      if (len > 50) return 0.4;
      return 0.2;
    },
  },
  averagePrice: {
    dimension: "strategic_depth",
    score: (v) => {
      const n = asNumber(v);
      if (n === null) return 0.5;
      if (n >= 5000) return 0.85;
      if (n >= 1000) return 0.7;
      if (n >= 100) return 0.5;
      return 0.3;
    },
  },
  existingChannels: {
    dimension: "channel_confidence",
    score: (v) => {
      const len = asArrayLength(v);
      if (len >= 3) return 0.8;
      if (len === 2) return 0.6;
      if (len === 1) return 0.4;
      return 0.2;
    },
  },
  // Meta events emitted by the form controller
  form_fill_speed_ms: {
    dimension: "speed_preference",
    score: (v) => {
      const n = asNumber(v);
      if (n === null) return 0.5;
      if (n < 1000) return 0.9;
      if (n < 3000) return 0.7;
      if (n < 10000) return 0.5;
      if (n < 30000) return 0.3;
      return 0.1;
    },
  },
  optional_fields_filled: {
    dimension: "detail_orientation",
    score: (v) => {
      const n = asNumber(v);
      if (n === null) return 0.5;
      if (n >= 5) return 0.9;
      if (n >= 3) return 0.7;
      if (n >= 1) return 0.5;
      return 0.2;
    },
  },
};

// ───────────────────────────────────────────────
// Principles catalog (12 — placeholder ids)
// ───────────────────────────────────────────────

interface Principle {
  id: string;
  dimension: Dimension;
  direction: "high" | "low";
}

const PRINCIPLES: readonly Principle[] = [
  { id: "P01_RISK_CAUTION",        dimension: "risk_tolerance",     direction: "low"  },
  { id: "P02_RISK_APPETITE",       dimension: "risk_tolerance",     direction: "high" },
  { id: "P03_DELIBERATE_PACE",     dimension: "speed_preference",   direction: "low"  },
  { id: "P04_FAST_ITERATION",      dimension: "speed_preference",   direction: "high" },
  { id: "P05_DETAIL_EXECUTION",    dimension: "detail_orientation", direction: "high" },
  { id: "P06_RAPID_PROTOTYPING",   dimension: "detail_orientation", direction: "low"  },
  { id: "P07_STRATEGIC_DEPTH",     dimension: "strategic_depth",    direction: "high" },
  { id: "P08_TACTICAL_FOCUS",      dimension: "strategic_depth",    direction: "low"  },
  { id: "P09_CHANNEL_MASTERY",     dimension: "channel_confidence", direction: "high" },
  { id: "P10_BRAND_FOUNDATIONS",   dimension: "brand_maturity",     direction: "high" },
  { id: "P11_DATA_LITERACY",       dimension: "data_literacy",      direction: "high" },
  { id: "P12_DATA_LEARNING",       dimension: "data_literacy",      direction: "low"  },
] as const;

function relevance(profile: UserProfileVector, principle: Principle): number {
  const score = profile[principle.dimension];
  return principle.direction === "high" ? score : 1 - score;
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

/**
 * Fresh profile with all 7 dimensions at the neutral midpoint.
 * `updated_at` is 0 to indicate "never updated".
 */
export function initProfile(): UserProfileVector {
  const base: Partial<UserProfileVector> = { updated_at: 0 };
  for (const dim of ALL_DIMENSIONS) {
    base[dim] = 0.5;
  }
  return base as UserProfileVector;
}

/**
 * Apply a single field event. Idempotent by construction:
 * the target dimension is set to a value that depends only on the
 * event, not on prior state. Unknown fields only bump `updated_at`.
 */
export function updateProfile(
  current: UserProfileVector,
  event: ProfileEvent,
): UserProfileVector {
  const rule = FIELD_RULES[event.field];
  const next: UserProfileVector = {
    ...current,
    updated_at: Number.isFinite(event.ts) ? event.ts : current.updated_at,
  };
  if (!rule) {
    return next;
  }
  next[rule.dimension] = clamp01(rule.score(event.value));
  return next;
}

/**
 * Return the top-N principle ids ranked by relevance to the current
 * profile. Relevance is the underlying dimension score for
 * `direction: 'high'` principles, and (1 - score) for `direction: 'low'`.
 * Ties break in the catalog's declared order (stable sort).
 * Returns `[]` when `n <= 0`; caps at 12 when `n > 12`.
 */
export function topNPrinciples(profile: UserProfileVector, n: number): string[] {
  if (!Number.isFinite(n) || n <= 0) return [];
  const cap = Math.min(Math.floor(n), PRINCIPLES.length);
  // Attach index for stable tie-breaking.
  const ranked = PRINCIPLES.map((p, idx) => ({
    id: p.id,
    rel: relevance(profile, p),
    idx,
  }));
  ranked.sort((a, b) => {
    if (b.rel !== a.rel) return b.rel - a.rel;
    return a.idx - b.idx;
  });
  return ranked.slice(0, cap).map((r) => r.id);
}

/**
 * Build the BlackboardWrite payload for persistence. The caller is
 * responsible for passing the result to ontologicalVerifier.verifyWrite
 * and then to the Supabase client. This module performs no I/O.
 */
export function toBlackboardPayload(
  profile: UserProfileVector,
): Record<string, unknown> {
  return {
    ...profile,
    created_at: profile.updated_at > 0 ? profile.updated_at : Date.now(),
  };
}
