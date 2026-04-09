-- ═══════════════════════════════════════════════
-- Vector Search — pgvector setup for semantic search
-- Enables similarity search across all generated content.
-- ═══════════════════════════════════════════════

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Content embeddings: stores vector representations of plan content
CREATE TABLE IF NOT EXISTS content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES saved_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'funnel_stage', 'hook', 'copy_formula', 'tip', 'research_finding'
  content_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- IVFFlat index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_content_embeddings_vector
  ON content_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_content_embeddings_user
  ON content_embeddings (user_id);

CREATE INDEX IF NOT EXISTS idx_content_embeddings_plan
  ON content_embeddings (plan_id);

CREATE INDEX IF NOT EXISTS idx_content_embeddings_type
  ON content_embeddings (content_type);

-- Code embeddings: stores vector representations of codebase
-- Used by developer tools and QA agents for codebase comprehension
CREATE TABLE IF NOT EXISTS code_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  chunk_type TEXT NOT NULL, -- 'function', 'class', 'interface', 'component', 'hook', 'engine'
  chunk_name TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- dependencies, params, return type, line numbers
  embedding VECTOR(1536),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_code_embeddings_vector
  ON code_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

CREATE INDEX IF NOT EXISTS idx_code_embeddings_path
  ON code_embeddings (file_path);

CREATE INDEX IF NOT EXISTS idx_code_embeddings_type
  ON code_embeddings (chunk_type);

-- ═══════════════════════════════════════════════
-- SIMILARITY SEARCH FUNCTION
-- ═══════════════════════════════════════════════

-- Search similar content for a given user
CREATE OR REPLACE FUNCTION match_content(
  query_embedding VECTOR(1536),
  match_user_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  plan_id UUID,
  content_type TEXT,
  content_text TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.plan_id,
    ce.content_type,
    ce.content_text,
    ce.metadata,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM content_embeddings ce
  WHERE ce.user_id = match_user_id
    AND (filter_type IS NULL OR ce.content_type = filter_type)
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Search similar code chunks (for developer tools)
CREATE OR REPLACE FUNCTION match_code(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  file_path TEXT,
  chunk_type TEXT,
  chunk_name TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.file_path,
    ce.chunk_type,
    ce.chunk_name,
    ce.content,
    ce.metadata,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM code_embeddings ce
  WHERE (filter_type IS NULL OR ce.chunk_type = filter_type)
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════

ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_embeddings ENABLE ROW LEVEL SECURITY;

-- Content: users can only access their own embeddings
CREATE POLICY "Users manage own content embeddings"
  ON content_embeddings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Code: readable by authenticated users (shared codebase)
CREATE POLICY "Code embeddings readable by authenticated users"
  ON code_embeddings FOR SELECT
  TO authenticated
  USING (true);
