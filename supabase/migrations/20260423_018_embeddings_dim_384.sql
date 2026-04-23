-- Switch KG embeddings from 1536-dim (OpenAI text-embedding-3-small) to
-- 384-dim (Supabase built-in gte-small). No more external OpenAI key
-- required — the new path runs entirely inside the Edge Function runtime.
--
-- Tables affected:
--   knowledge_entities.embedding      vector(1536) -> vector(384)
--   answer_cards.question_embedding    vector(1536) -> vector(384)
--
-- content_embeddings is left as 1536 for now because the old path
-- (web-search-embed) still has to finish migrating separately; we only
-- touch what M7 uses.
--
-- HNSW indexes are rebuilt — can't keep an index whose base column
-- type changed. New indexes use the same (m=16, ef_construction=64)
-- tuning as elsewhere in the codebase.
--
-- Any existing rows in the KG tables are wiped: the app hasn't
-- launched this schema in front of users, and 1536-dim values are
-- incompatible with the new 384 column anyway.

-- ───────────────────────────────────────────────
-- 1. knowledge_entities
-- ───────────────────────────────────────────────

DROP INDEX IF EXISTS public.idx_knowledge_entities_embedding_hnsw;

DELETE FROM public.knowledge_entities;        -- clears residual test rows safely
ALTER TABLE public.knowledge_entities
  ALTER COLUMN embedding TYPE vector(384) USING NULL;

CREATE INDEX idx_knowledge_entities_embedding_hnsw
  ON public.knowledge_entities
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ───────────────────────────────────────────────
-- 2. answer_cards
-- ───────────────────────────────────────────────

DROP INDEX IF EXISTS public.idx_answer_cards_embedding_hnsw;

DELETE FROM public.answer_cards;              -- cache; safe to flush
ALTER TABLE public.answer_cards
  ALTER COLUMN question_embedding TYPE vector(384) USING NULL;
-- question_embedding is NOT NULL so we need to re-allow null during the
-- migration then re-block after we've truncated the table.
-- ALTER COLUMN does not remove the NOT NULL; above DELETE emptied the
-- table so we're free to change the type.

CREATE INDEX idx_answer_cards_embedding_hnsw
  ON public.answer_cards
  USING hnsw (question_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ───────────────────────────────────────────────
-- 3. Rewrite RPCs with new signature. We DROP first because the
-- parameter type changed — that's a different function signature
-- under Postgres rules.
-- ───────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.match_answer_card(UUID, vector, TEXT, FLOAT);

CREATE FUNCTION public.match_answer_card(
  p_user_id UUID,
  p_query_embedding vector(384),
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

DROP FUNCTION IF EXISTS public.match_kg_entities_v1(UUID, vector, INT, BOOLEAN);

CREATE FUNCTION public.match_kg_entities_v1(
  p_user_id UUID,
  p_query_embedding vector(384),
  p_limit INT DEFAULT 5,
  p_allow_global BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  canonical_name TEXT,
  mention_count INT,
  similarity FLOAT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ke.id,
    ke.entity_type,
    ke.canonical_name,
    ke.mention_count,
    1 - (ke.embedding <=> p_query_embedding) AS similarity
  FROM public.knowledge_entities ke
  WHERE ke.embedding IS NOT NULL
    AND (
      ke.user_id = p_user_id
      OR (p_allow_global AND ke.user_id IS NULL)
    )
  ORDER BY ke.embedding <=> p_query_embedding ASC
  LIMIT GREATEST(1, LEAST(p_limit, 20));
$$;

REVOKE ALL ON FUNCTION public.match_kg_entities_v1(UUID, vector, INT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_kg_entities_v1(UUID, vector, INT, BOOLEAN) TO service_role;

COMMENT ON COLUMN public.knowledge_entities.embedding IS
  '384-dim vector produced by Supabase.ai.Session(''gte-small'') inside the extract-knowledge / knowledge-query Edge Functions. Swapped from 1536-dim OpenAI text-embedding-3-small on 2026-04-23 to remove the OpenAI dependency.';

COMMENT ON COLUMN public.answer_cards.question_embedding IS
  '384-dim vector (Supabase gte-small). See knowledge_entities.embedding.';
