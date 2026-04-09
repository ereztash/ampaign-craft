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
