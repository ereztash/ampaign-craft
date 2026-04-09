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
