-- Scale the vector store for the new web_search_result content type.
--
-- 1. Replace IVFFlat (lists=100) with HNSW. HNSW gives better recall at high
--    row counts and removes the need to retrain the index when the dataset
--    grows past the configured list count.
-- 2. Add an expires_at column and a cleanup function so ephemeral data like
--    web_search_result rows (which go stale fast) don't accumulate forever.
--    User-authored content such as funnel_stage/hook/copy_formula rows stays
--    because they're seeded with NULL expires_at.

-- ───────────────────────────────────────────────
-- content_embeddings: HNSW + TTL
-- ───────────────────────────────────────────────

ALTER TABLE content_embeddings
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_content_embeddings_expires
  ON content_embeddings (expires_at)
  WHERE expires_at IS NOT NULL;

-- Trigger that stamps a 30-day TTL on web_search_result rows at insert time.
-- Other content types keep expires_at NULL so their row lives indefinitely.
CREATE OR REPLACE FUNCTION public.set_web_search_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.content_type = 'web_search_result' AND NEW.expires_at IS NULL THEN
    NEW.expires_at = now() + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_web_search_expiry ON content_embeddings;
CREATE TRIGGER trg_set_web_search_expiry
  BEFORE INSERT ON content_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_web_search_expiry();

DROP INDEX IF EXISTS idx_content_embeddings_vector;
CREATE INDEX IF NOT EXISTS idx_content_embeddings_hnsw
  ON content_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ───────────────────────────────────────────────
-- code_embeddings: HNSW (no TTL; the codebase is curated, not user-generated)
-- ───────────────────────────────────────────────

DROP INDEX IF EXISTS idx_code_embeddings_vector;
CREATE INDEX IF NOT EXISTS idx_code_embeddings_hnsw
  ON code_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ───────────────────────────────────────────────
-- Cleanup function invoked by pg_cron / Supabase scheduled function.
-- Returns the number of rows deleted so the scheduled job can log it.
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_expired_embeddings()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM content_embeddings
  WHERE expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
