-- Contradiction reconciliation for knowledge_facts (Graphiti pattern).
--
-- When a new fact lands that references the SAME (subject_id, predicate)
-- as an existing currently-valid fact, we don't DELETE/UPDATE — we mark
-- the old one as superseded (valid_until = now(), superseded_by = new_id)
-- and insert the new one. This preserves the full audit trail.
--
-- Four possible outcomes, decided here in one transaction:
--
--   new:           no prior fact on this (subject, predicate, object-key)
--   duplicate:     same object AND confidence delta <= 0.05 -> bump
--                  reference_count on existing, skip insert.
--   update:        same subject/predicate but different object_id /
--                  object_literal -> insert new; if existing confidence
--                  is lower OR 14 days older, supersede it.
--   contradiction: explicit "valid_until = now()" path when the caller
--                  passes mode='contradict'. Kept explicit so an LLM
--                  reconciler can gate on its own classification before
--                  the DB action.
--
-- The caller (extract-knowledge or reconcile-knowledge edge function)
-- first inserts entities via the existing upsert, then calls this RPC
-- for each candidate fact. Atomicity comes from the single-statement
-- CTE below.

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
  p_mode TEXT DEFAULT 'auto' -- 'auto' | 'contradict' | 'always_new'
)
RETURNS TABLE (outcome TEXT, fact_id UUID, superseded UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_new_id UUID;
  v_outcome TEXT;
  v_superseded UUID;
BEGIN
  IF p_mode NOT IN ('auto', 'contradict', 'always_new') THEN
    RAISE EXCEPTION 'invalid mode: %', p_mode;
  END IF;

  -- Look up the most recent currently-valid fact with the same
  -- (user_id, subject_id, predicate). object identity varies:
  --   - for entity objects we compare object_id
  --   - for literal objects we compare object_literal JSONB equality
  SELECT id, object_id, object_literal, confidence, created_at
    INTO v_existing
    FROM public.knowledge_facts
   WHERE user_id = p_user_id
     AND subject_id = p_subject_id
     AND predicate = p_predicate
     AND valid_until IS NULL
   ORDER BY created_at DESC
   LIMIT 1;

  -- Mode: always_new. Supersede any existing same-(s,p) fact unconditionally.
  IF p_mode = 'always_new' AND FOUND THEN
    UPDATE public.knowledge_facts
       SET valid_until = now()
     WHERE id = v_existing.id;
    v_superseded := v_existing.id;
  END IF;

  -- Mode: contradict. Mark existing invalid, don't insert new — caller
  -- used this mode to drop the old fact without adding a replacement.
  IF p_mode = 'contradict' AND FOUND THEN
    UPDATE public.knowledge_facts
       SET valid_until = now()
     WHERE id = v_existing.id;
    RETURN QUERY SELECT 'contradiction'::TEXT, NULL::UUID, v_existing.id;
    RETURN;
  END IF;

  -- Mode: auto. Compare object + confidence.
  IF p_mode = 'auto' AND FOUND THEN
    -- Same object?
    IF (v_existing.object_id IS NOT DISTINCT FROM p_object_id)
       AND (v_existing.object_literal IS NOT DISTINCT FROM p_object_literal) THEN
      -- Same object. Treat as reinforcement (duplicate) if confidence
      -- is within 0.05, bump reference_count and return.
      IF ABS(v_existing.confidence - p_confidence) <= 0.05 THEN
        UPDATE public.knowledge_facts
           SET reference_count = reference_count + 1,
               last_referenced_at = now()
         WHERE id = v_existing.id;
        RETURN QUERY SELECT 'duplicate'::TEXT, v_existing.id, NULL::UUID;
        RETURN;
      END IF;
      -- Same object but meaningfully different confidence. Supersede
      -- so the later measurement wins.
      UPDATE public.knowledge_facts
         SET valid_until = now()
       WHERE id = v_existing.id;
      v_superseded := v_existing.id;
      v_outcome := 'update';
    ELSE
      -- Different object. Supersede only when the new fact is
      -- more confident OR the existing one is >= 14 days old. This
      -- avoids thrashing between low-confidence disagreements.
      IF p_confidence > v_existing.confidence
         OR v_existing.created_at < now() - INTERVAL '14 days' THEN
        UPDATE public.knowledge_facts
           SET valid_until = now()
         WHERE id = v_existing.id;
        v_superseded := v_existing.id;
        v_outcome := 'update';
      ELSE
        -- Keep existing; return a soft reject so the caller can log it.
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

  -- Back-link the superseded fact -> new fact id.
  IF v_superseded IS NOT NULL THEN
    UPDATE public.knowledge_facts
       SET superseded_by = v_new_id
     WHERE id = v_superseded;
  END IF;

  IF v_outcome IS NULL THEN
    v_outcome := 'new';
  END IF;

  RETURN QUERY SELECT v_outcome, v_new_id, v_superseded;
END;
$$;

REVOKE ALL ON FUNCTION public.kg_reconcile_and_insert_fact(
  UUID, UUID, TEXT, UUID, JSONB, FLOAT, TEXT, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kg_reconcile_and_insert_fact(
  UUID, UUID, TEXT, UUID, JSONB, FLOAT, TEXT, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT
) TO service_role;

COMMENT ON FUNCTION public.kg_reconcile_and_insert_fact IS
  'Atomic contradiction reconciliation for knowledge_facts. Called by the
   extract-knowledge and reconcile-knowledge edge functions. Returns
   outcome in {new, duplicate, update, contradiction, kept_existing}.';
