-- ========== 20260405042823_c2fb21a0-57da-49bd-8c43-a5df4cd5c4b5.sql ==========

CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  visit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE TABLE public.saved_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plans" ON public.saved_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans" ON public.saved_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON public.saved_plans FOR DELETE USING (auth.uid() = user_id);

-- ========== 20260409173221_0552a676-9476-43ee-abac-8d6ffbf91c98.sql ==========

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Create differentiation_results table
CREATE TABLE public.differentiation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.differentiation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own differentiation results"
  ON public.differentiation_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all differentiation results"
  ON public.differentiation_results FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own differentiation results"
  ON public.differentiation_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own differentiation results"
  ON public.differentiation_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own differentiation results"
  ON public.differentiation_results FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Create user_form_data table
CREATE TABLE public.user_form_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_form_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own form data"
  ON public.user_form_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all form data"
  ON public.user_form_data FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own form data"
  ON public.user_form_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own form data"
  ON public.user_form_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own form data"
  ON public.user_form_data FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Timestamp trigger function (reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_differentiation_results_updated_at
  BEFORE UPDATE ON public.differentiation_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_form_data_updated_at
  BEFORE UPDATE ON public.user_form_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Admin policies on existing tables
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all saved plans"
  ON public.saved_plans FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ========== 20260409173444_9d800f23-15d1-40fc-a138-b21d21aa51fe.sql ==========
ALTER TABLE public.user_form_data ADD CONSTRAINT user_form_data_user_id_form_type_key UNIQUE (user_id, form_type);
-- ========== 20260409_001_agent_infrastructure.sql ==========
-- ═══════════════════════════════════════════════
-- MAS-CC: Multi-Agent System Infrastructure
-- Creates tables for agent task queue, blackboard
-- persistence, and execution audit trails.
-- ═══════════════════════════════════════════════

-- Agent task queue (replaces AWS SQS)
-- Each row represents a unit of work for an agent.
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'tripped', 'timeout')),
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  error TEXT,
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  tokens_used INT NOT NULL DEFAULT 0,
  cost_nis FLOAT NOT NULL DEFAULT 0,
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES saved_plans(id) ON DELETE CASCADE
);

-- Index for queue polling (pending tasks ordered by creation)
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status, created_at)
  WHERE status = 'pending';

-- Index for user-scoped queries
CREATE INDEX idx_agent_tasks_user ON agent_tasks(user_id, created_at DESC);

-- Blackboard snapshots (persistent board state)
-- Stores the full blackboard state after pipeline completion.
CREATE TABLE IF NOT EXISTS blackboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES saved_plans(id) ON DELETE CASCADE,
  state JSONB NOT NULL,
  completed_agents TEXT[] NOT NULL DEFAULT '{}',
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  execution_meta JSONB,  -- PipelineExecutionResult
  total_tokens_used INT NOT NULL DEFAULT 0,
  total_cost_nis FLOAT NOT NULL DEFAULT 0,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for plan lookups
CREATE INDEX idx_blackboard_snapshots_plan ON blackboard_snapshots(plan_id, created_at DESC);

-- Agent execution log (audit trail)
-- Fine-grained log of every agent lifecycle event.
CREATE TABLE IF NOT EXISTS agent_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
  session_id TEXT,
  agent_name TEXT NOT NULL,
  event TEXT NOT NULL
    CHECK (event IN ('started', 'completed', 'failed', 'retried', 'tripped', 'timeout', 'cost_tracked')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for task-scoped log queries
CREATE INDEX idx_agent_execution_log_task ON agent_execution_log(task_id, created_at);

-- Index for time-based analytics
CREATE INDEX idx_agent_execution_log_time ON agent_execution_log(created_at DESC);

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════

ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE blackboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_execution_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tasks
CREATE POLICY "Users read own agent_tasks"
  ON agent_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own agent_tasks"
  ON agent_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only see snapshots for their own plans
CREATE POLICY "Users read own blackboard_snapshots"
  ON blackboard_snapshots FOR SELECT
  USING (
    plan_id IN (SELECT id FROM saved_plans WHERE user_id = auth.uid())
  );

CREATE POLICY "Users insert own blackboard_snapshots"
  ON blackboard_snapshots FOR INSERT
  WITH CHECK (
    plan_id IN (SELECT id FROM saved_plans WHERE user_id = auth.uid())
  );

-- Execution log follows task ownership
CREATE POLICY "Users read own agent_execution_log"
  ON agent_execution_log FOR SELECT
  USING (
    task_id IN (SELECT id FROM agent_tasks WHERE user_id = auth.uid())
  );

-- ========== 20260409_002_campaign_analytics.sql ==========
-- ═══════════════════════════════════════════════
-- Campaign Analytics — Aggregate benchmark tables
-- Powers the "Cornered Resource" strategic moat.
-- ═══════════════════════════════════════════════

-- Aggregated benchmarks across all users (anonymized)
CREATE TABLE IF NOT EXISTS campaign_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL,
  audience_type TEXT NOT NULL DEFAULT 'all',
  metric_name TEXT NOT NULL,
  metric_value FLOAT NOT NULL,
  sample_size INT NOT NULL DEFAULT 1,
  confidence FLOAT DEFAULT 0.5,
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint to upsert on
  UNIQUE (industry, audience_type, metric_name)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_benchmarks_industry
  ON campaign_benchmarks (industry);

CREATE INDEX IF NOT EXISTS idx_benchmarks_metric
  ON campaign_benchmarks (metric_name);

-- User integration connections
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'pending', 'connected', 'error')),
  config JSONB DEFAULT '{}',
  tokens JSONB DEFAULT '{}', -- encrypted OAuth tokens
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user
  ON user_integrations (user_id);

-- Notification preferences per user-platform
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, platform, event_type)
);

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════

ALTER TABLE campaign_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Benchmarks: readable by all authenticated users (aggregate, anonymized data)
CREATE POLICY "Benchmarks readable by authenticated users"
  ON campaign_benchmarks FOR SELECT
  TO authenticated
  USING (true);

-- User integrations: users can only access their own
CREATE POLICY "Users manage own integrations"
  ON user_integrations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notification preferences: users manage their own
CREATE POLICY "Users manage own notification preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ========== 20260409_003_vector_search.sql ==========
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

-- ========== 20260409_004_event_queue.sql ==========
-- ═══════════════════════════════════════════════
-- Event Queue — PostgreSQL-based event bus
-- Replaces AWS SQS with a lightweight queue pattern.
-- Processed by queue-processor Edge Function via pg_cron.
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS event_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
  priority INT NOT NULL DEFAULT 5, -- 1=highest, 10=lowest
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  result JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for queue polling: get next pending events ordered by priority and schedule
CREATE INDEX IF NOT EXISTS idx_event_queue_pending
  ON event_queue (status, priority, scheduled_at)
  WHERE status = 'pending';

-- Index for user-specific event queries
CREATE INDEX IF NOT EXISTS idx_event_queue_user
  ON event_queue (user_id, created_at DESC);

-- Index for cleanup of old completed events
CREATE INDEX IF NOT EXISTS idx_event_queue_completed
  ON event_queue (status, completed_at)
  WHERE status IN ('completed', 'dead_letter');

-- ═══════════════════════════════════════════════
-- QUEUE OPERATIONS
-- ═══════════════════════════════════════════════

-- Claim the next N pending events atomically (prevents double-processing)
CREATE OR REPLACE FUNCTION claim_events(
  batch_size INT DEFAULT 5,
  event_types TEXT[] DEFAULT NULL
)
RETURNS SETOF event_queue
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE event_queue
  SET status = 'processing',
      started_at = now(),
      attempts = attempts + 1
  WHERE id IN (
    SELECT id FROM event_queue
    WHERE status = 'pending'
      AND scheduled_at <= now()
      AND (event_types IS NULL OR event_type = ANY(event_types))
    ORDER BY priority ASC, scheduled_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- Mark an event as completed
CREATE OR REPLACE FUNCTION complete_event(
  event_id UUID,
  event_result JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE event_queue
  SET status = 'completed',
      completed_at = now(),
      result = event_result
  WHERE id = event_id;
END;
$$;

-- Mark an event as failed (with retry or dead-letter)
CREATE OR REPLACE FUNCTION fail_event(
  event_id UUID,
  error_message TEXT,
  retry_delay_seconds INT DEFAULT 30
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  current_attempts INT;
  current_max INT;
BEGIN
  SELECT attempts, max_attempts INTO current_attempts, current_max
  FROM event_queue WHERE id = event_id;

  IF current_attempts >= current_max THEN
    -- Move to dead letter
    UPDATE event_queue
    SET status = 'dead_letter',
        error = error_message,
        completed_at = now()
    WHERE id = event_id;
  ELSE
    -- Retry with delay
    UPDATE event_queue
    SET status = 'pending',
        error = error_message,
        scheduled_at = now() + (retry_delay_seconds || ' seconds')::INTERVAL
    WHERE id = event_id;
  END IF;
END;
$$;

-- Publish a new event to the queue
CREATE OR REPLACE FUNCTION publish_event(
  p_event_type TEXT,
  p_payload JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT NULL,
  p_priority INT DEFAULT 5,
  p_max_attempts INT DEFAULT 3,
  p_delay_seconds INT DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO event_queue (event_type, payload, user_id, priority, max_attempts, scheduled_at)
  VALUES (
    p_event_type,
    p_payload,
    p_user_id,
    p_priority,
    p_max_attempts,
    now() + (p_delay_seconds || ' seconds')::INTERVAL
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Cleanup old completed events (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_events()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM event_queue
  WHERE status IN ('completed', 'dead_letter')
    AND completed_at < now() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════

ALTER TABLE event_queue ENABLE ROW LEVEL SECURITY;

-- Users can read their own events
CREATE POLICY "Users read own events"
  ON event_queue FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert events (publish)
CREATE POLICY "Users can publish events"
  ON event_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything (for queue-processor)
-- Note: service_role bypasses RLS by default in Supabase

-- ========== 20260409_005_add_tier_column.sql ==========
-- Add dedicated tier column to profiles table
-- Previously tier was stored in display_name as a temporary hack
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free';

-- Migrate any existing tier data from display_name
UPDATE profiles
SET tier = display_name
WHERE display_name IN ('free', 'pro', 'business')
  AND tier = 'free';

-- Add check constraint for valid tiers
ALTER TABLE profiles ADD CONSTRAINT valid_tier CHECK (tier IN ('free', 'pro', 'business'));

-- Index for quick tier lookups
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles (tier);

-- ========== 20260409_006_ab_testing.sql ==========
-- A/B Testing infrastructure for Campaign Craft
-- Supports experiment management, deterministic assignment, and conversion tracking

-- Experiments table
CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  variants JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  target_sample_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Experiment assignments (which user sees which variant)
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(experiment_id, user_id)
);

-- Conversion events
CREATE TABLE IF NOT EXISTS experiment_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 1,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exp_assignments_experiment ON experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_exp_assignments_user ON experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_exp_conversions_experiment ON experiment_conversions(experiment_id);
CREATE INDEX IF NOT EXISTS idx_exp_conversions_variant ON experiment_conversions(experiment_id, variant_id);

-- RLS
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own experiments"
  ON experiments FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own assignments"
  ON experiment_assignments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assignments"
  ON experiment_assignments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own conversions"
  ON experiment_conversions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversions"
  ON experiment_conversions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========== 20260410_001_training_data.sql ==========
-- ═══════════════════════════════════════════════
-- Training Data Pipeline — Engine I/O capture
-- Powers the MOAT flywheel: captures every behavioral
-- science engine invocation for future LLM fine-tuning.
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_id TEXT NOT NULL,
  engine_version TEXT NOT NULL DEFAULT '1.0.0',
  input JSONB NOT NULL,
  output JSONB NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  quality TEXT CHECK (quality IN ('positive', 'negative')) DEFAULT NULL,
  feedback_text TEXT DEFAULT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_pairs_engine
  ON training_pairs (engine_id);

CREATE INDEX IF NOT EXISTS idx_training_pairs_user
  ON training_pairs (user_id);

CREATE INDEX IF NOT EXISTS idx_training_pairs_quality
  ON training_pairs (quality) WHERE quality IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_training_pairs_timestamp
  ON training_pairs (timestamp DESC);

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════

ALTER TABLE training_pairs ENABLE ROW LEVEL SECURITY;

-- Users can INSERT their own training pairs
CREATE POLICY "Users insert own training pairs"
  ON training_pairs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can SELECT their own pairs
CREATE POLICY "Users read own training pairs"
  ON training_pairs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can UPDATE only quality and feedback_text on their own pairs
CREATE POLICY "Users update feedback on own training pairs"
  ON training_pairs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ========== 20260410_002_blackboard_contract.sql ==========
-- ═══════════════════════════════════════════════
-- Blackboard Contract — Shared state across all engines
-- Single source of truth that every engine reads from and
-- writes to. Inserts automatically flow into training_pairs.
-- ═══════════════════════════════════════════════

-- ───────────────────────────────────────────────
-- shared_context — primary blackboard table
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shared_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.saved_plans(id) ON DELETE CASCADE,
  concept_key TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('discover', 'diagnose', 'design', 'deploy')),
  payload JSONB NOT NULL,
  written_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_id, concept_key)
);

CREATE INDEX IF NOT EXISTS idx_shared_context_lookup
  ON public.shared_context (user_id, plan_id, concept_key);

CREATE INDEX IF NOT EXISTS idx_shared_context_stage
  ON public.shared_context (stage);

-- ───────────────────────────────────────────────
-- shared_intents — next-action hints between engines
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shared_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.saved_plans(id) ON DELETE CASCADE,
  intent_key TEXT NOT NULL,
  next_action TEXT NOT NULL,
  blocked_by TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_intents_user_plan
  ON public.shared_intents (user_id, plan_id);

-- ───────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ───────────────────────────────────────────────

ALTER TABLE public.shared_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own shared context"
  ON public.shared_context FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own shared context"
  ON public.shared_context FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own shared context"
  ON public.shared_context FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own shared context"
  ON public.shared_context FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.shared_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own shared intents"
  ON public.shared_intents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own shared intents"
  ON public.shared_intents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own shared intents"
  ON public.shared_intents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own shared intents"
  ON public.shared_intents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────
-- TRAINING DATA FLYWHEEL TRIGGER
-- Every shared_context INSERT mirrors into training_pairs
-- so every engine write becomes future fine-tuning data.
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mirror_context_to_training_pairs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.training_pairs (
    engine_id,
    engine_version,
    input,
    output,
    user_id,
    timestamp,
    metadata
  ) VALUES (
    NEW.written_by,
    '1.0.0',
    jsonb_build_object(
      'concept_key', NEW.concept_key,
      'stage', NEW.stage,
      'plan_id', NEW.plan_id
    ),
    NEW.payload,
    NEW.user_id,
    NEW.created_at,
    jsonb_build_object(
      'source', 'shared_context',
      'shared_context_id', NEW.id
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the blackboard write on training capture.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_context_to_training ON public.shared_context;

CREATE TRIGGER trg_mirror_context_to_training
  AFTER INSERT ON public.shared_context
  FOR EACH ROW
  EXECUTE FUNCTION public.mirror_context_to_training_pairs();

-- ───────────────────────────────────────────────
-- updated_at auto-bump on UPDATE
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.bump_shared_context_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_shared_context_updated_at ON public.shared_context;

CREATE TRIGGER trg_bump_shared_context_updated_at
  BEFORE UPDATE ON public.shared_context
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_shared_context_updated_at();

-- ========== 20260411000000_sentinel_view.sql ==========
-- ═══════════════════════════════════════════════
-- Sentinel View — read-only projection of shared_context
--
-- Exposes only the rows whose concept_key lives in the SYSTEM-*
-- namespace so the Sentinel rail / frontend pulse can poll a
-- narrow observation stream without touching the primary table.
--
-- Purely additive:
--   - No ALTER TABLE on public.shared_context
--   - No new indexes
--   - No schema change to any existing object
--
-- The view inherits RLS from public.shared_context via the
-- `security_invoker = true` option, so every SELECT runs with
-- the caller's row-level security policies (each user still only
-- sees their own rows).
-- ═══════════════════════════════════════════════

CREATE OR REPLACE VIEW public.sentinel_view
  WITH (security_invoker = true) AS
SELECT
  id,
  concept_key,
  created_at,
  stage,
  payload
FROM public.shared_context
WHERE concept_key LIKE 'SYSTEM-%';

COMMENT ON VIEW public.sentinel_view IS
  'Read-only projection of shared_context filtered to SYSTEM-* namespace. Housekeeping rail observer.';

GRANT SELECT ON public.sentinel_view TO authenticated;
GRANT SELECT ON public.sentinel_view TO anon;

-- ========== 20260411_001_quotes.sql ==========
-- Quotes table for structured price proposals
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'expired')),
  recipient_name text,
  recipient_company text,
  total numeric,
  currency text NOT NULL DEFAULT 'ILS' CHECK (currency IN ('ILS', 'USD', 'EUR')),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_share_token ON public.quotes(share_token);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own quotes"
  ON public.quotes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read via share token"
  ON public.quotes FOR SELECT
  USING (share_token IS NOT NULL);

-- ========== 20260413_001_user_archetype_profiles.sql ==========
-- ═══════════════════════════════════════════════════════════════════
-- Migration: user_archetype_profiles
-- Purpose  : Persistent cross-session storage for the UserArchetypeLayer.
--            Stores each user's behaviorally-classified archetype, confidence,
--            raw scores, and top-50 signal history.
-- RLS      : Each row is locked to the owning user (auth.uid()).
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.user_archetype_profiles (
  user_id          uuid        not null references auth.users(id) on delete cascade,
  archetype_id     text        not null,
  confidence       float4      not null default 0,
  confidence_tier  text        not null default 'none',
  scores           jsonb       not null default '{}'::jsonb,
  signal_history   jsonb       not null default '[]'::jsonb,
  session_count    int4        not null default 0,
  override_by_user text,
  last_computed_at timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  version          int4        not null default 1,

  constraint user_archetype_profiles_pkey primary key (user_id),
  constraint user_archetype_profiles_archetype_id_check
    check (archetype_id in ('strategist','optimizer','pioneer','connector','closer')),
  constraint user_archetype_profiles_confidence_tier_check
    check (confidence_tier in ('none','tentative','confident','strong')),
  constraint user_archetype_profiles_override_check
    check (override_by_user is null or override_by_user in ('strategist','optimizer','pioneer','connector','closer'))
);

-- ── Indexes ──────────────────────────────────────────────────────────
create index if not exists idx_user_archetype_profiles_archetype_id
  on public.user_archetype_profiles (archetype_id);

create index if not exists idx_user_archetype_profiles_confidence_tier
  on public.user_archetype_profiles (confidence_tier);

-- ── Auto-update updated_at ────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_archetype_profiles_updated_at on public.user_archetype_profiles;
create trigger trg_user_archetype_profiles_updated_at
  before update on public.user_archetype_profiles
  for each row execute function public.set_updated_at();

-- ── Trim signal_history to last 50 entries on upsert ─────────────────
create or replace function public.trim_archetype_signal_history()
returns trigger language plpgsql as $$
begin
  -- Keep only the last 50 signals (array slice from end)
  if jsonb_array_length(new.signal_history) > 50 then
    new.signal_history := (
      select jsonb_agg(elem)
      from (
        select elem
        from jsonb_array_elements(new.signal_history) with ordinality as t(elem, ord)
        order by ord desc
        limit 50
      ) sub
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_archetype_trim_signals on public.user_archetype_profiles;
create trigger trg_user_archetype_trim_signals
  before insert or update on public.user_archetype_profiles
  for each row execute function public.trim_archetype_signal_history();

-- ── Row Level Security ────────────────────────────────────────────────
alter table public.user_archetype_profiles enable row level security;

-- Users can only read their own profile
create policy "user_archetype_profiles_select"
  on public.user_archetype_profiles
  for select
  using (user_id = auth.uid());

-- Users can only insert their own profile
create policy "user_archetype_profiles_insert"
  on public.user_archetype_profiles
  for insert
  with check (user_id = auth.uid());

-- Users can only update their own profile
create policy "user_archetype_profiles_update"
  on public.user_archetype_profiles
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can delete their own profile (GDPR Article 17)
create policy "user_archetype_profiles_delete"
  on public.user_archetype_profiles
  for delete
  using (user_id = auth.uid());

-- ── Grant access to authenticated users ──────────────────────────────
grant select, insert, update, delete
  on public.user_archetype_profiles
  to authenticated;

-- ========== 20260414_001_outcome_loop.sql ==========
-- ═══════════════════════════════════════════════════════════════════
-- Migration: outcome_loop
-- Purpose  : Closes the action→outcome loop — the critical zero-captured
--            gap identified in the MOAT audit. Three tables:
--
--   recommendation_events — every insight/nudge shown to a user
--   variant_pick_events   — user's explicit Midjourney-style UX pick
--   outcome_reports       — delayed 7/30/90-day conversion measurement
--   cohort_benchmarks     — anonymized archetype-level aggregates (view)
--
-- RLS      : Users own their rows; cohort_benchmarks is read-only for all.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. recommendation_events ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recommendation_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  archetype_id        text        NOT NULL,
  confidence_tier     text        NOT NULL DEFAULT 'none',
  source              text        NOT NULL,
  action_id           text        NOT NULL,
  action_label_en     text        NOT NULL DEFAULT '',
  context_snapshot    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  shown_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rec_events_source_check CHECK (source IN (
    'insight_feed', 'nudge_banner', 'guidance_panel',
    'archetype_pipeline', 'express_wizard'
  )),
  CONSTRAINT rec_events_archetype_check CHECK (archetype_id IN (
    'strategist', 'optimizer', 'pioneer', 'connector', 'closer'
  )),
  CONSTRAINT rec_events_confidence_tier_check CHECK (confidence_tier IN (
    'none', 'tentative', 'confident', 'strong'
  ))
);

CREATE INDEX IF NOT EXISTS idx_rec_events_user
  ON public.recommendation_events (user_id);

CREATE INDEX IF NOT EXISTS idx_rec_events_archetype_action
  ON public.recommendation_events (archetype_id, action_id);

CREATE INDEX IF NOT EXISTS idx_rec_events_shown_at
  ON public.recommendation_events (shown_at DESC);

-- ── 2. variant_pick_events ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.variant_pick_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id   uuid        REFERENCES public.recommendation_events(id) ON DELETE CASCADE,
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  choice              text        NOT NULL,
  position            int4        NOT NULL DEFAULT 0,
  picked_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT variant_pick_choice_check CHECK (choice IN ('primary', 'variation', 'skip'))
);

CREATE INDEX IF NOT EXISTS idx_variant_pick_rec
  ON public.variant_pick_events (recommendation_id);

CREATE INDEX IF NOT EXISTS idx_variant_pick_user
  ON public.variant_pick_events (user_id);

CREATE INDEX IF NOT EXISTS idx_variant_pick_choice
  ON public.variant_pick_events (choice);

-- ── 3. outcome_reports ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.outcome_reports (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id   uuid        REFERENCES public.recommendation_events(id) ON DELETE CASCADE,
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  horizon_days        int4        NOT NULL,
  outcome_type        text        NOT NULL,
  delta_value         float4,
  reported_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT outcome_horizon_check CHECK (horizon_days IN (7, 30, 90)),
  CONSTRAINT outcome_type_check CHECK (outcome_type IN (
    'navigated', 'plan_created', 'source_connected',
    'revenue_reported', 'dismissed'
  ))
);

CREATE INDEX IF NOT EXISTS idx_outcome_reports_rec
  ON public.outcome_reports (recommendation_id);

CREATE INDEX IF NOT EXISTS idx_outcome_reports_user
  ON public.outcome_reports (user_id);

CREATE INDEX IF NOT EXISTS idx_outcome_reports_horizon
  ON public.outcome_reports (horizon_days, outcome_type);

-- ── 4. cohort_benchmarks (materialized view — refreshed nightly) ──────
-- Anonymized cross-tenant aggregates: no PII, archetype + action only.

CREATE MATERIALIZED VIEW IF NOT EXISTS public.cohort_benchmarks AS
SELECT
  re.archetype_id,
  re.action_id,
  count(DISTINCT re.id)                                               AS sample_n,
  round(
    count(DISTINCT vp.id) FILTER (WHERE vp.choice = 'primary')::numeric
    / nullif(count(DISTINCT re.id), 0), 4
  )                                                                   AS primary_pick_rate,
  round(
    count(DISTINCT vp.id) FILTER (WHERE vp.choice = 'variation')::numeric
    / nullif(count(DISTINCT re.id), 0), 4
  )                                                                   AS variation_pick_rate,
  round(
    count(DISTINCT vp.id) FILTER (WHERE vp.choice = 'skip')::numeric
    / nullif(count(DISTINCT re.id), 0), 4
  )                                                                   AS skip_rate,
  avg(or7.delta_value)  FILTER (WHERE or7.outcome_type != 'dismissed')  AS avg_conversion_7d,
  avg(or30.delta_value) FILTER (WHERE or30.outcome_type != 'dismissed') AS avg_conversion_30d,
  now()                                                               AS computed_at
FROM public.recommendation_events re
LEFT JOIN public.variant_pick_events vp   ON vp.recommendation_id = re.id
LEFT JOIN public.outcome_reports     or7  ON or7.recommendation_id = re.id AND or7.horizon_days = 7
LEFT JOIN public.outcome_reports     or30 ON or30.recommendation_id = re.id AND or30.horizon_days = 30
GROUP BY re.archetype_id, re.action_id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cohort_benchmarks_pk
  ON public.cohort_benchmarks (archetype_id, action_id);

-- Refresh function for scheduled nightly job (pg_cron / Supabase scheduled fn)
CREATE OR REPLACE FUNCTION public.refresh_cohort_benchmarks()
RETURNS void LANGUAGE sql AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.cohort_benchmarks;
$$;

-- ── RLS ───────────────────────────────────────────────────────────────

ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_pick_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_reports       ENABLE ROW LEVEL SECURITY;

-- recommendation_events: users own their rows; anon can insert without user_id
CREATE POLICY "rec_events_insert"
  ON public.recommendation_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "rec_events_select"
  ON public.recommendation_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- variant_pick_events
CREATE POLICY "variant_pick_insert"
  ON public.variant_pick_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "variant_pick_select"
  ON public.variant_pick_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- outcome_reports
CREATE POLICY "outcome_insert"
  ON public.outcome_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "outcome_select"
  ON public.outcome_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- cohort_benchmarks: read-only for all authenticated users (no PII)
GRANT SELECT ON public.cohort_benchmarks TO authenticated;

-- ── Grants ────────────────────────────────────────────────────────────

GRANT SELECT, INSERT
  ON public.recommendation_events,
     public.variant_pick_events,
     public.outcome_reports
  TO authenticated;

-- ========== 20260414_002_engine_history_and_content.sql ==========
-- ═══════════════════════════════════════════════════════════════════
-- Migration: engine_history_and_content
-- Purpose  : Closes the remaining MOAT data gaps:
--
--   1. ALTER variant_pick_events  — add hover_ms (micro-behavior signal)
--   2. engine_snapshots           — time-series of key engine outputs
--   3. content_snapshots          — embedding-ready structured text capture
--
-- All tables: RLS enabled, users own their rows.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Micro-behavior: add hover_ms to variant_pick_events ────────────

ALTER TABLE public.variant_pick_events
  ADD COLUMN IF NOT EXISTS hover_ms int4;

COMMENT ON COLUMN public.variant_pick_events.hover_ms
  IS 'Milliseconds the user hovered over the card before making a choice. '
     'High values signal uncertainty; low values signal strong preference. '
     'NULL when hover was not tracked (e.g. touch devices).';

CREATE INDEX IF NOT EXISTS idx_variant_pick_hover
  ON public.variant_pick_events (hover_ms) WHERE hover_ms IS NOT NULL;

-- ── 2. Engine output history ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.engine_snapshots (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  archetype_id             text        NOT NULL,
  confidence_tier          text        NOT NULL DEFAULT 'none',
  health_score             float4,
  bottleneck_count         int4        NOT NULL DEFAULT 0,
  critical_bottleneck_count int4       NOT NULL DEFAULT 0,
  success_probability      float4,
  plan_count               int4        NOT NULL DEFAULT 0,
  connected_sources        int4        NOT NULL DEFAULT 0,
  snapshotted_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT eng_snap_archetype_check CHECK (archetype_id IN (
    'strategist', 'optimizer', 'pioneer', 'connector', 'closer'
  )),
  CONSTRAINT eng_snap_tier_check CHECK (confidence_tier IN (
    'none', 'tentative', 'confident', 'strong'
  )),
  CONSTRAINT eng_snap_health_range CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100)),
  CONSTRAINT eng_snap_prob_range   CHECK (success_probability IS NULL OR (success_probability >= 0 AND success_probability <= 100))
);

CREATE INDEX IF NOT EXISTS idx_eng_snap_user_time
  ON public.engine_snapshots (user_id, snapshotted_at DESC);

CREATE INDEX IF NOT EXISTS idx_eng_snap_archetype_time
  ON public.engine_snapshots (archetype_id, snapshotted_at DESC);

ALTER TABLE public.engine_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eng_snap_insert"
  ON public.engine_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "eng_snap_select"
  ON public.engine_snapshots FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT ON public.engine_snapshots TO authenticated;

-- ── 3. Content snapshots (embedding-ready) ────────────────────────────

CREATE TABLE IF NOT EXISTS public.content_snapshots (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  archetype_id        text        NOT NULL,
  business_field      text        NOT NULL DEFAULT '',
  audience_type       text        NOT NULL DEFAULT '',
  product_description text        NOT NULL DEFAULT '',
  interests           text        NOT NULL DEFAULT '',
  main_goal           text        NOT NULL DEFAULT '',
  embedding_status    text        NOT NULL DEFAULT 'pending',
  -- populated by Edge Function / pg_cron embedding job:
  embedding           vector(1536),
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT content_snap_archetype_check CHECK (archetype_id IN (
    'strategist', 'optimizer', 'pioneer', 'connector', 'closer'
  )),
  CONSTRAINT content_snap_embed_status_check CHECK (embedding_status IN (
    'pending', 'done', 'failed'
  ))
);

CREATE INDEX IF NOT EXISTS idx_content_snap_user
  ON public.content_snapshots (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_snap_archetype
  ON public.content_snapshots (archetype_id, embedding_status);

-- Pending embeddings queue — used by the Edge Function to pick up work
CREATE INDEX IF NOT EXISTS idx_content_snap_pending
  ON public.content_snapshots (created_at ASC)
  WHERE embedding_status = 'pending';

-- Vector similarity index — used after embeddings are populated
CREATE INDEX IF NOT EXISTS idx_content_snap_vector
  ON public.content_snapshots
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

ALTER TABLE public.content_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content_snap_insert"
  ON public.content_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "content_snap_select"
  ON public.content_snapshots FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin function: fetch pending embeddings (called by Edge Function)
CREATE POLICY "content_snap_service_select"
  ON public.content_snapshots FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "content_snap_service_update"
  ON public.content_snapshots FOR UPDATE
  TO service_role
  USING (true);

GRANT SELECT, INSERT ON public.content_snapshots TO authenticated;
GRANT SELECT, UPDATE ON public.content_snapshots TO service_role;

-- ── Embedding job function (called by pg_cron or Edge Function) ───────
-- Marks content_snapshots as 'failed' if embedding not populated in 24h.
CREATE OR REPLACE FUNCTION public.expire_stale_embeddings()
RETURNS void LANGUAGE sql AS $$
  UPDATE public.content_snapshots
  SET embedding_status = 'failed'
  WHERE embedding_status = 'pending'
    AND created_at < now() - interval '24 hours';
$$;

-- ========== 20260417_001_feedback.sql ==========
-- Feedback table for /support page.
-- Public inserts (anonymous users can report bugs); admin-only reads.

create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  email text,
  message text not null check (length(message) between 5 and 5000),
  user_agent text,
  page_url text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_feedback_created_at
  on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Anyone (authenticated or anonymous) may submit feedback
drop policy if exists "anyone can insert feedback" on public.feedback;
create policy "anyone can insert feedback"
  on public.feedback
  for insert
  with check (true);

-- Only admin role can read feedback
drop policy if exists "admins can read feedback" on public.feedback;
create policy "admins can read feedback"
  on public.feedback
  for select
  using (
    exists (
      select 1
      from public.admins
      where admins.user_id = auth.uid()
    )
  );

-- ========== 20260417_002_stripe_customer_columns.sql ==========
-- Track Stripe customer and subscription IDs on the profile so the app can
-- open the Billing Portal without a secondary lookup, and so the webhook can
-- resolve a user on customer.subscription.deleted when the subscription
-- metadata is missing.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

