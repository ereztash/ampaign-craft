-- Self-Supervised Learning — Projection Table + Triplet Miner
--
-- Stores trained contrastive projection matrices (W ∈ R^{dim_out × dim_in})
-- learned from co-plan content pairs. The projection maps raw embeddings into
-- a compact space where items from the same plan are closer together.
--
-- Training runs nightly via ssl-train-projection edge function (Loop 7).
-- Inference is done client-side by sslEmbeddingEngine.ts.

-- ───────────────────────────────────────────────
-- ssl_projections: versioned projection matrices
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ssl_projections (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  version       INT         NOT NULL,
  scope_type    TEXT        NOT NULL DEFAULT 'global',
  scope_value   TEXT        NOT NULL DEFAULT 'global',
  dim_in        INT         NOT NULL,
  dim_out       INT         NOT NULL,
  matrix_b64    TEXT        NOT NULL,  -- base64-encoded Float32Array, row-major (dim_out × dim_in)
  eval_loss     FLOAT8      NOT NULL,
  baseline_loss FLOAT8      NOT NULL,  -- eval_loss of the previous active projection (0 if first)
  sample_n      INT         NOT NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT false,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active projection per (scope_type, scope_value)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ssl_projections_active
  ON public.ssl_projections (scope_type, scope_value)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ssl_projections_scope_history
  ON public.ssl_projections (scope_type, scope_value, computed_at DESC);

ALTER TABLE public.ssl_projections ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active projections (needed by client-side engine)
CREATE POLICY "ssl_projections_select" ON public.ssl_projections
  FOR SELECT USING (is_active = true AND auth.role() = 'authenticated');

-- Service role bypasses RLS for writes (edge function uses service key)

-- ───────────────────────────────────────────────
-- mine_ssl_triplets: generate contrastive training triplets
--
-- Positive pairs:  two content items from the SAME plan (anchor + positive)
-- Negative sample: one item from a DIFFERENT plan (negative)
--
-- Restricted to non-ephemeral rows (expires_at IS NULL) so web search
-- cache rows don't pollute the training signal.
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mine_ssl_triplets(
  p_limit INT DEFAULT 500
)
RETURNS TABLE (
  anchor_id   UUID,
  positive_id UUID,
  negative_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eligible AS (
    -- Only non-ephemeral items that belong to a plan and have an embedding
    SELECT id, plan_id, user_id
    FROM content_embeddings
    WHERE plan_id   IS NOT NULL
      AND embedding IS NOT NULL
      AND expires_at IS NULL
  ),
  anchor_positive AS (
    -- Same plan, different row — shuffle to avoid positional bias
    SELECT
      a.id  AS anchor_id,
      p.id  AS positive_id,
      a.plan_id
    FROM eligible a
    JOIN eligible p
      ON  p.plan_id = a.plan_id
      AND p.id     <> a.id
    ORDER BY random()
    LIMIT p_limit * 3
  ),
  negatives AS (
    SELECT id AS neg_id, plan_id AS neg_plan_id
    FROM eligible
    ORDER BY random()
    LIMIT p_limit * 6
  )
  SELECT DISTINCT ON (ap.anchor_id)
    ap.anchor_id,
    ap.positive_id,
    n.neg_id AS negative_id
  FROM anchor_positive ap
  JOIN negatives n ON n.neg_plan_id <> ap.plan_id
  ORDER BY ap.anchor_id, random()
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.mine_ssl_triplets(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mine_ssl_triplets(INT) TO service_role;

COMMENT ON TABLE public.ssl_projections IS
  'Versioned contrastive projection matrices (W) learned from co-plan content pairs. '
  'Inference: proj(v) = L2_norm(W @ v[:dim_in]). dim_in is the truncation of the '
  'raw 1536-dim OpenAI embedding (Matryoshka-safe). Loop 7 closes via ssl_similar '
  'pick events flowing back as hard positives into the next training epoch.';
