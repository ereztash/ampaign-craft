-- ═══════════════════════════════════════════════════════════════════
-- Migration: engine_history_and_content
-- Purpose  : Closes the remaining MOAT data gaps:
--
--   1. ALTER variant_pick_events  — add hover_ms (micro-behavior signal)
--   2. engine_snapshots           — time-series of key engine outputs
--   3. content_snapshots          — embedding-ready structured text capture
--
-- All tables: RLS enabled, users own their rows.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Micro-behavior: add hover_ms to variant_pick_events ────────────

ALTER TABLE public.variant_pick_events
  ADD COLUMN IF NOT EXISTS hover_ms int4;

COMMENT ON COLUMN public.variant_pick_events.hover_ms
  IS 'Milliseconds the user hovered over the card before making a choice. '
     'High values signal uncertainty; low values signal strong preference. '
     'NULL when hover was not tracked (e.g. touch devices).';

CREATE INDEX IF NOT EXISTS idx_variant_pick_hover
  ON public.variant_pick_events (hover_ms) WHERE hover_ms IS NOT NULL;

-- ── 2. Engine output history ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.engine_snapshots (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  archetype_id             text        NOT NULL,
  confidence_tier          text        NOT NULL DEFAULT 'none',
  health_score             float4,
  bottleneck_count         int4        NOT NULL DEFAULT 0,
  critical_bottleneck_count int4       NOT NULL DEFAULT 0,
  success_probability      float4,
  plan_count               int4        NOT NULL DEFAULT 0,
  connected_sources        int4        NOT NULL DEFAULT 0,
  snapshotted_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT eng_snap_archetype_check CHECK (archetype_id IN (
    'strategist', 'optimizer', 'pioneer', 'connector', 'closer'
  )),
  CONSTRAINT eng_snap_tier_check CHECK (confidence_tier IN (
    'none', 'tentative', 'confident', 'strong'
  )),
  CONSTRAINT eng_snap_health_range CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100)),
  CONSTRAINT eng_snap_prob_range   CHECK (success_probability IS NULL OR (success_probability >= 0 AND success_probability <= 100))
);

CREATE INDEX IF NOT EXISTS idx_eng_snap_user_time
  ON public.engine_snapshots (user_id, snapshotted_at DESC);

CREATE INDEX IF NOT EXISTS idx_eng_snap_archetype_time
  ON public.engine_snapshots (archetype_id, snapshotted_at DESC);

ALTER TABLE public.engine_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eng_snap_insert"
  ON public.engine_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "eng_snap_select"
  ON public.engine_snapshots FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT ON public.engine_snapshots TO authenticated;

-- ── 3. Content snapshots (embedding-ready) ────────────────────────────

CREATE TABLE IF NOT EXISTS public.content_snapshots (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  archetype_id        text        NOT NULL,
  business_field      text        NOT NULL DEFAULT '',
  audience_type       text        NOT NULL DEFAULT '',
  product_description text        NOT NULL DEFAULT '',
  interests           text        NOT NULL DEFAULT '',
  main_goal           text        NOT NULL DEFAULT '',
  embedding_status    text        NOT NULL DEFAULT 'pending',
  -- populated by Edge Function / pg_cron embedding job:
  embedding           vector(1536),
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT content_snap_archetype_check CHECK (archetype_id IN (
    'strategist', 'optimizer', 'pioneer', 'connector', 'closer'
  )),
  CONSTRAINT content_snap_embed_status_check CHECK (embedding_status IN (
    'pending', 'done', 'failed'
  ))
);

CREATE INDEX IF NOT EXISTS idx_content_snap_user
  ON public.content_snapshots (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_snap_archetype
  ON public.content_snapshots (archetype_id, embedding_status);

-- Pending embeddings queue — used by the Edge Function to pick up work
CREATE INDEX IF NOT EXISTS idx_content_snap_pending
  ON public.content_snapshots (created_at ASC)
  WHERE embedding_status = 'pending';

-- Vector similarity index — used after embeddings are populated
CREATE INDEX IF NOT EXISTS idx_content_snap_vector
  ON public.content_snapshots
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

ALTER TABLE public.content_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_snap_insert"
  ON public.content_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "content_snap_select"
  ON public.content_snapshots FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin function: fetch pending embeddings (called by Edge Function)
CREATE POLICY "content_snap_service_select"
  ON public.content_snapshots FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "content_snap_service_update"
  ON public.content_snapshots FOR UPDATE
  TO service_role
  USING (true);

GRANT SELECT, INSERT ON public.content_snapshots TO authenticated;
GRANT SELECT, UPDATE ON public.content_snapshots TO service_role;

-- ── Embedding job function (called by pg_cron or Edge Function) ───────
-- Marks content_snapshots as 'failed' if embedding not populated in 24h.
CREATE OR REPLACE FUNCTION public.expire_stale_embeddings()
RETURNS void LANGUAGE sql AS $$
  UPDATE public.content_snapshots
  SET embedding_status = 'failed'
  WHERE embedding_status = 'pending'
    AND created_at < now() - interval '24 hours';
$$;
