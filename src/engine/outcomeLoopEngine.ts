// ═══════════════════════════════════════════════
// Outcome Loop Engine — MOAT Flywheel Core
//
// Closes the action→outcome gap (Agent 1: 0% captured → solved).
// Implements:
//   1. Recommendation capture  — every insight/nudge shown is logged
//   2. Variant-pick signals     — Midjourney-style UX preference labels
//   3. Delayed outcome reports  — 7/30/90-day conversion deltas
//   4. Cross-cohort aggregation — anonymized archetype-level benchmarks
//
// All paths are fire-and-forget with localStorage offline buffer.
// Loop closure happens async when the user returns and reports outcomes.
// ═══════════════════════════════════════════════

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export type RecommendationSource =
  | "insight_feed"       // InsightFeed bottleneck / next-step cards
  | "nudge_banner"       // NudgeBanner BAE-driven nudge
  | "guidance_panel"     // KPI guidance items
  | "archetype_pipeline" // ArchetypePipelineGuide steps
  | "express_wizard";    // ExpressWizard onboarding

export type VariantPickChoice =
  | "primary"    // "Use this" — strong positive signal
  | "variation"  // "Try a variation" — soft positive, composition ok
  | "skip";      // "Not relevant" — negative / prompt-level rejection

export type OutcomeHorizon = 7 | 30 | 90; // days

export interface RecommendationEvent {
  id: string;                       // UUID
  user_id: string | null;
  archetype_id: string;             // effective archetype at time of show
  confidence_tier: string;
  source: RecommendationSource;
  action_id: string;                // route / step id
  action_label_en: string;
  context_snapshot: Record<string, unknown>; // lightweight: plan count, health score, etc.
  shown_at: string;                 // ISO
}

export interface VariantPickEvent {
  recommendation_id: string;
  user_id: string | null;
  choice: VariantPickChoice;
  position: number;                 // 0-indexed position in the list (recency signal)
  picked_at: string;
}

export interface OutcomeReport {
  recommendation_id: string;
  user_id: string | null;
  horizon_days: OutcomeHorizon;
  outcome_type: "navigated" | "plan_created" | "source_connected" | "revenue_reported" | "dismissed";
  delta_value: number | null;       // e.g. revenue delta, plan count delta
  reported_at: string;
}

// ── Anonymized cohort benchmark (cross-tenant, no PII) ──
export interface CohortBenchmark {
  archetype_id: string;
  action_id: string;
  sample_n: number;
  primary_pick_rate: number;        // 0–1
  variation_pick_rate: number;
  skip_rate: number;
  avg_conversion_7d: number | null;
  avg_conversion_30d: number | null;
  computed_at: string;
}

// ───────────────────────────────────────────────
// Offline buffer (localStorage)
// ───────────────────────────────────────────────

const BUFFER_KEY = "funnelforge-outcome-buffer";
const BUFFER_MAX = 500;

type BufferedEvent =
  | { type: "recommendation"; payload: RecommendationEvent }
  | { type: "variant_pick"; payload: VariantPickEvent }
  | { type: "outcome"; payload: OutcomeReport };

function readBuffer(): BufferedEvent[] {
  try {
    const raw = localStorage.getItem(BUFFER_KEY);
    return raw ? (JSON.parse(raw) as BufferedEvent[]) : [];
  } catch {
    return [];
  }
}

function writeBuffer(events: BufferedEvent[]): void {
  try {
    localStorage.setItem(BUFFER_KEY, JSON.stringify(events.slice(-BUFFER_MAX)));
  } catch { /* storage full — drop oldest */ }
}

function bufferEvent(event: BufferedEvent): void {
  const buf = readBuffer();
  buf.push(event);
  writeBuffer(buf);
}

// ───────────────────────────────────────────────
// Supabase persistence helpers
// ───────────────────────────────────────────────

async function getSupabase() {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    return supabase;
  } catch {
    return null;
  }
}

async function persistRecommendation(event: RecommendationEvent): Promise<boolean> {
  const db = await getSupabase();
  if (!db) return false;
  try {
    const { error } = await (db as unknown as {
      from: (t: string) => { insert: (r: unknown) => Promise<{ error: unknown }> }
    }).from("recommendation_events").insert(event);
    return !error;
  } catch {
    return false;
  }
}

async function persistVariantPick(event: VariantPickEvent): Promise<boolean> {
  const db = await getSupabase();
  if (!db) return false;
  try {
    const { error } = await (db as unknown as {
      from: (t: string) => { insert: (r: unknown) => Promise<{ error: unknown }> }
    }).from("variant_pick_events").insert(event);
    return !error;
  } catch {
    return false;
  }
}

async function persistOutcome(event: OutcomeReport): Promise<boolean> {
  const db = await getSupabase();
  if (!db) return false;
  try {
    const { error } = await (db as unknown as {
      from: (t: string) => { insert: (r: unknown) => Promise<{ error: unknown }> }
    }).from("outcome_reports").insert(event);
    return !error;
  } catch {
    return false;
  }
}

// ───────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────

/**
 * Log that a recommendation was shown to the user.
 * Call on mount / render of InsightCard, NudgeBanner, etc.
 * Returns the recommendation id for downstream pick/outcome correlation.
 *
 * Fire-and-forget — never await in render paths.
 */
export function captureRecommendationShown(
  params: Omit<RecommendationEvent, "id" | "shown_at">
): string {
  const id = crypto.randomUUID();
  const event: RecommendationEvent = { ...params, id, shown_at: new Date().toISOString() };

  void (async () => {
    const persisted = await persistRecommendation(event);
    if (!persisted) bufferEvent({ type: "recommendation", payload: event });
  })();

  return id;
}

/**
 * Record user's explicit variant pick (Midjourney transfer).
 * primary = "Use this" / variation = "Try different" / skip = "Not for me"
 */
export function captureVariantPick(
  recommendationId: string,
  choice: VariantPickChoice,
  position: number,
  userId: string | null
): void {
  const event: VariantPickEvent = {
    recommendation_id: recommendationId,
    user_id: userId,
    choice,
    position,
    picked_at: new Date().toISOString(),
  };

  void (async () => {
    const persisted = await persistVariantPick(event);
    if (!persisted) bufferEvent({ type: "variant_pick", payload: event });
  })();
}

/**
 * Report a delayed outcome against a prior recommendation.
 * Call when user navigates to the recommended route, creates a plan,
 * or reports revenue — up to 90 days after the recommendation was shown.
 */
export function captureOutcome(
  recommendationId: string,
  userId: string | null,
  outcomeType: OutcomeReport["outcome_type"],
  horizonDays: OutcomeHorizon = 7,
  deltaValue: number | null = null
): void {
  const event: OutcomeReport = {
    recommendation_id: recommendationId,
    user_id: userId,
    horizon_days: horizonDays,
    outcome_type: outcomeType,
    delta_value: deltaValue,
    reported_at: new Date().toISOString(),
  };

  void (async () => {
    const persisted = await persistOutcome(event);
    if (!persisted) bufferEvent({ type: "outcome", payload: event });
  })();
}

// ───────────────────────────────────────────────
// Buffer flush (call after auth)
// ───────────────────────────────────────────────

/**
 * Flush buffered events to Supabase once a user authenticates.
 * Mirror of trainingDataEngine.flushTrainingBuffer pattern.
 */
export async function flushOutcomeBuffer(userId: string): Promise<void> {
  const buf = readBuffer();
  if (buf.length === 0) return;

  const db = await getSupabase();
  if (!db) return;

  const remaining: BufferedEvent[] = [];
  for (const item of buf) {
    let ok = false;
    if (item.type === "recommendation") {
      ok = await persistRecommendation({ ...item.payload, user_id: userId });
    } else if (item.type === "variant_pick") {
      ok = await persistVariantPick({ ...item.payload, user_id: userId });
    } else if (item.type === "outcome") {
      ok = await persistOutcome({ ...item.payload, user_id: userId });
    }
    if (!ok) remaining.push(item);
  }

  writeBuffer(remaining);
}

// ───────────────────────────────────────────────
// Cross-cohort benchmark read (anonymized)
// ───────────────────────────────────────────────

/**
 * Fetch anonymized archetype-level pick-rate benchmarks.
 * Returns null if Supabase unavailable — callers should degrade gracefully.
 */
export async function getCohortBenchmarks(
  archetypeId: string,
  actionId?: string
): Promise<CohortBenchmark[]> {
  const db = await getSupabase();
  if (!db) return [];

  try {
    type BenchQuery = {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => Promise<{ data: CohortBenchmark[] | null; error: unknown }>;
            limit: (n: number) => Promise<{ data: CohortBenchmark[] | null; error: unknown }>;
          };
          limit: (n: number) => Promise<{ data: CohortBenchmark[] | null; error: unknown }>;
        };
      };
    };
    const typed = db as unknown as BenchQuery;
    let query = typed.from("cohort_benchmarks").select("*").eq("archetype_id", archetypeId);
    const result = actionId
      ? await query.eq("action_id", actionId).limit(20)
      : await query.limit(20);
    return (result as { data: CohortBenchmark[] | null; error: unknown }).data ?? [];
  } catch {
    return [];
  }
}

// ───────────────────────────────────────────────
// Lightweight context snapshot helper
// ───────────────────────────────────────────────

/**
 * Build a minimal context snapshot for attaching to recommendation events.
 * Keeps payload small — no PII, no large objects.
 */
export function buildContextSnapshot(params: {
  planCount: number;
  healthScore: number | null;
  connectedSources: number;
  archetypeConfidence: number;
  language: string;
}): Record<string, unknown> {
  return {
    plan_count: params.planCount,
    health_score: params.healthScore,
    connected_sources: params.connectedSources,
    archetype_confidence: Math.round(params.archetypeConfidence * 100),
    language: params.language,
  };
}
