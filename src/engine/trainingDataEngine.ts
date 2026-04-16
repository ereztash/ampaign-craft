// ═══════════════════════════════════════════════
// Training Data Engine — MOAT Flywheel
// Captures every behavioral-science engine I/O pair for
// future LLM fine-tuning. Fire-and-forget, offline-buffered.
// ═══════════════════════════════════════════════

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export type EngineCategory =
  // Core funnel & strategy
  | "funnel"
  | "copy"
  | "disc_profile"
  | "hormozi_value"
  | "brand_vector"
  | "copy_qa"
  | "stylome"
  | "neuro_storytelling"
  | "differentiation"
  | "ab_test"
  // Analytics & prediction
  | "roi_attribution"
  | "predictive"
  | "campaign_analytics"
  | "knowledge_graph"
  | "emotional_performance"
  | "cross_domain_benchmark"
  | "predictive_content_score"
  | "behavioral_cohort"
  // Content & optimization
  | "hebrew_copy_optimizer"
  | "english_copy_optimizer"
  | "perplexity_burstiness"
  | "prompt_optimizer"
  // Growth & infrastructure
  | "export"
  | "visual_export"
  | "webhook";

export type FeedbackRating = "positive" | "negative";

export interface TrainingPair {
  id: string;
  engine_id: EngineCategory;
  engine_version: string;
  input: unknown;
  output: unknown;
  user_id: string | null;
  timestamp: string;
  quality: FeedbackRating | null;
  feedback_text: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type AARRRStage = "acquisition" | "activation" | "retention" | "revenue" | "referral";

export interface CaptureOptions {
  engineVersion?: string;
  metadata?: Record<string, unknown>;
  aarrr_stage?: AARRRStage;
}

export interface TrainingFilters {
  engineId?: EngineCategory;
  quality?: FeedbackRating;
  userId?: string;
  limit?: number;
  since?: string; // ISO timestamp
}

export interface TrainingStats {
  total: number;
  positive: number;
  negative: number;
  unrated: number;
  byEngine: Record<string, number>;
  latestCapture: string | null;
}

// ───────────────────────────────────────────────
// Offline buffer (localStorage) — survives auth gaps
// ───────────────────────────────────────────────

const BUFFER_KEY = "funnelforge-training-buffer";
const BUFFER_MAX = 200;

interface BufferedPair {
  engine_id: EngineCategory;
  engine_version: string;
  input: unknown;
  output: unknown;
  metadata: Record<string, unknown>;
  timestamp: string;
}

function readBuffer(): BufferedPair[] {
  try {
    const raw = localStorage.getItem(BUFFER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBuffer(pairs: BufferedPair[]): void {
  try {
    const trimmed = pairs.slice(-BUFFER_MAX);
    localStorage.setItem(BUFFER_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage full or unavailable — skip */
  }
}

function appendToBuffer(pair: BufferedPair): void {
  const buf = readBuffer();
  buf.push(pair);
  writeBuffer(buf);
}

// ───────────────────────────────────────────────
// Core capture (fire-and-forget)
// ───────────────────────────────────────────────

/**
 * Capture an engine I/O pair. NEVER await in render paths.
 * Falls back to localStorage buffer if offline/unauthenticated.
 */
export async function captureTrainingPair(
  engineId: EngineCategory,
  input: unknown,
  output: unknown,
  userId?: string | null,
  options: CaptureOptions = {}
): Promise<string | null> {
  // Gate behind training data consent (GDPR)
  try {
    const consentRaw = localStorage.getItem("funnelforge-consent");
    if (consentRaw) {
      const consent = JSON.parse(consentRaw);
      if (consent.trainingDataOptIn === false) return null;
    }
  } catch { /* continue if consent not found — backwards compat */ }

  const engineVersion = options.engineVersion ?? "1.0.0";
  const metadata = options.metadata ?? {};
  const aarrr_stage = options.aarrr_stage ?? null;
  const timestamp = new Date().toISOString();

  // No authenticated user → buffer for later flush
  if (!userId) {
    appendToBuffer({
      engine_id: engineId,
      engine_version: engineVersion,
      input,
      output,
      metadata,
      timestamp,
    });
    return null;
  }

  try {
    const { data, error } = await (supabase as unknown as SupabaseClient)
      .from("training_pairs")
      .insert({
        engine_id: engineId,
        engine_version: engineVersion,
        input,
        output,
        user_id: userId,
        timestamp,
        metadata,
        ...(aarrr_stage ? { aarrr_stage } : {}),
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[trainingData] capture failed, buffering:", error.message);
      appendToBuffer({
        engine_id: engineId,
        engine_version: engineVersion,
        input,
        output,
        metadata,
        timestamp,
      });
      return null;
    }

    return (data?.id as string) ?? null;
  } catch (err) {
    console.warn("[trainingData] capture threw, buffering:", err);
    appendToBuffer({
      engine_id: engineId,
      engine_version: engineVersion,
      input,
      output,
      metadata,
      timestamp,
    });
    return null;
  }
}

/**
 * Flush buffered pairs to Supabase. Call on auth state change.
 * Returns number of pairs successfully flushed.
 */
export async function flushTrainingBuffer(userId: string): Promise<number> {
  const buf = readBuffer();
  if (buf.length === 0) return 0;

  try {
    const rows = buf.map((p) => ({
      engine_id: p.engine_id,
      engine_version: p.engine_version,
      input: p.input,
      output: p.output,
      user_id: userId,
      timestamp: p.timestamp,
      metadata: p.metadata,
    }));

    const { error } = await (supabase as unknown as SupabaseClient).from("training_pairs").insert(rows);

    if (error) {
      console.warn("[trainingData] flush failed:", error.message);
      return 0;
    }

    writeBuffer([]);
    return rows.length;
  } catch (err) {
    console.warn("[trainingData] flush threw:", err);
    return 0;
  }
}

// ───────────────────────────────────────────────
// Feedback updates
// ───────────────────────────────────────────────

/**
 * Apply positive/negative feedback to an existing training pair.
 */
export async function updateFeedback(
  pairId: string,
  quality: FeedbackRating,
  feedbackText?: string
): Promise<boolean> {
  try {
    const { error } = await (supabase as unknown as SupabaseClient)
      .from("training_pairs")
      .update({
        quality,
        feedback_text: feedbackText ?? null,
      })
      .eq("id", pairId);

    if (error) {
      console.warn("[trainingData] feedback update failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[trainingData] feedback update threw:", err);
    return false;
  }
}

// ───────────────────────────────────────────────
// Queries
// ───────────────────────────────────────────────

export async function getTrainingPairs(
  filters: TrainingFilters = {}
): Promise<TrainingPair[]> {
  try {
    let query = (supabase as unknown as SupabaseClient)
      .from("training_pairs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(filters.limit ?? 100);

    if (filters.engineId) query = query.eq("engine_id", filters.engineId);
    if (filters.quality) query = query.eq("quality", filters.quality);
    if (filters.userId) query = query.eq("user_id", filters.userId);
    if (filters.since) query = query.gte("timestamp", filters.since);

    const { data, error } = await query;
    if (error) {
      console.warn("[trainingData] query failed:", error.message);
      return [];
    }
    return (data as TrainingPair[]) ?? [];
  } catch (err) {
    console.warn("[trainingData] query threw:", err);
    return [];
  }
}

export async function getTrainingStats(userId?: string): Promise<TrainingStats> {
  const empty: TrainingStats = {
    total: 0,
    positive: 0,
    negative: 0,
    unrated: 0,
    byEngine: {},
    latestCapture: null,
  };

  try {
    let query = (supabase as unknown as SupabaseClient)
      .from("training_pairs")
      .select("engine_id, quality, timestamp");

    if (userId) query = query.eq("user_id", userId);

    const { data, error } = await query;
    if (error || !data) return empty;

    const rows = data as Array<{ engine_id: string; quality: string | null; timestamp: string }>;
    const stats: TrainingStats = { ...empty, byEngine: {} };
    stats.total = rows.length;

    for (const row of rows) {
      if (row.quality === "positive") stats.positive++;
      else if (row.quality === "negative") stats.negative++;
      else stats.unrated++;

      stats.byEngine[row.engine_id] = (stats.byEngine[row.engine_id] ?? 0) + 1;

      if (!stats.latestCapture || row.timestamp > stats.latestCapture) {
        stats.latestCapture = row.timestamp;
      }
    }

    return stats;
  } catch {
    return empty;
  }
}

/**
 * How many pairs are currently buffered offline (not yet flushed).
 */
export function getBufferedCount(): number {
  return readBuffer().length;
}
