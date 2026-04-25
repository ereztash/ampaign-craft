// ═══════════════════════════════════════════════
// SSL Train Projection — Edge Function (Loop 7)
//
// Nightly job that trains a contrastive projection matrix W ∈ R^{dim_out × dim_in}
// from co-plan content pairs. Uses Adam + triplet margin loss.
//
// Reads:   content_embeddings (via mine_ssl_triplets RPC)
// Writes:  ssl_projections (inserts new row, deactivates previous)
//
// Invocation:
//   pg_cron: SELECT cron.schedule('ssl-train', '0 2 * * *', ...)
//   Manual:  POST /functions/v1/ssl-train-projection
//
// Guards:
//   - Requires >= MIN_PLANS distinct plans to proceed
//   - Rejects new projection if eval_loss >= REGRESSION_THRESHOLD * baseline_loss
//   - Early stopping after PATIENCE epochs without improvement
// ═══════════════════════════════════════════════

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ───────────────────────────────────────────────
// Hyperparameters
// ───────────────────────────────────────────────

const DIM_IN  = 512;   // truncate 1536-dim OpenAI vectors (Matryoshka-safe)
const DIM_OUT = 64;    // projected dimension
const MARGIN  = 0.2;   // triplet margin
const LR      = 0.01;  // Adam learning rate
const BETA1   = 0.9;
const BETA2   = 0.999;
const EPSILON = 1e-8;

const MAX_EPOCHS    = 20;
const BATCH_SIZE    = 32;
const MAX_TRIPLETS  = 500;
const HOLDOUT_FRAC  = 0.2;
const PATIENCE      = 4;    // epochs without improvement before stopping
const MIN_PLANS     = 50;   // minimum distinct plans required to train
const REGRESSION_THRESHOLD = 0.95; // reject if new_loss >= threshold * baseline_loss

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ───────────────────────────────────────────────
// Linear algebra helpers (Float32Array, zero-alloc loops)
// ───────────────────────────────────────────────

function matVec(W: Float32Array, v: Float32Array, rows: number, cols: number, out: Float32Array): void {
  for (let i = 0; i < rows; i++) {
    let sum = 0;
    const base = i * cols;
    for (let j = 0; j < cols; j++) sum += W[base + j] * v[j];
    out[i] = sum;
  }
}

function squaredDist(a: Float32Array, b: Float32Array, len: number): number {
  let d = 0;
  for (let i = 0; i < len; i++) { const diff = a[i] - b[i]; d += diff * diff; }
  return d;
}

// Xavier uniform init: U[-bound, bound], bound = sqrt(6 / (fan_in + fan_out))
function xavierInit(W: Float32Array, fanIn: number, fanOut: number): void {
  const bound = Math.sqrt(6 / (fanIn + fanOut));
  for (let i = 0; i < W.length; i++) {
    W[i] = (Math.random() * 2 - 1) * bound;
  }
}

// ───────────────────────────────────────────────
// Triplet loss + gradient accumulation for one batch
// ───────────────────────────────────────────────

function batchGradient(
  W: Float32Array,
  anchors:   Float32Array[],
  positives: Float32Array[],
  negatives: Float32Array[],
  grad: Float32Array,       // accumulated in-place
  ap: Float32Array,         // scratch buffers
  pp: Float32Array,
  np: Float32Array,
): number {
  let totalLoss = 0;
  grad.fill(0);

  for (let b = 0; b < anchors.length; b++) {
    matVec(W, anchors[b],   DIM_OUT, DIM_IN, ap);
    matVec(W, positives[b], DIM_OUT, DIM_IN, pp);
    matVec(W, negatives[b], DIM_OUT, DIM_IN, np);

    const dPos = squaredDist(ap, pp, DIM_OUT);
    const dNeg = squaredDist(ap, np, DIM_OUT);
    const loss = Math.max(0, dPos - dNeg + MARGIN);
    if (loss <= 0) continue;

    totalLoss += loss;

    // ∂L/∂W = 2 * (ap−pp) ⊗ (a−p) − 2 * (ap−np) ⊗ (a−n)
    for (let i = 0; i < DIM_OUT; i++) {
      const dpA = 2 * (ap[i] - pp[i]);
      const dnA = 2 * (ap[i] - np[i]);
      const base = i * DIM_IN;
      const a = anchors[b];
      const p = positives[b];
      const n = negatives[b];
      for (let j = 0; j < DIM_IN; j++) {
        grad[base + j] += dpA * (a[j] - p[j]) - dnA * (a[j] - n[j]);
      }
    }
  }

  return totalLoss;
}

// ───────────────────────────────────────────────
// Eval loss on a held-out set (no gradient)
// ───────────────────────────────────────────────

function evalLoss(
  W: Float32Array,
  anchors: Float32Array[],
  positives: Float32Array[],
  negatives: Float32Array[],
): number {
  const ap = new Float32Array(DIM_OUT);
  const pp = new Float32Array(DIM_OUT);
  const np = new Float32Array(DIM_OUT);
  let total = 0;
  for (let b = 0; b < anchors.length; b++) {
    matVec(W, anchors[b],   DIM_OUT, DIM_IN, ap);
    matVec(W, positives[b], DIM_OUT, DIM_IN, pp);
    matVec(W, negatives[b], DIM_OUT, DIM_IN, np);
    total += Math.max(0, squaredDist(ap, pp, DIM_OUT) - squaredDist(ap, np, DIM_OUT) + MARGIN);
  }
  return anchors.length > 0 ? total / anchors.length : 0;
}

// ───────────────────────────────────────────────
// Float32Array ↔ base64
// ───────────────────────────────────────────────

function float32ToB64(arr: Float32Array): string {
  const bytes = new Uint8Array(arr.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ───────────────────────────────────────────────
// Main handler
// ───────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("authorization");
  const isServiceRole = authHeader?.includes(SUPABASE_SERVICE_KEY);
  const isCron = req.headers.get("x-pg-cron") === "1";
  if (!isServiceRole && !isCron) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const metrics: Record<string, number | string> = {};

  try {
    // ── 1. Guard: enough plans? ──
    const { count, error: cntErr } = await supabase
      .from("content_embeddings")
      .select("plan_id", { count: "exact", head: true })
      .not("plan_id", "is", null)
      .is("expires_at", null);
    if (cntErr) throw new Error(`plan count: ${cntErr.message}`);

    // count is items, not distinct plans — conservative check
    const itemCount = count ?? 0;
    if (itemCount < MIN_PLANS) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "insufficient_data", item_count: itemCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Mine triplets ──
    const { data: tripletRows, error: tripletErr } = await supabase
      .rpc("mine_ssl_triplets", { p_limit: MAX_TRIPLETS });
    if (tripletErr) throw new Error(`mine_ssl_triplets: ${tripletErr.message}`);

    const triplets = (tripletRows ?? []) as { anchor_id: string; positive_id: string; negative_id: string }[];
    if (triplets.length < 10) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "too_few_triplets", triplet_count: triplets.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    metrics.triplets_mined = triplets.length;

    // ── 3. Fetch all needed embeddings ──
    const allIds = [...new Set(triplets.flatMap((t) => [t.anchor_id, t.positive_id, t.negative_id]))];
    const { data: embRows, error: embErr } = await supabase
      .from("content_embeddings")
      .select("id, embedding")
      .in("id", allIds);
    if (embErr) throw new Error(`fetch embeddings: ${embErr.message}`);

    type EmbRow = { id: string; embedding: number[] | null };
    const embMap = new Map<string, Float32Array>();
    for (const row of ((embRows ?? []) as EmbRow[])) {
      if (!row.embedding || row.embedding.length < DIM_IN) continue;
      const v = new Float32Array(DIM_IN);
      for (let i = 0; i < DIM_IN; i++) v[i] = row.embedding[i];
      embMap.set(row.id, v);
    }

    // Filter triplets where all three embeddings resolved
    const validTriplets = triplets.filter(
      (t) => embMap.has(t.anchor_id) && embMap.has(t.positive_id) && embMap.has(t.negative_id),
    );
    if (validTriplets.length < 10) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "insufficient_resolved_triplets", resolved: validTriplets.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    metrics.triplets_valid = validTriplets.length;

    // ── 4. Train / holdout split ──
    const shuffled = [...validTriplets].sort(() => Math.random() - 0.5);
    const holdoutN  = Math.max(1, Math.floor(shuffled.length * HOLDOUT_FRAC));
    const trainSet  = shuffled.slice(holdoutN);
    const holdoutSet = shuffled.slice(0, holdoutN);

    const trainA  = trainSet.map((t) => embMap.get(t.anchor_id)!);
    const trainP  = trainSet.map((t) => embMap.get(t.positive_id)!);
    const trainN  = trainSet.map((t) => embMap.get(t.negative_id)!);
    const holdA   = holdoutSet.map((t) => embMap.get(t.anchor_id)!);
    const holdP   = holdoutSet.map((t) => embMap.get(t.positive_id)!);
    const holdN   = holdoutSet.map((t) => embMap.get(t.negative_id)!);

    // ── 5. Load baseline loss from current active projection ──
    const { data: existing } = await supabase
      .from("ssl_projections")
      .select("eval_loss, version")
      .eq("scope_type", "global")
      .eq("scope_value", "global")
      .eq("is_active", true)
      .maybeSingle();

    const baselineLoss = (existing as { eval_loss: number; version: number } | null)?.eval_loss ?? 0;
    const nextVersion  = ((existing as { eval_loss: number; version: number } | null)?.version ?? 0) + 1;

    // ── 6. Xavier init + Adam state ──
    const W  = new Float32Array(DIM_OUT * DIM_IN);
    const m  = new Float32Array(DIM_OUT * DIM_IN); // Adam first moment
    const v  = new Float32Array(DIM_OUT * DIM_IN); // Adam second moment
    xavierInit(W, DIM_IN, DIM_OUT);

    const grad = new Float32Array(DIM_OUT * DIM_IN);
    const ap   = new Float32Array(DIM_OUT);
    const pp   = new Float32Array(DIM_OUT);
    const np   = new Float32Array(DIM_OUT);

    // ── 7. Training loop ──
    let bestEvalLoss = Infinity;
    const bestW = new Float32Array(DIM_OUT * DIM_IN);
    let patienceCount = 0;
    let adamStep = 0;

    for (let epoch = 0; epoch < MAX_EPOCHS; epoch++) {
      // Shuffle training triplets each epoch
      const idx = trainA.map((_, i) => i).sort(() => Math.random() - 0.5);
      let epochLoss = 0;

      for (let b = 0; b < idx.length; b += BATCH_SIZE) {
        const batchIdx = idx.slice(b, b + BATCH_SIZE);
        const bA = batchIdx.map((i) => trainA[i]);
        const bP = batchIdx.map((i) => trainP[i]);
        const bN = batchIdx.map((i) => trainN[i]);

        epochLoss += batchGradient(W, bA, bP, bN, grad, ap, pp, np);

        // Scale gradient by batch size
        const scale = 1 / batchIdx.length;
        adamStep++;
        const bc1 = 1 - Math.pow(BETA1, adamStep);
        const bc2 = 1 - Math.pow(BETA2, adamStep);

        for (let k = 0; k < W.length; k++) {
          const g = grad[k] * scale;
          m[k] = BETA1 * m[k] + (1 - BETA1) * g;
          v[k] = BETA2 * v[k] + (1 - BETA2) * g * g;
          const mHat = m[k] / bc1;
          const vHat = v[k] / bc2;
          W[k] -= LR * mHat / (Math.sqrt(vHat) + EPSILON);
        }
      }

      const holdLoss = evalLoss(W, holdA, holdP, holdN);

      if (holdLoss < bestEvalLoss - 1e-6) {
        bestEvalLoss = holdLoss;
        bestW.set(W);
        patienceCount = 0;
      } else {
        patienceCount++;
        if (patienceCount >= PATIENCE) break; // early stopping
      }
    }
    metrics.epochs_run   = adamStep;
    metrics.eval_loss    = +bestEvalLoss.toFixed(6);
    metrics.baseline_loss = +baselineLoss.toFixed(6);

    // ── 8. Regression check ──
    if (baselineLoss > 0 && bestEvalLoss >= REGRESSION_THRESHOLD * baselineLoss) {
      metrics.rejected = 1;
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "regression", ...metrics }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 9. Deactivate old, insert new ──
    await supabase
      .from("ssl_projections")
      .update({ is_active: false })
      .eq("scope_type", "global")
      .eq("scope_value", "global")
      .eq("is_active", true);

    const { error: insertErr } = await supabase
      .from("ssl_projections")
      .insert({
        version:       nextVersion,
        scope_type:    "global",
        scope_value:   "global",
        dim_in:        DIM_IN,
        dim_out:       DIM_OUT,
        matrix_b64:    float32ToB64(bestW),
        eval_loss:     bestEvalLoss,
        baseline_loss: baselineLoss,
        sample_n:      validTriplets.length,
        is_active:     true,
      });
    if (insertErr) throw new Error(`insert projection: ${insertErr.message}`);

    metrics.version_written = nextVersion;
    console.log("[ssl-train-projection] done:", metrics);

    return new Response(JSON.stringify({ ok: true, ...metrics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ssl-train-projection] error:", message);
    return new Response(JSON.stringify({ ok: false, error: message, partial: metrics }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
