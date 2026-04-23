-- Engagement-based decay for knowledge_facts.
--
-- Facts that nobody ever retrieves should not influence answers. We
-- compute a decay score per fact and archive (valid_until = now())
-- facts that drop below a threshold:
--
--   relevance = exp(-age_days / half_life) * log2(1 + reference_count)
--
-- Half-life depends on entity_type (offers churn fast, audiences
-- churn slowly). Formula from Mem0 + Notion AI operational posts
-- (2024-2025). Values tuned conservatively on first pass.
--
-- Runs nightly. Archive is non-destructive — we set valid_until so the
-- audit trail is intact; decay is reversible in case we misjudged.

-- Half-life per subject entity_type (days). Tuned per research:
--   offer/hook/channel: short — 30 days (campaign cycle)
--   metric:             mid   — 60 days
--   audience/persona:   long  — 180 days
--   business/product:   very long — 365 days (structural)
--   others:             90 days default

CREATE OR REPLACE FUNCTION public.kg_decay_half_life_days(p_entity_type TEXT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_entity_type
    WHEN 'offer'     THEN 30
    WHEN 'hook'      THEN 30
    WHEN 'channel'   THEN 30
    WHEN 'metric'    THEN 60
    WHEN 'audience'  THEN 180
    WHEN 'persona'   THEN 180
    WHEN 'pain'      THEN 180
    WHEN 'objection' THEN 180
    WHEN 'business'  THEN 365
    WHEN 'product'   THEN 365
    WHEN 'competitor'THEN 180
    ELSE 90
  END;
$$;

-- Decay score. Higher is more relevant.
-- Note: log2(1 + 0) = 0 for never-referenced facts, so the score
-- collapses to 0 no matter the age — those facts age out aggressively
-- which is the desired behavior for the MOAT signal.
CREATE OR REPLACE FUNCTION public.kg_fact_relevance_score(
  p_age_days FLOAT,
  p_half_life INT,
  p_reference_count INT
)
RETURNS FLOAT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT exp(-ln(2) * p_age_days / GREATEST(p_half_life, 1)) *
         ln(1 + GREATEST(p_reference_count, 0)) / ln(2);
$$;

-- Archive facts whose relevance drops below 0.1. Scans only
-- currently-valid facts; writes valid_until = now() to preserve the
-- audit trail via the bi-temporal schema.
CREATE OR REPLACE FUNCTION public.kg_apply_engagement_decay()
RETURNS TABLE (archived INT, scanned INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived INT := 0;
  v_scanned  INT := 0;
  THRESHOLD FLOAT := 0.1;
  -- Grace period: facts younger than 30 days are never decayed even
  -- when reference_count=0, because the query path hasn't had enough
  -- time to surface them.
  GRACE_DAYS INT := 30;
BEGIN
  WITH to_scan AS (
    SELECT
      kf.id,
      ke.entity_type AS subject_type,
      EXTRACT(EPOCH FROM (now() - kf.created_at)) / 86400.0 AS age_days,
      kf.reference_count
    FROM public.knowledge_facts kf
    JOIN public.knowledge_entities ke ON ke.id = kf.subject_id
    WHERE kf.valid_until IS NULL
      AND kf.created_at < now() - (GRACE_DAYS || ' days')::interval
      AND kf.user_id IS NOT NULL  -- leave global DP facts alone
  ),
  scored AS (
    SELECT
      id,
      public.kg_fact_relevance_score(
        age_days,
        public.kg_decay_half_life_days(subject_type),
        reference_count
      ) AS relevance
    FROM to_scan
  ),
  to_archive AS (
    SELECT id FROM scored WHERE relevance < THRESHOLD
  ),
  archived AS (
    UPDATE public.knowledge_facts
       SET valid_until = now()
     WHERE id IN (SELECT id FROM to_archive)
       AND valid_until IS NULL
     RETURNING id
  )
  SELECT
    (SELECT COUNT(*) FROM archived)::INT,
    (SELECT COUNT(*) FROM scored)::INT
  INTO v_archived, v_scanned;

  RETURN QUERY SELECT v_archived, v_scanned;
END;
$$;

REVOKE ALL ON FUNCTION public.kg_apply_engagement_decay() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kg_apply_engagement_decay() TO service_role;

COMMENT ON FUNCTION public.kg_apply_engagement_decay IS
  'Nightly: archive (valid_until=now()) facts whose relevance score
   falls below 0.1. Relevance = exp(-ln(2) * age/half_life) *
   log2(1 + reference_count). 30-day grace period. Global (user_id
   NULL) facts are exempted. Called by pg_cron.';
