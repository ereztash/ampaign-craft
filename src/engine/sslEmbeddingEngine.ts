// ═══════════════════════════════════════════════
// SSL Embedding Engine — Contrastive Projection Inference
//
// Loads the trained projection matrix W from ssl_projections (cached in
// localStorage, refreshed every 24 h) and applies it to raw content
// embeddings to compute plan-level similarity in the projected space.
//
// proj(v) = L2_norm(W @ v[:dim_in])
// similarity(a, b) = dot(proj(a), proj(b))  ∈ [-1, 1]
//
// Closed Loop 7:
//   getSimilarPlans() surfaces → user picks (captureSSLPick) → hard positive
//   flows into next nightly ssl-train-projection epoch.
//
// Storage: localStorage (offline-first, 24 h TTL).
// ═══════════════════════════════════════════════

import { safeStorage } from "@/lib/safeStorage";

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

export interface SSLProjection {
  version:   number;
  dimIn:     number;
  dimOut:    number;
  matrix:    Float32Array; // dimOut × dimIn, row-major
  evalLoss:  number;
  loadedAt:  number;       // Date.now()
}

interface ProjectionCacheEntry {
  version:    number;
  dimIn:      number;
  dimOut:     number;
  matrixB64:  string;
  evalLoss:   number;
  cachedAt:   string; // ISO
}

export interface SimilarPlan {
  planId:     string;
  planName:   string;
  similarity: number; // 0–1 projected cosine similarity
}

// ───────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────

const CACHE_KEY    = "funnelforge-ssl-projection";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

// In-memory singleton so we don't re-decode from localStorage on every call
let _active: SSLProjection | null = null;

// ───────────────────────────────────────────────
// Base64 ↔ Float32Array
// ───────────────────────────────────────────────

function b64ToFloat32(b64: string): Float32Array {
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

// ───────────────────────────────────────────────
// Linear algebra helpers
// ───────────────────────────────────────────────

function matVec(W: Float32Array, v: Float32Array, rows: number, cols: number): Float32Array {
  const out = new Float32Array(rows);
  for (let i = 0; i < rows; i++) {
    let sum = 0;
    const base = i * cols;
    for (let j = 0; j < cols; j++) sum += W[base + j] * v[j];
    out[i] = sum;
  }
  return out;
}

function l2Normalize(v: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) + 1e-8;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

// ───────────────────────────────────────────────
// Core: apply projection
// ───────────────────────────────────────────────

/**
 * Project a raw embedding vector into the learned similarity space.
 * If no projection is loaded, returns the first dimOut values of v (identity fallback).
 */
export function projectEmbedding(
  v: number[] | Float32Array,
  proj: SSLProjection,
): Float32Array {
  const input = new Float32Array(proj.dimIn);
  const src = v as ArrayLike<number>;
  const len = Math.min(src.length, proj.dimIn);
  for (let i = 0; i < len; i++) input[i] = src[i];
  return l2Normalize(matVec(proj.matrix, input, proj.dimOut, proj.dimIn));
}

/** Cosine similarity between two L2-normalized vectors (dot product). */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) dot += a[i] * b[i];
  return Math.max(-1, Math.min(1, dot));
}

// ───────────────────────────────────────────────
// Projection loading (localStorage + Supabase)
// ───────────────────────────────────────────────

/**
 * Load the active SSL projection. Priority:
 *   1. In-memory singleton (fastest)
 *   2. localStorage cache (< 24 h)
 *   3. Supabase ssl_projections (fetch + cache)
 *
 * Returns null if no projection has been trained yet (< MIN_PLANS).
 * Callers must treat null as "use raw embeddings".
 */
export async function loadActiveProjection(): Promise<SSLProjection | null> {
  // 1. In-memory hit
  if (_active && Date.now() - _active.loadedAt < CACHE_TTL_MS) return _active;

  // 2. localStorage hit
  const cached = safeStorage.getJSON<ProjectionCacheEntry | null>(CACHE_KEY, null);
  if (cached && Date.now() - new Date(cached.cachedAt).getTime() < CACHE_TTL_MS) {
    _active = {
      version:  cached.version,
      dimIn:    cached.dimIn,
      dimOut:   cached.dimOut,
      matrix:   b64ToFloat32(cached.matrixB64),
      evalLoss: cached.evalLoss,
      loadedAt: Date.now(),
    };
    return _active;
  }

  // 3. Supabase fetch
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    type ProjRow = { version: number; dim_in: number; dim_out: number; matrix_b64: string; eval_loss: number };
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (a: string, b: unknown) => {
            maybeSingle: () => Promise<{ data: ProjRow | null; error: unknown }>;
          };
        };
      };
    })
      .from("ssl_projections")
      .select("version, dim_in, dim_out, matrix_b64, eval_loss")
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) return null;

    const entry: ProjectionCacheEntry = {
      version:   data.version,
      dimIn:     data.dim_in,
      dimOut:    data.dim_out,
      matrixB64: data.matrix_b64,
      evalLoss:  data.eval_loss,
      cachedAt:  new Date().toISOString(),
    };
    safeStorage.setJSON(CACHE_KEY, entry);

    _active = {
      version:  entry.version,
      dimIn:    entry.dimIn,
      dimOut:   entry.dimOut,
      matrix:   b64ToFloat32(entry.matrixB64),
      evalLoss: entry.evalLoss,
      loadedAt: Date.now(),
    };
    return _active;
  } catch {
    return null;
  }
}

// ───────────────────────────────────────────────
// Plan-level similarity
// ───────────────────────────────────────────────

/**
 * Compute the projected centroid for a list of raw embeddings.
 * Used to represent a plan as the mean of its content embeddings in
 * the learned projection space.
 */
export function computePlanCentroid(
  embeddings: Array<number[]>,
  proj: SSLProjection,
): Float32Array | null {
  if (embeddings.length === 0) return null;
  const centroid = new Float32Array(proj.dimOut);
  for (const emb of embeddings) {
    const projected = projectEmbedding(emb, proj);
    for (let i = 0; i < proj.dimOut; i++) centroid[i] += projected[i];
  }
  for (let i = 0; i < proj.dimOut; i++) centroid[i] /= embeddings.length;
  return l2Normalize(centroid);
}

/**
 * Find plans most similar to planId in the projected embedding space.
 *
 * Steps:
 *   1. Load active projection (falls back to cosine on raw if none)
 *   2. Fetch anchor plan's content embeddings from Supabase
 *   3. Fetch all other plans' embeddings for userId
 *   4. Compute projected centroid per plan
 *   5. Rank by cosine similarity to anchor centroid
 *   6. Return top k (excluding anchor plan itself)
 */
export async function getSimilarPlans(
  planId: string,
  userId: string,
  k = 5,
): Promise<SimilarPlan[]> {
  try {
    const proj = await loadActiveProjection();
    if (!proj) return []; // no trained projection yet

    const { supabase } = await import("@/integrations/supabase/client");
    type EmbRow = { id: string; plan_id: string; embedding: number[] | null };
    type PlanRow = { id: string; name: string };

    // Fetch all non-ephemeral embeddings for this user (all plans at once)
    const { data: allEmbs, error: embErr } = await (supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (a: string, b: string) => {
            is: (a: string, b: null) => Promise<{ data: EmbRow[] | null; error: unknown }>;
          };
        };
      };
    })
      .from("content_embeddings")
      .select("id, plan_id, embedding")
      .eq("user_id", userId)
      .is("expires_at", null);

    if (embErr || !allEmbs || allEmbs.length === 0) return [];

    // Group embeddings by plan_id
    const byPlan = new Map<string, number[][]>();
    for (const row of allEmbs) {
      if (!row.plan_id || !row.embedding) continue;
      if (!byPlan.has(row.plan_id)) byPlan.set(row.plan_id, []);
      byPlan.get(row.plan_id)!.push(row.embedding);
    }

    const anchorEmbs = byPlan.get(planId);
    if (!anchorEmbs || anchorEmbs.length === 0) return [];

    const anchorCentroid = computePlanCentroid(anchorEmbs, proj);
    if (!anchorCentroid) return [];

    // Compute centroid + similarity for every other plan
    const candidates: Array<{ planId: string; similarity: number }> = [];
    for (const [pid, embs] of byPlan.entries()) {
      if (pid === planId) continue;
      const centroid = computePlanCentroid(embs, proj);
      if (!centroid) continue;
      candidates.push({ planId: pid, similarity: cosineSimilarity(anchorCentroid, centroid) });
    }
    candidates.sort((a, b) => b.similarity - a.similarity);
    const topK = candidates.slice(0, k);
    if (topK.length === 0) return [];

    // Fetch plan names
    const topIds = topK.map((c) => c.planId);
    const { data: planRows } = await (supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          in: (a: string, b: string[]) => Promise<{ data: PlanRow[] | null; error: unknown }>;
        };
      };
    })
      .from("saved_plans")
      .select("id, name")
      .in("id", topIds);

    const nameMap = new Map<string, string>();
    for (const p of (planRows ?? [])) nameMap.set(p.id, p.name);

    return topK.map((c) => ({
      planId:     c.planId,
      planName:   nameMap.get(c.planId) ?? "",
      similarity: +c.similarity.toFixed(4),
    }));
  } catch {
    return [];
  }
}

// ───────────────────────────────────────────────
// Cache management
// ───────────────────────────────────────────────

/** Force-clear projection cache (GDPR / testing). */
export function clearProjectionCache(): void {
  _active = null;
  safeStorage.remove(CACHE_KEY);
}

/** Force-refresh projection from Supabase on next call. */
export function invalidateProjectionCache(): void {
  _active = null;
  safeStorage.remove(CACHE_KEY);
}
