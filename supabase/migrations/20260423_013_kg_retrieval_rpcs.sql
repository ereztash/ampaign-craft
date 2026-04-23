-- Retrieval RPCs for the knowledge-query edge function.
--
-- Two functions:
--   1. match_kg_entities_v1 — pgvector similarity search on
--      knowledge_entities with optional global-rows fallback.
--   2. reset_ivfflat_maintenance — placeholder for a future scheduled
--      VACUUM ANALYZE of the hnsw-indexed tables; keeps the job
--      registration alongside the schema so the cron script can call
--      `supabase.rpc('reset_ivfflat_maintenance')` without surprise.
--
-- Both are SECURITY DEFINER and granted only to service_role so the
-- edge function controls all retrieval; user JWTs never call them
-- directly (they read through RLS-filtered SELECTs).

CREATE OR REPLACE FUNCTION public.match_kg_entities_v1(
  p_user_id UUID,
  p_query_embedding vector(1536),
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

COMMENT ON FUNCTION public.match_kg_entities_v1 IS
  'HNSW cosine-similarity lookup on knowledge_entities. Used by
   knowledge-query edge function as the seed-entity fan-out. Set
   p_allow_global=true only for AGGREGATE intent queries.';
