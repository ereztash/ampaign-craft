-- M7 hardening: data/metadata separation + race-condition guard + FTS +
-- Realtime + DP-aggregator FK fix + batch ref-marking RPC.
--
-- Driven by edge-case testing on the live project which surfaced:
--   (a) two concurrent reconcile calls on the same (user, subject,
--       predicate) could both land — no guard on "at most one valid
--       row per s+p".
--   (b) reference_count / last_referenced_at bumps write-amplify the
--       main knowledge_facts row and maintain idx_knowledge_facts_last_ref
--       every time a fact is cited — HOT updates lost.
--   (c) synthesizer calls mark-referenced once per cited fact
--       (N round-trips per answer).
--   (d) DP aggregator writes global rows with a sentinel source_user_id
--       that doesn't exist in auth.users — FK violation once k>=50.
--   (e) no full-text path for "find entity canonically named X" —
--       HNSW handles semantic only.
--   (f) Realtime not wired for knowledge_facts so the Business Twin UI
--       can't live-update.

-- ───────────────────────────────────────────────
-- 1. Split engagement telemetry off the main table
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.knowledge_fact_engagement (
  fact_id UUID PRIMARY KEY REFERENCES public.knowledge_facts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference_count INT NOT NULL DEFAULT 0,
  last_referenced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_fact_engagement_refcount_nonneg CHECK (reference_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_kfe_user_last_ref
  ON public.knowledge_fact_engagement (user_id, last_referenced_at NULLS FIRST);

-- Backfill from the legacy columns for any existing rows (0 in prod
-- right now, but future-proof).
INSERT INTO public.knowledge_fact_engagement (fact_id, user_id, reference_count, last_referenced_at)
  SELECT id, user_id, reference_count, last_referenced_at
    FROM public.knowledge_facts
   WHERE user_id IS NOT NULL
     AND reference_count > 0
  ON CONFLICT (fact_id) DO NOTHING;

-- Drop the high-churn columns + their index from the main table so
-- citation bumps never rewrite knowledge_facts rows.
DROP INDEX IF EXISTS public.idx_knowledge_facts_last_ref;
ALTER TABLE public.knowledge_facts DROP COLUMN IF EXISTS reference_count;
ALTER TABLE public.knowledge_facts DROP COLUMN IF EXISTS last_referenced_at;

ALTER TABLE public.knowledge_fact_engagement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kfe_select_own ON public.knowledge_fact_engagement;
CREATE POLICY kfe_select_own
  ON public.knowledge_fact_engagement FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS kfe_admin_select ON public.knowledge_fact_engagement;
CREATE POLICY kfe_admin_select
  ON public.knowledge_fact_engagement FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
-- Only service_role writes (no INSERT/UPDATE policy for authenticated).

-- ───────────────────────────────────────────────
-- 2. Race-condition guard: at most one currently-valid fact per
-- (user, subject, predicate). Concurrent reconcile RPCs that slip
-- between the SELECT and INSERT will have the second one fail with
-- unique_violation; the caller retries the reconcile.
-- ───────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_facts_one_valid_per_sp
  ON public.knowledge_facts (user_id, subject_id, predicate)
  WHERE valid_until IS NULL;

-- ───────────────────────────────────────────────
-- 3. Advisory lock inside reconcile RPC to serialize same-(s,p)
-- callers and avoid the retry dance when we can just wait briefly.
-- Also: rewrite to use the new engagement table, and gracefully
-- handle the unique_violation if a concurrent writer beats us.
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.kg_reconcile_and_insert_fact(
  p_user_id UUID,
  p_subject_id UUID,
  p_predicate TEXT,
  p_object_id UUID,
  p_object_literal JSONB,
  p_confidence FLOAT,
  p_evidence_source_table TEXT,
  p_evidence_source_id UUID,
  p_evidence_quote TEXT,
  p_extracted_by TEXT,
  p_extractor_version TEXT,
  p_dapl_snapshot JSONB DEFAULT NULL,
  p_regime TEXT DEFAULT NULL,
  p_mode TEXT DEFAULT 'auto'
)
RETURNS TABLE (outcome TEXT, fact_id UUID, superseded UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_existing RECORD;
  v_new_id UUID;
  v_outcome TEXT;
  v_superseded UUID;
  v_lock_key BIGINT;
BEGIN
  IF p_mode NOT IN ('auto', 'contradict', 'always_new') THEN
    RAISE EXCEPTION 'invalid mode: %', p_mode;
  END IF;

  -- Advisory xact lock keyed on (user, subject, predicate). Callers on
  -- the same triple wait rather than race; callers on different triples
  -- are unaffected. Key is a hash of the three-tuple.
  v_lock_key := hashtextextended(p_user_id::TEXT || p_subject_id::TEXT || p_predicate, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT id, object_id, object_literal, confidence, created_at
    INTO v_existing
    FROM public.knowledge_facts
   WHERE user_id = p_user_id
     AND subject_id = p_subject_id
     AND predicate = p_predicate
     AND valid_until IS NULL
   ORDER BY created_at DESC
   LIMIT 1;

  IF p_mode = 'always_new' AND FOUND THEN
    UPDATE public.knowledge_facts
       SET valid_until = now()
     WHERE id = v_existing.id;
    v_superseded := v_existing.id;
  END IF;

  IF p_mode = 'contradict' AND FOUND THEN
    UPDATE public.knowledge_facts
       SET valid_until = now()
     WHERE id = v_existing.id;
    RETURN QUERY SELECT 'contradiction'::TEXT, NULL::UUID, v_existing.id;
    RETURN;
  END IF;

  IF p_mode = 'auto' AND FOUND THEN
    IF (v_existing.object_id IS NOT DISTINCT FROM p_object_id)
       AND (v_existing.object_literal IS NOT DISTINCT FROM p_object_literal) THEN
      IF ABS(v_existing.confidence - p_confidence) <= 0.05 THEN
        -- Duplicate — bump engagement in the separate table.
        INSERT INTO public.knowledge_fact_engagement (fact_id, user_id, reference_count, last_referenced_at)
          VALUES (v_existing.id, p_user_id, 1, now())
          ON CONFLICT ON CONSTRAINT knowledge_fact_engagement_pkey DO UPDATE
            SET reference_count = public.knowledge_fact_engagement.reference_count + 1,
                last_referenced_at = now(),
                updated_at = now();
        RETURN QUERY SELECT 'duplicate'::TEXT, v_existing.id, NULL::UUID;
        RETURN;
      END IF;
      UPDATE public.knowledge_facts SET valid_until = now() WHERE id = v_existing.id;
      v_superseded := v_existing.id;
      v_outcome := 'update';
    ELSE
      IF p_confidence > v_existing.confidence
         OR v_existing.created_at < now() - INTERVAL '14 days' THEN
        UPDATE public.knowledge_facts SET valid_until = now() WHERE id = v_existing.id;
        v_superseded := v_existing.id;
        v_outcome := 'update';
      ELSE
        RETURN QUERY SELECT 'kept_existing'::TEXT, v_existing.id, NULL::UUID;
        RETURN;
      END IF;
    END IF;
  END IF;

  v_new_id := gen_random_uuid();
  INSERT INTO public.knowledge_facts (
    id, user_id, subject_id, predicate, object_id, object_literal,
    confidence, evidence_source_table, evidence_source_id, evidence_quote,
    extracted_by, extractor_version, dapl_snapshot, regime, superseded_by
  ) VALUES (
    v_new_id, p_user_id, p_subject_id, p_predicate, p_object_id, p_object_literal,
    p_confidence, p_evidence_source_table, p_evidence_source_id, p_evidence_quote,
    p_extracted_by, p_extractor_version, p_dapl_snapshot, p_regime, NULL
  );

  IF v_superseded IS NOT NULL THEN
    UPDATE public.knowledge_facts SET superseded_by = v_new_id WHERE id = v_superseded;
  END IF;

  IF v_outcome IS NULL THEN v_outcome := 'new'; END IF;
  RETURN QUERY SELECT v_outcome, v_new_id, v_superseded;
END;
$$;

REVOKE ALL ON FUNCTION public.kg_reconcile_and_insert_fact(
  UUID, UUID, TEXT, UUID, JSONB, FLOAT, TEXT, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kg_reconcile_and_insert_fact(
  UUID, UUID, TEXT, UUID, JSONB, FLOAT, TEXT, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT
) TO service_role;

-- ───────────────────────────────────────────────
-- 4. Rewrite kg_mark_fact_referenced to write the engagement table
-- and add a batch variant for the synthesizer hot path.
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.kg_mark_fact_referenced(
  p_fact_id UUID,
  p_user_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.knowledge_fact_engagement (fact_id, user_id, reference_count, last_referenced_at)
    VALUES (p_fact_id, p_user_id, 1, now())
    ON CONFLICT ON CONSTRAINT knowledge_fact_engagement_pkey DO UPDATE
      SET reference_count = public.knowledge_fact_engagement.reference_count + 1,
          last_referenced_at = now(),
          updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.kg_mark_facts_referenced_batch(
  p_fact_ids UUID[],
  p_user_id UUID
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected INT;
BEGIN
  INSERT INTO public.knowledge_fact_engagement (fact_id, user_id, reference_count, last_referenced_at)
    SELECT unnest(p_fact_ids), p_user_id, 1, now()
    ON CONFLICT ON CONSTRAINT knowledge_fact_engagement_pkey DO UPDATE
      SET reference_count = public.knowledge_fact_engagement.reference_count + 1,
          last_referenced_at = now(),
          updated_at = now();
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END;
$$;

REVOKE ALL ON FUNCTION public.kg_mark_facts_referenced_batch(UUID[], UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kg_mark_facts_referenced_batch(UUID[], UUID) TO service_role;

-- ───────────────────────────────────────────────
-- 5. Decay job reads engagement from the new table.
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.kg_apply_engagement_decay()
RETURNS TABLE (archived INT, scanned INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived INT := 0;
  v_scanned INT := 0;
  THRESHOLD FLOAT := 0.1;
  GRACE_DAYS INT := 30;
BEGIN
  WITH to_scan AS (
    SELECT
      kf.id,
      ke.entity_type AS subject_type,
      EXTRACT(EPOCH FROM (now() - kf.created_at)) / 86400.0 AS age_days,
      coalesce(kfe.reference_count, 0) AS reference_count
    FROM public.knowledge_facts kf
    JOIN public.knowledge_entities ke ON ke.id = kf.subject_id
    LEFT JOIN public.knowledge_fact_engagement kfe ON kfe.fact_id = kf.id
    WHERE kf.valid_until IS NULL
      AND kf.created_at < now() - (GRACE_DAYS || ' days')::interval
      AND kf.user_id IS NOT NULL
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
  archived_rows AS (
    UPDATE public.knowledge_facts
       SET valid_until = now()
     WHERE id IN (SELECT id FROM to_archive)
       AND valid_until IS NULL
     RETURNING id
  )
  SELECT
    (SELECT COUNT(*) FROM archived_rows)::INT,
    (SELECT COUNT(*) FROM scored)::INT
  INTO v_archived, v_scanned;
  RETURN QUERY SELECT v_archived, v_scanned;
END;
$$;

-- ───────────────────────────────────────────────
-- 6. DP aggregator: make source_user_id nullable and have global rows
-- carry NULL provenance. No more FK trap once real cohorts land.
-- ───────────────────────────────────────────────

ALTER TABLE public.knowledge_entities
  ALTER COLUMN source_user_id DROP NOT NULL;

ALTER TABLE public.knowledge_entities
  ADD CONSTRAINT knowledge_entities_source_user_id_consistent
  CHECK (
    (user_id IS NULL AND source_user_id IS NULL)
    OR (user_id IS NOT NULL AND source_user_id IS NOT NULL)
  );

-- Patch the aggregator to write NULL instead of the sentinel UUID.
CREATE OR REPLACE FUNCTION public.kg_refresh_global_aggregates()
RETURNS TABLE (outcome TEXT, rows_affected INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  K_MIN INT := 50;
  EPSILON FLOAT := 1.0;
  v_count INT;
BEGIN
  DELETE FROM public.knowledge_facts WHERE user_id IS NULL;
  DELETE FROM public.knowledge_entities WHERE user_id IS NULL;

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
    NULL,                               -- NULL provenance for global rows
    'kg-dp-aggregator-1.0.0',
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
END;
$$;

-- ───────────────────────────────────────────────
-- 7. Full-text (trigram) index on entity names for exact/partial match.
-- Complements HNSW which handles semantic similarity.
-- ───────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_knowledge_entities_canonical_trgm
  ON public.knowledge_entities
  USING gin (canonical_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_knowledge_entities_aliases_trgm
  ON public.knowledge_entities
  USING gin (aliases);  -- GIN on TEXT[] for @> containment

-- ───────────────────────────────────────────────
-- 8. Realtime publication for knowledge_facts so the Business Twin
-- UI can live-update when new facts land. REPLICA IDENTITY FULL
-- publishes the whole row (matching how cohort_benchmarks etc do it).
-- ───────────────────────────────────────────────

ALTER TABLE public.knowledge_facts REPLICA IDENTITY FULL;
ALTER TABLE public.knowledge_fact_engagement REPLICA IDENTITY FULL;

DO $pub$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_facts;
EXCEPTION WHEN duplicate_object THEN NULL; END; $pub$;

DO $pub$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_fact_engagement;
EXCEPTION WHEN duplicate_object THEN NULL; END; $pub$;

-- ───────────────────────────────────────────────
-- 9. Documentation of the immutability contract on knowledge_facts.
-- A trigger enforces that the core columns (subject, predicate, object,
-- evidence, provenance) cannot change after insert. Only valid_until
-- and superseded_by are mutable.
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.kf_enforce_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.subject_id             IS DISTINCT FROM NEW.subject_id            OR
     OLD.predicate              IS DISTINCT FROM NEW.predicate             OR
     OLD.object_id              IS DISTINCT FROM NEW.object_id             OR
     OLD.object_literal         IS DISTINCT FROM NEW.object_literal        OR
     OLD.confidence             IS DISTINCT FROM NEW.confidence            OR
     OLD.evidence_source_table  IS DISTINCT FROM NEW.evidence_source_table OR
     OLD.evidence_source_id     IS DISTINCT FROM NEW.evidence_source_id    OR
     OLD.evidence_quote         IS DISTINCT FROM NEW.evidence_quote        OR
     OLD.extracted_by           IS DISTINCT FROM NEW.extracted_by          OR
     OLD.extractor_version      IS DISTINCT FROM NEW.extractor_version     OR
     OLD.user_id                IS DISTINCT FROM NEW.user_id               OR
     OLD.created_at             IS DISTINCT FROM NEW.created_at            OR
     OLD.valid_from             IS DISTINCT FROM NEW.valid_from            OR
     OLD.dapl_snapshot          IS DISTINCT FROM NEW.dapl_snapshot         OR
     OLD.regime                 IS DISTINCT FROM NEW.regime
  THEN
    RAISE EXCEPTION 'knowledge_facts is immutable except for valid_until and superseded_by'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kf_immutability ON public.knowledge_facts;
CREATE TRIGGER trg_kf_immutability
  BEFORE UPDATE ON public.knowledge_facts
  FOR EACH ROW
  EXECUTE FUNCTION public.kf_enforce_immutability();

-- ───────────────────────────────────────────────
-- 10. Statement timeout on heavy functions. Prevents a runaway LLM
-- extractor or aggregation job from blocking the cluster.
-- ───────────────────────────────────────────────

ALTER FUNCTION public.kg_refresh_global_aggregates() SET statement_timeout = '5min';
ALTER FUNCTION public.kg_apply_engagement_decay()    SET statement_timeout = '2min';

COMMENT ON TABLE public.knowledge_facts IS
  'Bi-temporal knowledge graph. IMMUTABLE after insert except valid_until and superseded_by. Engagement telemetry lives in knowledge_fact_engagement.';

COMMENT ON TABLE public.knowledge_fact_engagement IS
  'High-churn engagement telemetry split off the main knowledge_facts table so citation bumps (reference_count / last_referenced_at) do not rewrite the core fact row or trigger main-table index maintenance.';
