-- Knowledge graph tables for M7 knowledge-extraction overlay.
--
-- Design decisions (see docs/architecture.md + tightened strategy doc):
--
-- 1. Closed CHECK constraints on entity_type + predicate mirror
--    src/engine/optimization/graosOntology.ts. Redundant on purpose —
--    even if a misbehaving service role bypasses verifyFact(), the DB
--    refuses nonsense triples.
--
-- 2. Bi-temporal pattern (Graphiti/Zep, arXiv:2501.13956 Jan 2025):
--    valid_from / valid_until + superseded_by edge. Contradicting facts
--    invalidate each other rather than DELETE/UPDATE — full audit
--    trail, no data loss.
--
-- 3. HNSW indexes (m=16, ef_construction=64) matching the rest of the
--    codebase (see 20260423_002_embeddings_hnsw_and_ttl.sql).
--
-- 4. RLS identical to the existing user_id=auth.uid() pattern. Global
--    anonymized entities (user_id IS NULL) readable by all authenticated
--    users but writable only via service_role, so cross-tenant
--    aggregates can only be produced by the DP-aggregation job in
--    20260423_012_kg_cross_tenant_aggregation.sql.
--
-- 5. Provenance is mandatory: source_user_id, source_table/source_id on
--    the evidence, extractor_version. Enables blast-radius rollback if a
--    bad extractor version lands.
--
-- 6. Engagement telemetry columns (reference_count, last_referenced_at)
--    feed the decay job in the final migration — facts nobody retrieves
--    have their confidence decayed.

-- ───────────────────────────────────────────────
-- knowledge_entities
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.knowledge_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = anonymized global
  entity_type TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  display_name TEXT,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  source_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_doc_id UUID,
  extractor_version TEXT NOT NULL,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  mention_count INT NOT NULL DEFAULT 1,
  CONSTRAINT knowledge_entities_type_check CHECK (entity_type IN (
    'business','product','audience','channel','offer',
    'pain','objection','hook','metric','competitor','persona'
  )),
  CONSTRAINT knowledge_entities_canonical_shape CHECK (
    char_length(canonical_name) BETWEEN 1 AND 200
  ),
  CONSTRAINT knowledge_entities_mention_nonneg CHECK (mention_count >= 0),
  CONSTRAINT knowledge_entities_unique_per_user UNIQUE (user_id, entity_type, canonical_name)
);

-- Per-user lookups dominate; per-type too when listing all audiences etc.
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_user_type
  ON public.knowledge_entities (user_id, entity_type);

CREATE INDEX IF NOT EXISTS idx_knowledge_entities_source_user
  ON public.knowledge_entities (source_user_id);

-- HNSW for fuzzy entity resolution / similarity search.
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_embedding_hnsw
  ON public.knowledge_entities
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ───────────────────────────────────────────────
-- knowledge_facts (bi-temporal)
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.knowledge_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = anonymized global
  subject_id UUID NOT NULL REFERENCES public.knowledge_entities(id) ON DELETE CASCADE,
  predicate TEXT NOT NULL,
  object_id UUID REFERENCES public.knowledge_entities(id) ON DELETE SET NULL,
  object_literal JSONB,
  confidence FLOAT NOT NULL,
  -- Bi-temporal
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,                                -- NULL = currently valid
  transaction_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  superseded_by UUID REFERENCES public.knowledge_facts(id) ON DELETE SET NULL,
  -- Evidence & provenance (all required)
  evidence_source_table TEXT NOT NULL,
  evidence_source_id UUID NOT NULL,
  evidence_quote TEXT NOT NULL,
  extracted_by TEXT NOT NULL,
  extractor_version TEXT NOT NULL,
  -- GRAOS context snapshots
  dapl_snapshot JSONB,
  regime TEXT,
  -- Engagement telemetry (decay job reads these)
  reference_count INT NOT NULL DEFAULT 0,
  last_referenced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_facts_predicate_check CHECK (predicate IN (
    'has_product','targets_audience','operates_in_market','competes_with',
    'converted_on','failed_with','improved_metric',
    'exhibits_archetype','resists_objection','prefers_tone','experiences_pain',
    'plans_to','blocked_by',
    'similar_businesses_succeed_with'
  )),
  CONSTRAINT knowledge_facts_confidence_range CHECK (confidence BETWEEN 0 AND 1),
  CONSTRAINT knowledge_facts_regime_check CHECK (
    regime IS NULL OR regime IN ('stable','transitional','crisis')
  ),
  CONSTRAINT knowledge_facts_evidence_table CHECK (evidence_source_table IN (
    'shared_context','saved_plans','differentiation_results','user_form_data',
    'ai_coach_message','meta_insights','import'
  )),
  CONSTRAINT knowledge_facts_evidence_quote_len CHECK (
    char_length(evidence_quote) BETWEEN 1 AND 500
  ),
  CONSTRAINT knowledge_facts_object_present CHECK (
    (object_id IS NOT NULL) OR (object_literal IS NOT NULL)
  ),
  CONSTRAINT knowledge_facts_reference_count_nonneg CHECK (reference_count >= 0)
);

-- Hot path: "give me the currently valid facts about X for this user".
CREATE INDEX IF NOT EXISTS idx_knowledge_facts_user_subject_valid
  ON public.knowledge_facts (user_id, subject_id)
  WHERE valid_until IS NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_facts_predicate
  ON public.knowledge_facts (predicate, user_id)
  WHERE valid_until IS NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_facts_object
  ON public.knowledge_facts (object_id)
  WHERE object_id IS NOT NULL AND valid_until IS NULL;

-- Audit / decay job needs to scan by last_referenced_at.
CREATE INDEX IF NOT EXISTS idx_knowledge_facts_last_ref
  ON public.knowledge_facts (last_referenced_at NULLS FIRST)
  WHERE valid_until IS NULL;

-- ───────────────────────────────────────────────
-- answer_cards (semantic cache)
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.answer_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_embedding vector(1536) NOT NULL,
  question_canonical TEXT NOT NULL,
  intent TEXT NOT NULL,
  answer_structure JSONB NOT NULL,
  supporting_fact_ids UUID[] NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds INT NOT NULL DEFAULT 86400,
  access_count INT NOT NULL DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  CONSTRAINT answer_cards_intent_check CHECK (intent IN (
    'LOOKUP','AGGREGATE','REASON','GENERATE','META'
  )),
  CONSTRAINT answer_cards_question_len CHECK (
    char_length(question_canonical) BETWEEN 1 AND 500
  ),
  CONSTRAINT answer_cards_ttl_positive CHECK (ttl_seconds > 0),
  CONSTRAINT answer_cards_access_count_nonneg CHECK (access_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_answer_cards_user_intent
  ON public.answer_cards (user_id, intent);

CREATE INDEX IF NOT EXISTS idx_answer_cards_embedding_hnsw
  ON public.answer_cards
  USING hnsw (question_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Expiry = computed_at + ttl_seconds; a partial expression index isn't
-- possible with interval math so the cleanup function below handles it.

-- ───────────────────────────────────────────────
-- Row-level security
-- ───────────────────────────────────────────────

ALTER TABLE public.knowledge_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_facts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_cards       ENABLE ROW LEVEL SECURITY;

-- Entities: user sees own + anonymized global (NULL user_id). Only
-- service_role can write global rows (via DP-aggregation job).
DROP POLICY IF EXISTS knowledge_entities_select_own_or_global ON public.knowledge_entities;
CREATE POLICY knowledge_entities_select_own_or_global
  ON public.knowledge_entities FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS knowledge_entities_insert_own ON public.knowledge_entities;
CREATE POLICY knowledge_entities_insert_own
  ON public.knowledge_entities FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND source_user_id = auth.uid());

DROP POLICY IF EXISTS knowledge_entities_update_own ON public.knowledge_entities;
CREATE POLICY knowledge_entities_update_own
  ON public.knowledge_entities FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can SELECT all for moderation/rollback.
DROP POLICY IF EXISTS knowledge_entities_admin_select ON public.knowledge_entities;
CREATE POLICY knowledge_entities_admin_select
  ON public.knowledge_entities FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Facts: same shape. No cross-user read; global anonymized facts live
-- with user_id IS NULL and are readable by any authenticated user.
DROP POLICY IF EXISTS knowledge_facts_select_own_or_global ON public.knowledge_facts;
CREATE POLICY knowledge_facts_select_own_or_global
  ON public.knowledge_facts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS knowledge_facts_insert_own ON public.knowledge_facts;
CREATE POLICY knowledge_facts_insert_own
  ON public.knowledge_facts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS knowledge_facts_update_own ON public.knowledge_facts;
CREATE POLICY knowledge_facts_update_own
  ON public.knowledge_facts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS knowledge_facts_admin_select ON public.knowledge_facts;
CREATE POLICY knowledge_facts_admin_select
  ON public.knowledge_facts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- answer_cards is strictly per-user; no global cards.
DROP POLICY IF EXISTS answer_cards_own ON public.answer_cards;
CREATE POLICY answer_cards_own
  ON public.answer_cards FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ───────────────────────────────────────────────
-- Helper RPCs
-- ───────────────────────────────────────────────

-- Mark a fact as referenced. Called by knowledge-query after the fact is
-- cited in a synthesized answer. SECURITY DEFINER because the caller is
-- the service-role edge function on behalf of a user; we still enforce
-- the user match by parameter.
CREATE OR REPLACE FUNCTION public.kg_mark_fact_referenced(
  p_fact_id UUID,
  p_user_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.knowledge_facts
     SET reference_count = reference_count + 1,
         last_referenced_at = now()
   WHERE id = p_fact_id
     AND (user_id = p_user_id OR user_id IS NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.kg_mark_fact_referenced(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kg_mark_fact_referenced(UUID, UUID) TO service_role;

-- Match answer cards by question embedding similarity. RLS handles
-- tenancy; the function just applies a cosine-distance threshold and
-- TTL filter in one query.
CREATE OR REPLACE FUNCTION public.match_answer_card(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_intent TEXT,
  p_similarity_threshold FLOAT DEFAULT 0.95
) RETURNS SETOF public.answer_cards
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.answer_cards
   WHERE user_id = p_user_id
     AND intent = p_intent
     AND computed_at + (ttl_seconds || ' seconds')::interval > now()
     AND 1 - (question_embedding <=> p_query_embedding) >= p_similarity_threshold
   ORDER BY question_embedding <=> p_query_embedding ASC
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.match_answer_card(UUID, vector, TEXT, FLOAT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_answer_card(UUID, vector, TEXT, FLOAT) TO service_role;

-- Cleanup of stale answer cards (older than ttl). Called by pg_cron.
CREATE OR REPLACE FUNCTION public.cleanup_expired_answer_cards()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM public.answer_cards
   WHERE computed_at + (ttl_seconds || ' seconds')::interval < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_answer_cards() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_answer_cards() TO service_role;
