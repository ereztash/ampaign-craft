-- ═══════════════════════════════════════════════════════════════════
-- Migration: outcome_loop
-- Purpose  : Closes the action→outcome loop — the critical zero-captured
--            gap identified in the MOAT audit. Three tables:
--
--   recommendation_events — every insight/nudge shown to a user
--   variant_pick_events   — user's explicit Midjourney-style UX pick
--   outcome_reports       — delayed 7/30/90-day conversion measurement
--   cohort_benchmarks     — anonymized archetype-level aggregates (view)
--
-- RLS      : Users own their rows; cohort_benchmarks is read-only for all.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. recommendation_events ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recommendation_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  archetype_id        text        NOT NULL,
  confidence_tier     text        NOT NULL DEFAULT 'none',
  source              text        NOT NULL,
  action_id           text        NOT NULL,
  action_label_en     text        NOT NULL DEFAULT '',
  context_snapshot    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  shown_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rec_events_source_check CHECK (source IN (
    'insight_feed', 'nudge_banner', 'guidance_panel',
    'archetype_pipeline', 'express_wizard'
  )),
  CONSTRAINT rec_events_archetype_check CHECK (archetype_id IN (
    'strategist', 'optimizer', 'pioneer', 'connector', 'closer'
  )),
  CONSTRAINT rec_events_confidence_tier_check CHECK (confidence_tier IN (
    'none', 'tentative', 'confident', 'strong'
  ))
);

CREATE INDEX IF NOT EXISTS idx_rec_events_user
  ON public.recommendation_events (user_id);

CREATE INDEX IF NOT EXISTS idx_rec_events_archetype_action
  ON public.recommendation_events (archetype_id, action_id);

CREATE INDEX IF NOT EXISTS idx_rec_events_shown_at
  ON public.recommendation_events (shown_at DESC);

-- ── 2. variant_pick_events ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.variant_pick_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id   uuid        REFERENCES public.recommendation_events(id) ON DELETE CASCADE,
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  choice              text        NOT NULL,
  position            int4        NOT NULL DEFAULT 0,
  picked_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT variant_pick_choice_check CHECK (choice IN ('primary', 'variation', 'skip'))
);

CREATE INDEX IF NOT EXISTS idx_variant_pick_rec
  ON public.variant_pick_events (recommendation_id);

CREATE INDEX IF NOT EXISTS idx_variant_pick_user
  ON public.variant_pick_events (user_id);

CREATE INDEX IF NOT EXISTS idx_variant_pick_choice
  ON public.variant_pick_events (choice);

-- ── 3. outcome_reports ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.outcome_reports (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id   uuid        REFERENCES public.recommendation_events(id) ON DELETE CASCADE,
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  horizon_days        int4        NOT NULL,
  outcome_type        text        NOT NULL,
  delta_value         float4,
  reported_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT outcome_horizon_check CHECK (horizon_days IN (7, 30, 90)),
  CONSTRAINT outcome_type_check CHECK (outcome_type IN (
    'navigated', 'plan_created', 'source_connected',
    'revenue_reported', 'dismissed'
  ))
);

CREATE INDEX IF NOT EXISTS idx_outcome_reports_rec
  ON public.outcome_reports (recommendation_id);

CREATE INDEX IF NOT EXISTS idx_outcome_reports_user
  ON public.outcome_reports (user_id);

CREATE INDEX IF NOT EXISTS idx_outcome_reports_horizon
  ON public.outcome_reports (horizon_days, outcome_type);

-- ── 4. cohort_benchmarks (materialized view — refreshed nightly) ──────
-- Anonymized cross-tenant aggregates: no PII, archetype + action only.

CREATE MATERIALIZED VIEW IF NOT EXISTS public.cohort_benchmarks AS
SELECT
  re.archetype_id,
  re.action_id,
  count(DISTINCT re.id)                                               AS sample_n,
  round(
    count(DISTINCT vp.id) FILTER (WHERE vp.choice = 'primary')::numeric
    / nullif(count(DISTINCT re.id), 0), 4
  )                                                                   AS primary_pick_rate,
  round(
    count(DISTINCT vp.id) FILTER (WHERE vp.choice = 'variation')::numeric
    / nullif(count(DISTINCT re.id), 0), 4
  )                                                                   AS variation_pick_rate,
  round(
    count(DISTINCT vp.id) FILTER (WHERE vp.choice = 'skip')::numeric
    / nullif(count(DISTINCT re.id), 0), 4
  )                                                                   AS skip_rate,
  avg(or7.delta_value)  FILTER (WHERE or7.outcome_type != 'dismissed')  AS avg_conversion_7d,
  avg(or30.delta_value) FILTER (WHERE or30.outcome_type != 'dismissed') AS avg_conversion_30d,
  now()                                                               AS computed_at
FROM public.recommendation_events re
LEFT JOIN public.variant_pick_events vp   ON vp.recommendation_id = re.id
LEFT JOIN public.outcome_reports     or7  ON or7.recommendation_id = re.id AND or7.horizon_days = 7
LEFT JOIN public.outcome_reports     or30 ON or30.recommendation_id = re.id AND or30.horizon_days = 30
GROUP BY re.archetype_id, re.action_id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cohort_benchmarks_pk
  ON public.cohort_benchmarks (archetype_id, action_id);

-- Refresh function for scheduled nightly job (pg_cron / Supabase scheduled fn)
CREATE OR REPLACE FUNCTION public.refresh_cohort_benchmarks()
RETURNS void LANGUAGE sql AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.cohort_benchmarks;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────

ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_pick_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_reports       ENABLE ROW LEVEL SECURITY;

-- recommendation_events: users own their rows; anon can insert without user_id
CREATE POLICY "rec_events_insert"
  ON public.recommendation_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "rec_events_select"
  ON public.recommendation_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- variant_pick_events
CREATE POLICY "variant_pick_insert"
  ON public.variant_pick_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "variant_pick_select"
  ON public.variant_pick_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- outcome_reports
CREATE POLICY "outcome_insert"
  ON public.outcome_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "outcome_select"
  ON public.outcome_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- cohort_benchmarks: read-only for all authenticated users (no PII)
GRANT SELECT ON public.cohort_benchmarks TO authenticated;

-- ── Grants ────────────────────────────────────────────────────────────

GRANT SELECT, INSERT
  ON public.recommendation_events,
     public.variant_pick_events,
     public.outcome_reports
  TO authenticated;
