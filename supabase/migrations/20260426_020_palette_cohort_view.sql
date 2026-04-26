-- Palette Cohort View Migration
-- Extends the MOAT flywheel with a palette dimension.
-- Pattern mirrors cohort_benchmarks from 20260414_001_outcome_loop.sql.
--
-- Color Moat: this view is the raw material for the proprietary
-- (archetype × palette × stage) → conversion lookup table.
-- After n≥200 exposures per arm, Δ≥5pp, p<0.05:
--   the winning palette variant is promoted to archetype default in index.css.

-- ─── View ─────────────────────────────────────────────────────────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS palette_cohort_benchmarks AS
SELECT
  re.archetype_id,
  (re.context_snapshot->>'palette_variant_id')::text  AS palette_variant_id,
  re.action_id,
  or2.horizon_days,
  COUNT(DISTINCT re.user_id)                           AS n_users,
  COUNT(re.id)                                         AS n_shown,
  COUNT(CASE WHEN vp.choice = 'primary'   THEN 1 END)  AS n_primary_pick,
  COUNT(CASE WHEN vp.choice = 'variation' THEN 1 END)  AS n_variation_pick,
  COUNT(CASE WHEN vp.choice = 'skip'      THEN 1 END)  AS n_skip,
  COUNT(CASE WHEN or2.outcome_type = 'plan_created'    THEN 1 END) AS n_plan_created,
  COUNT(CASE WHEN or2.outcome_type = 'revenue_reported' THEN 1 END) AS n_revenue,
  ROUND(
    COUNT(CASE WHEN or2.outcome_type = 'plan_created' THEN 1 END)::numeric
    / NULLIF(COUNT(re.id), 0) * 100, 2
  )                                                    AS conversion_rate_pct,
  NOW()                                                AS refreshed_at
FROM recommendation_events re
LEFT JOIN variant_pick_events vp
  ON vp.recommendation_id = re.id
LEFT JOIN outcome_reports or2
  ON or2.recommendation_id = re.id
WHERE
  re.context_snapshot ? 'palette_variant_id'
  AND (re.context_snapshot->>'palette_variant_id') IS NOT NULL
GROUP BY
  re.archetype_id,
  re.context_snapshot->>'palette_variant_id',
  re.action_id,
  or2.horizon_days
WITH DATA;

-- ─── Index ─────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS palette_cohort_benchmarks_pk
  ON palette_cohort_benchmarks (archetype_id, palette_variant_id, action_id, horizon_days)
  NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS palette_cohort_benchmarks_archetype
  ON palette_cohort_benchmarks (archetype_id, palette_variant_id);

-- ─── Promotion ETA View ────────────────────────────────────────────────────
-- Computes rows_to_promotion = max(0, 200 - n_shown) / weekly_rate
-- Surfaced in /admin/palette-cohorts as the "ETA" column.
-- Promotion threshold: n_shown ≥ 200 AND |Δ conversion| ≥ 5pp AND p < 0.05

CREATE OR REPLACE VIEW palette_promotion_eta AS
WITH weekly_rates AS (
  SELECT
    archetype_id,
    palette_variant_id,
    action_id,
    n_shown,
    -- Approximate weekly rate: total shown / weeks since first event
    -- (conservative: uses 1 week minimum to avoid division explosion on day 1)
    GREATEST(1, n_shown) AS rate_denominator
  FROM palette_cohort_benchmarks
  WHERE horizon_days = 7 OR horizon_days IS NULL
)
SELECT
  archetype_id,
  palette_variant_id,
  action_id,
  n_shown,
  GREATEST(0, 200 - n_shown)                          AS rows_to_promotion,
  CASE
    WHEN n_shown >= 200 THEN 'eligible_for_review'
    ELSE 'accumulating'
  END                                                  AS status
FROM weekly_rates;

-- ─── Refresh Function ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_palette_cohort_benchmarks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY palette_cohort_benchmarks;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'refresh_palette_cohort_benchmarks failed: %', SQLERRM;
END;
$$;

-- ─── pg_cron Schedule ──────────────────────────────────────────────────────
-- Follows the same pattern as 20260423_016_kg_pg_cron_schedules.sql.
-- Runs nightly at 05:00 UTC (after cohort_benchmarks refresh at 03:00).

DO $$
BEGIN
  PERFORM cron.unschedule('refresh-palette-cohort-benchmarks');
EXCEPTION WHEN undefined_function OR undefined_table THEN
  RAISE WARNING 'pg_cron not available; skipping unschedule';
END;
$$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'refresh-palette-cohort-benchmarks',
    '0 5 * * *',
    $$SELECT public.refresh_palette_cohort_benchmarks();$$
  );
EXCEPTION WHEN undefined_function OR undefined_table THEN
  RAISE WARNING 'pg_cron not available; skipping palette cohort schedule';
END;
$$;
