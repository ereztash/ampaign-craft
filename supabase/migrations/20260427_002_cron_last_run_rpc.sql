-- Helper RPC for the deepened /functions/v1/health endpoint.
-- Returns the age (in seconds) of the last successful run of a pg_cron
-- job, or NULL if pg_cron is not installed / the job has never run.
--
-- Used by health.checkCron() to surface stale cron jobs as a "degraded"
-- subsystem before they cause silent data buildup (embeddings TTL,
-- expired prompt patches, etc.).

CREATE OR REPLACE FUNCTION cron_last_run_age_seconds(p_job_name text)
RETURNS double precision
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_age double precision;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN NULL;
  END IF;

  SELECT EXTRACT(EPOCH FROM (now() - max(start_time)))
    INTO v_age
  FROM cron.job_run_details jrd
  JOIN cron.job j ON j.jobid = jrd.jobid
  WHERE j.jobname = p_job_name
    AND jrd.status = 'succeeded';

  RETURN v_age;  -- NULL if never run
END;
$$;

REVOKE ALL ON FUNCTION cron_last_run_age_seconds(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cron_last_run_age_seconds(text) TO service_role;
