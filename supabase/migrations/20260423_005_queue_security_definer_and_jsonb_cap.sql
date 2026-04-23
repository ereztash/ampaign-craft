-- HIGH findings: queue function privilege discipline + JSONB size cap.
--
-- 1. The event-queue helper functions (claim_events, complete_event,
--    fail_event, publish_event, cleanup_old_events, cleanup_expired_embeddings,
--    expire_stale_embeddings) were written without SECURITY DEFINER. Their
--    intended callers are the queue-processor edge function and pg_cron,
--    both running as service_role. Running as caller means behavior depends
--    on whether RLS happens to allow the operation, which is fragile: a
--    future policy tweak could silently break queue processing or, worse,
--    let an authenticated client misuse claim_events to read another user's
--    queue rows. Making them SECURITY DEFINER with a pinned search_path
--    gives each function an explicit, reviewed privilege level.
--
-- 2. shared_context.payload is a user-writable JSONB column with no size
--    cap. A malicious client could write a 100MB deeply-nested object and
--    DoS subsequent queries that traverse it. 256KB is generous for any
--    legitimate engine payload.

-- ───────────────────────────────────────────────
-- Queue helpers: add SECURITY DEFINER
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_events(
  batch_size INT DEFAULT 5,
  event_types TEXT[] DEFAULT NULL
)
RETURNS SETOF public.event_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.claim_events(INT, TEXT[]) FROM PUBLIC, authenticated, anon;

CREATE OR REPLACE FUNCTION public.complete_event(
  event_id UUID,
  event_result JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE event_queue
  SET status = 'completed',
      completed_at = now(),
      result = event_result
  WHERE id = event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_event(UUID, JSONB) FROM PUBLIC, authenticated, anon;

CREATE OR REPLACE FUNCTION public.fail_event(
  event_id UUID,
  error_message TEXT,
  retry_delay_seconds INT DEFAULT 30
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_attempts INT;
  current_max INT;
BEGIN
  SELECT attempts, max_attempts INTO current_attempts, current_max
  FROM event_queue WHERE id = event_id;

  IF current_attempts >= current_max THEN
    UPDATE event_queue
    SET status = 'dead_letter',
        error = error_message,
        completed_at = now()
    WHERE id = event_id;
  ELSE
    UPDATE event_queue
    SET status = 'pending',
        error = error_message,
        scheduled_at = now() + (retry_delay_seconds || ' seconds')::INTERVAL
    WHERE id = event_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fail_event(UUID, TEXT, INT) FROM PUBLIC, authenticated, anon;

-- publish_event stays callable by authenticated users for endpoints that
-- let the client schedule work (e.g. ai-coach's web_search.embed). The
-- function stores p_user_id verbatim, so callers are expected to pass the
-- JWT-derived user id. The RLS policy on event_queue (user_id = auth.uid())
-- continues to gate what the user can see afterwards.
CREATE OR REPLACE FUNCTION public.publish_event(
  p_event_type TEXT,
  p_payload JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT NULL,
  p_priority INT DEFAULT 5,
  p_max_attempts INT DEFAULT 3,
  p_delay_seconds INT DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.cleanup_old_events()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.cleanup_old_events() FROM PUBLIC, authenticated, anon;

CREATE OR REPLACE FUNCTION public.cleanup_expired_embeddings()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.cleanup_expired_embeddings() FROM PUBLIC, authenticated, anon;

-- ───────────────────────────────────────────────
-- JSONB size cap on shared_context.payload (256KB).
-- Reject oversized rows rather than let them degrade query performance.
-- ───────────────────────────────────────────────

ALTER TABLE public.shared_context
  DROP CONSTRAINT IF EXISTS shared_context_payload_size;

ALTER TABLE public.shared_context
  ADD CONSTRAINT shared_context_payload_size
  CHECK (octet_length(payload::text) <= 262144);
