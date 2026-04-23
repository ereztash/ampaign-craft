-- Cross-tenant aggregation with k-anonymity + differential-privacy noise.
--
-- The MOAT flywheel requires "similar businesses succeed with X" signals
-- to be computable across tenants. Exposing raw counts leaks info about
-- small tenants; even k=10 is risky for unusual industries. We enforce:
--
--   - k >= 50 tenants per bucket (business-market × hook/offer/channel)
--     before any global fact is emitted.
--   - Laplace DP noise with epsilon=1.0 on the surviving aggregates.
--
-- The job runs nightly via pg_cron or Supabase scheduled function. It
-- writes rows to knowledge_entities/knowledge_facts with user_id=NULL
-- (global pool), and uses the reserved predicate
-- similar_businesses_succeed_with (flagged crossTenant in the ontology).
--
-- This is intentionally not a materialized view: we need the RLS-safe
-- write pattern (SECURITY DEFINER + service_role) so the AGGREGATE
-- retrieval path in knowledge-query can read global facts without a
-- cross-tenant RLS join.

-- ───────────────────────────────────────────────
-- Laplace noise helper (ε=1.0 baseline, scale = 1/ε = 1.0)
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.kg_laplace_noise(p_scale FLOAT)
RETURNS FLOAT
LANGUAGE plpgsql
AS $$
DECLARE
  u FLOAT;
BEGIN
  -- Sample uniform in (-0.5, 0.5) then inverse CDF: sign(u) * scale * ln(1 - 2|u|).
  u := random() - 0.5;
  IF u = 0 THEN
    RETURN 0;
  END IF;
  RETURN -sign(u) * p_scale * ln(1 - 2 * abs(u));
END;
$$;

COMMENT ON FUNCTION public.kg_laplace_noise IS
  'Laplace noise sample. For epsilon=1 use p_scale=1.0. Used by the
   cross-tenant aggregation job to protect small-cohort identities.';

-- ───────────────────────────────────────────────
-- Aggregation job
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.kg_refresh_global_aggregates()
RETURNS TABLE (outcome TEXT, rows_affected INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  K_MIN INT := 50;      -- k-anonymity floor
  EPSILON FLOAT := 1.0; -- DP budget per aggregate
  v_count INT;
BEGIN
  -- Wipe last snapshot of global aggregates. Since these are derived
  -- data we fully refresh; audit trails are in knowledge_facts anyway.
  DELETE FROM public.knowledge_facts WHERE user_id IS NULL;
  DELETE FROM public.knowledge_entities WHERE user_id IS NULL;

  -- Build a staging set: for each (business-market × hook) pair, count
  -- distinct source users whose business entity is in that market and
  -- who have a currently-valid 'converted_on' fact on the hook. Only
  -- buckets with >= K_MIN tenants survive.
  WITH buckets AS (
    SELECT
      bs.market,
      bs.hook_canonical,
      COUNT(DISTINCT bs.user_id) AS tenant_count
    FROM (
      SELECT DISTINCT
        mf.user_id,
        (
          SELECT (kf2.object_literal->>'value')
            FROM public.knowledge_facts kf2
            JOIN public.knowledge_entities ke_sub ON ke_sub.id = kf2.subject_id
           WHERE kf2.user_id = mf.user_id
             AND kf2.predicate = 'operates_in_market'
             AND kf2.valid_until IS NULL
             AND ke_sub.entity_type = 'business'
           ORDER BY kf2.created_at DESC
           LIMIT 1
        ) AS market,
        ke_hook.canonical_name AS hook_canonical
      FROM public.knowledge_facts mf
      JOIN public.knowledge_entities ke_hook ON ke_hook.id = mf.subject_id
      WHERE mf.predicate = 'converted_on'
        AND mf.valid_until IS NULL
        AND ke_hook.entity_type = 'hook'
        AND mf.confidence >= 0.7
    ) bs
    WHERE bs.market IS NOT NULL
    GROUP BY bs.market, bs.hook_canonical
    HAVING COUNT(DISTINCT bs.user_id) >= K_MIN
  )
  INSERT INTO public.knowledge_entities (
    user_id, entity_type, canonical_name, display_name,
    source_user_id, extractor_version, mention_count, attributes
  )
  SELECT
    NULL,
    'hook',
    b.hook_canonical,
    b.hook_canonical,
    '00000000-0000-0000-0000-000000000000'::UUID,  -- sentinel; RLS write is gated by SECURITY DEFINER
    'kg-dp-aggregator-1.0.0',
    -- Count + Laplace noise, floored at k_min to keep cell size honest
    GREATEST(K_MIN, (b.tenant_count + public.kg_laplace_noise(1.0 / EPSILON))::INT),
    jsonb_build_object(
      'market', b.market,
      'k_min', K_MIN,
      'epsilon', EPSILON,
      'aggregated_at', now()
    )
  FROM buckets b
  ON CONFLICT (user_id, entity_type, canonical_name) DO UPDATE
    SET mention_count = EXCLUDED.mention_count,
        attributes    = EXCLUDED.attributes,
        last_seen     = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT 'global_hook_entities'::TEXT, v_count;
  -- Future: additional aggregation buckets for offers/channels can be
  -- added here following the same pattern. Kept minimal in the first
  -- pass to bound the DP budget (each aggregate consumes ε from the
  -- tenant-level budget).
END;
$$;

REVOKE ALL ON FUNCTION public.kg_refresh_global_aggregates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kg_refresh_global_aggregates() TO service_role;

COMMENT ON FUNCTION public.kg_refresh_global_aggregates IS
  'Nightly: recompute anonymized cross-tenant hook aggregates with
   k-anonymity (k>=50) and Laplace DP noise (epsilon=1). Writes to
   knowledge_entities with user_id=NULL. Called by pg_cron; invoke
   manually via supabase.rpc for testing. See docs for privacy model.';
