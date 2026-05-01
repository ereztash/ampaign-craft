-- ─────────────────────────────────────────────────────────────────────────────
-- Coach insights → knowledge_facts batch extractor
--
-- Mapping (orthogonal, no cross-domain bleed):
--   goal      → predicate 'plans_to'
--   objection → predicate 'resists_objection'
--   pain      → predicate 'experiences_pain'
--   context   → SKIP (ephemeral, never written to knowledge_facts)
--
-- Call:  SELECT public.extract_coach_insights('<user_id>');
-- Returns the count of new knowledge_facts rows inserted.
--
-- Idempotent: skips any coach_message already linked as evidence.
-- Temporal: sets valid_until on any prior fact with the same predicate
--           before inserting the new one (soft supersede).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.extract_coach_insights(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_msg       RECORD;
  v_entity_id UUID;
  v_pred      TEXT;
  v_etype     TEXT;
  v_processed INTEGER := 0;
BEGIN
  FOR v_msg IN
    SELECT cm.id,
           cm.content,
           cm.insight_type,
           cm.conversation_id,
           cm.created_at
    FROM   public.coach_messages cm
    WHERE  cm.user_id    = p_user_id
      AND  cm.role       = 'user'
      AND  cm.insight_type IN ('goal', 'objection', 'pain')
      AND  NOT EXISTS (
             SELECT 1
             FROM   public.knowledge_facts kf
             WHERE  kf.evidence_source_table = 'ai_coach_message'
               AND  kf.evidence_source_id   = cm.id
               AND  kf.user_id              = p_user_id
           )
    ORDER BY cm.created_at ASC
  LOOP
    -- Map insight_type → predicate + entity_type
    v_pred  := CASE v_msg.insight_type
                 WHEN 'goal'      THEN 'plans_to'
                 WHEN 'objection' THEN 'resists_objection'
                 WHEN 'pain'      THEN 'experiences_pain'
               END;
    v_etype := CASE v_msg.insight_type
                 WHEN 'goal'      THEN 'offer'
                 WHEN 'objection' THEN 'objection'
                 WHEN 'pain'      THEN 'pain'
               END;

    -- Find-or-create knowledge entity for this message content
    INSERT INTO public.knowledge_entities (
      user_id, entity_type, canonical_name,
      source_user_id, extractor_version
    )
    VALUES (
      p_user_id,
      v_etype,
      left(v_msg.content, 200),
      p_user_id,
      'coach-extractor-v1'
    )
    ON CONFLICT (user_id, entity_type, canonical_name)
    DO UPDATE SET
      mention_count   = knowledge_entities.mention_count + 1,
      last_seen       = now()
    RETURNING id INTO v_entity_id;

    -- Soft-supersede any still-valid prior fact with the same predicate
    UPDATE public.knowledge_facts
    SET    valid_until = now()
    WHERE  user_id    = p_user_id
      AND  predicate  = v_pred
      AND  valid_until IS NULL;

    -- Insert the new fact
    INSERT INTO public.knowledge_facts (
      user_id,
      subject_id,
      predicate,
      object_literal,
      confidence,
      evidence_source_table,
      evidence_source_id,
      evidence_quote,
      extracted_by,
      extractor_version
    )
    VALUES (
      p_user_id,
      v_entity_id,
      v_pred,
      jsonb_build_object(
        'text',            v_msg.content,
        'conversation_id', v_msg.conversation_id::text,
        'insight_type',    v_msg.insight_type
      ),
      0.7,                          -- moderate confidence: inferred from chat, not verified
      'ai_coach_message',
      v_msg.id,
      left(v_msg.content, 500),
      'extract_coach_insights',
      'v1'
    );

    v_processed := v_processed + 1;
  END LOOP;

  RETURN v_processed;
END;
$$;

-- Allow authenticated users to call this for their own data only.
-- The function is SECURITY DEFINER so it can write to knowledge_facts
-- regardless of RLS; the p_user_id = auth.uid() guard enforces isolation.
REVOKE ALL ON FUNCTION public.extract_coach_insights(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.extract_coach_insights(UUID) TO authenticated;

COMMENT ON FUNCTION public.extract_coach_insights IS
  'Batch-extracts coach_messages (goal/objection/pain) into knowledge_facts.
   Call after each conversation is closed or on a scheduled cron.
   Returns count of new rows inserted. Idempotent.';
