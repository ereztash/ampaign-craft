-- pg_cron schedules for the M7 knowledge-graph cleanup routines.
-- Same pattern as 20260423_010_pg_cron_schedules.sql: wrapped in DO
-- blocks so the migration still succeeds on projects where pg_cron
-- is not yet enabled, and unschedule-first so re-runs don't
-- accumulate duplicate entries.

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-expired-answer-cards');
  PERFORM cron.unschedule('kg-refresh-global-aggregates');
  PERFORM cron.unschedule('kg-apply-engagement-decay');
EXCEPTION WHEN undefined_function OR undefined_table THEN
  RAISE WARNING 'pg_cron not available; skipping unschedule';
END;
$$;

DO $$
BEGIN
  -- Answer-cards cache expiry. Runs every hour — cheap delete and
  -- keeps the HNSW index compact as users query throughout the day.
  PERFORM cron.schedule(
    'cleanup-expired-answer-cards',
    '5 * * * *',                   -- 5 past every hour
    $$SELECT public.cleanup_expired_answer_cards();$$
  );

  -- Cross-tenant anonymized aggregation with k>=50 + Laplace DP.
  -- Nightly at 02:30 UTC — well after user traffic tails off.
  PERFORM cron.schedule(
    'kg-refresh-global-aggregates',
    '30 2 * * *',                  -- daily 02:30 UTC
    $$SELECT public.kg_refresh_global_aggregates();$$
  );

  -- Engagement-based decay on currently-valid facts. Nightly at
  -- 04:15 UTC — after the embeddings cleanup (03:17) and event
  -- cleanup (03:42) so system load stays staggered.
  PERFORM cron.schedule(
    'kg-apply-engagement-decay',
    '15 4 * * *',                  -- daily 04:15 UTC
    $$SELECT public.kg_apply_engagement_decay();$$
  );
EXCEPTION WHEN undefined_function OR undefined_table THEN
  RAISE WARNING 'pg_cron not available; skipping schedule. Run this migration again after enabling the extension.';
END;
$$;
