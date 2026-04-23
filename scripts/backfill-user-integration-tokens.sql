-- Backfill script for user_integrations.tokens_encrypted.
--
-- DO NOT commit the encryption key. Run this in the Supabase SQL
-- editor with the session-level key set:
--
--   \set ENCRYPTION_KEY 'paste-32-or-more-chars-here'
--   \i backfill-user-integration-tokens.sql
--
-- Or use psql:
--
--   psql -v ENCRYPTION_KEY=xxxx -f backfill-user-integration-tokens.sql
--
-- The helper set_user_integration_tokens is SECURITY DEFINER and
-- REVOKEd from anon/authenticated (migration 20260423_007), so this
-- script must be run as postgres / service_role.
--
-- Idempotent: rows that already have tokens_encrypted populated are
-- left alone. The legacy `tokens` column is cleared to '{}' by the
-- helper itself on each successful encryption, so re-running is safe.

DO $$
DECLARE
  r RECORD;
  v_key TEXT := current_setting('my.encryption_key', true);
  v_count INT := 0;
BEGIN
  IF v_key IS NULL OR length(v_key) < 32 THEN
    RAISE EXCEPTION
      'Set my.encryption_key (>= 32 chars) before running. '
      'Example: SELECT set_config(''my.encryption_key'', ''paste-key-here'', false);';
  END IF;

  FOR r IN
    SELECT id, tokens
    FROM public.user_integrations
    WHERE tokens IS NOT NULL
      AND tokens::text <> '{}'::text
      AND tokens_encrypted IS NULL
  LOOP
    PERFORM public.set_user_integration_tokens(r.id, r.tokens, v_key);
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Encrypted % integration rows', v_count;
END;
$$;
