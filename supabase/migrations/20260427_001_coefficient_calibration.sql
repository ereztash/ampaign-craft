-- Coefficient Calibration Infrastructure (Wave 2 — empirical validation)
--
-- Behavioral-science engines today carry hard-coded heuristic constants
-- (premiumPct, WASTE_RATES, decoy ratios, EPS weights, etc.). The
-- behavioral-science review flagged these as "guess" coefficients with
-- no empirical backing.
--
-- This migration adds the infrastructure to:
--   1. Record observations of (predicted, actual) pairs per coefficient.
--   2. Compute a calibrated value once N >= threshold.
--   3. Surface confidence so callers can fall back to the heuristic
--      below threshold and gradually shift to the calibrated value.
--
-- The actual capture is wired in by application code. This migration is
-- intentionally additive — no engine change, no breaking schema change.

-- ─── 1. Observations table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coefficient_observations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coefficient  text NOT NULL,                 -- e.g. "psm.premiumPct.high_budget"
  predicted    double precision NOT NULL,     -- value the engine output
  actual       double precision NOT NULL,     -- value observed in the wild
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  context      jsonb DEFAULT '{}'::jsonb,     -- archetype, business_field, etc.
  observed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coef_obs_coefficient_observed_at
  ON coefficient_observations (coefficient, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_coef_obs_user_id
  ON coefficient_observations (user_id);

-- RLS: users can insert their own observations; only service role reads.
ALTER TABLE coefficient_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY coef_obs_insert_own
  ON coefficient_observations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- No SELECT policy — service role only.

-- ─── 2. Calibrated values cache ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS coefficient_calibrated (
  coefficient    text PRIMARY KEY,
  calibrated     double precision NOT NULL,
  heuristic      double precision NOT NULL,
  n              integer NOT NULL,
  confidence     double precision NOT NULL,    -- 0..1, function of N and variance
  computed_at    timestamptz NOT NULL DEFAULT now(),
  next_refresh   timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE coefficient_calibrated ENABLE ROW LEVEL SECURITY;

-- Public-read: the engines need to fetch this on every request.
CREATE POLICY coef_calib_read_all
  ON coefficient_calibrated
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- ─── 3. Recompute RPC ────────────────────────────────────────────────
-- Aggregates observations into a calibrated value. Called by pg_cron
-- daily, and on-demand from a Supabase Edge Function.
CREATE OR REPLACE FUNCTION recompute_coefficient_calibration(
  p_coefficient text,
  p_heuristic   double precision,
  p_min_n       integer DEFAULT 30
)
RETURNS coefficient_calibrated
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n            integer;
  v_calibrated   double precision;
  v_variance     double precision;
  v_confidence   double precision;
  v_row          coefficient_calibrated;
BEGIN
  -- Use the median of the actual/predicted ratio to avoid outlier sway.
  SELECT count(*),
         percentile_cont(0.5) WITHIN GROUP (ORDER BY actual),
         var_samp(actual)
    INTO v_n, v_calibrated, v_variance
  FROM coefficient_observations
  WHERE coefficient = p_coefficient
    AND observed_at > now() - interval '90 days';

  IF v_n < p_min_n THEN
    -- Not enough data: leave the heuristic in place, low confidence.
    INSERT INTO coefficient_calibrated AS c (
      coefficient, calibrated, heuristic, n, confidence, computed_at, next_refresh
    )
    VALUES (p_coefficient, p_heuristic, p_heuristic, COALESCE(v_n, 0), 0.0, now(), now() + interval '24 hours')
    ON CONFLICT (coefficient) DO UPDATE
      SET calibrated   = EXCLUDED.calibrated,
          heuristic    = EXCLUDED.heuristic,
          n            = EXCLUDED.n,
          confidence   = EXCLUDED.confidence,
          computed_at  = EXCLUDED.computed_at,
          next_refresh = EXCLUDED.next_refresh
    RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  -- Confidence: rises with N, falls with variance. Capped at 0.95.
  v_confidence := least(0.95, (v_n::double precision / (v_n + 30)) *
                              (1.0 / (1.0 + COALESCE(v_variance, 1.0))));

  INSERT INTO coefficient_calibrated AS c (
    coefficient, calibrated, heuristic, n, confidence, computed_at, next_refresh
  )
  VALUES (p_coefficient, v_calibrated, p_heuristic, v_n, v_confidence, now(), now() + interval '24 hours')
  ON CONFLICT (coefficient) DO UPDATE
    SET calibrated   = EXCLUDED.calibrated,
        heuristic    = EXCLUDED.heuristic,
        n            = EXCLUDED.n,
        confidence   = EXCLUDED.confidence,
        computed_at  = EXCLUDED.computed_at,
        next_refresh = EXCLUDED.next_refresh
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION recompute_coefficient_calibration(text, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION recompute_coefficient_calibration(text, double precision, integer) TO service_role;

-- ─── 4. pg_cron schedule ─────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('recompute-coefficient-calibration');
    EXCEPTION WHEN OTHERS THEN
      -- noop; schedule may not exist yet
    END;
    PERFORM cron.schedule(
      'recompute-coefficient-calibration',
      '0 3 * * *',  -- 03:00 UTC daily
      $cmd$
        SELECT recompute_coefficient_calibration('psm.premiumPct.high', 0.22, 30);
        SELECT recompute_coefficient_calibration('psm.premiumPct.mid', 0.18, 30);
        SELECT recompute_coefficient_calibration('psm.premiumPct.low', 0.12, 30);
        SELECT recompute_coefficient_calibration('coi.wasteRate.high', 0.45, 30);
        SELECT recompute_coefficient_calibration('coi.wasteRate.low', 0.40, 30);
        SELECT recompute_coefficient_calibration('coi.compoundRate.monthly', 1.05, 50);
        SELECT recompute_coefficient_calibration('decoy.ratio.high', 2.20, 30);
        SELECT recompute_coefficient_calibration('decoy.ratio.target', 1.00, 30);
        SELECT recompute_coefficient_calibration('decoy.ratio.low', 0.60, 30);
      $cmd$
    );
  ELSE
    RAISE NOTICE 'pg_cron not available; coefficient calibration will run on-demand only';
  END IF;
END;
$$;

COMMENT ON TABLE coefficient_observations IS
  'Wave-2 empirical-validation backbone. Each row is a (predicted, actual) pair captured from real user outcomes; recompute_coefficient_calibration() aggregates these into coefficient_calibrated.';
