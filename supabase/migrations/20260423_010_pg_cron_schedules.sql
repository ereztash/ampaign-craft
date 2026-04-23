-- pg_cron schedules for the cleanup routines added during the security
-- hardening sweep.
--
-- Requires the pg_cron extension to be enabled on the Supabase project
-- (Dashboard -> Database -> Extensions -> pg_cron). If it is not enabled
-- at apply time the CREATE EXTENSION call is a no-op and the schedule
-- inserts raise; ops must enable pg_cron first. pg_cron lives in the
-- `cron` schema and its `schedule()` helper is idempotent only via the
-- function name we provide, so we UNSCHEDULE any existing entry first.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Wrap schedule calls in a DO block that tolerates re-runs. If pg_cron
-- is unavailable at apply time the exception is swallowed with a
-- warning so the migration itself still succeeds; the caller can
-- reschedule once the extension is turned on.
DO $$
BEGIN
  -- Clear any previous schedules with our names so re-running the
  -- migration does not leave duplicate entries.
  PERFORM cron.unschedule('cleanup-expired-embeddings');
  PERFORM cron.unschedule('cleanup-old-events');
EXCEPTION WHEN undefined_function OR undefined_table THEN
  RAISE WARNING 'pg_cron not available; skipping unschedule';
END;
$$;

DO $$
BEGIN
  -- Delete content_embeddings rows whose expires_at is past (mostly
  -- web_search_result rows that were auto-stamped with a 30-day TTL).
  PERFORM cron.schedule(
    'cleanup-expired-embeddings',
    '17 3 * * *',                  -- daily 03:17 UTC
    $$SELECT public.cleanup_expired_embeddings();$$
  );

  -- Prune completed / dead-letter event_queue rows older than 7 days.
  PERFORM cron.schedule(
    'cleanup-old-events',
    '42 3 * * *',                  -- daily 03:42 UTC, staggered
    $$SELECT public.cleanup_old_events();$$
  );
EXCEPTION WHEN undefined_function OR undefined_table THEN
  RAISE WARNING 'pg_cron not available; skipping schedule. Run this migration again after enabling the extension.';
END;
$$;
