-- Drop the legacy plaintext tokens column from user_integrations.
--
-- Context: 20260423_007 added tokens_encrypted (pgp_sym_encrypt) alongside
-- the existing plaintext tokens column. The old column was kept for backfill
-- compatibility and marked DEPRECATED.
--
-- This migration finalises the encryption migration by dropping the plaintext
-- column. It includes a hard guard that aborts if any rows still have
-- non-empty plaintext tokens without a corresponding encrypted value,
-- preventing data loss if the ops backfill step was skipped.

DO $$
DECLARE
  v_stale_count bigint;
BEGIN
  SELECT COUNT(*)
    INTO v_stale_count
  FROM public.user_integrations
  WHERE tokens IS NOT NULL
    AND tokens <> '{}'::jsonb
    AND tokens_encrypted IS NULL;

  IF v_stale_count > 0 THEN
    RAISE EXCEPTION
      'Cannot drop tokens column: % row(s) still have plaintext tokens without '
      'tokens_encrypted populated. Run the backfill via set_user_integration_tokens() '
      'for each affected row before re-applying this migration.',
      v_stale_count;
  END IF;
END;
$$;

ALTER TABLE public.user_integrations DROP COLUMN IF EXISTS tokens;

COMMENT ON TABLE public.user_integrations IS
  'Per-user external-service integrations. Credentials are stored exclusively in '
  'tokens_encrypted (pgcrypto pgp_sym_encrypt). Access via SECURITY DEFINER helpers '
  'set_user_integration_tokens / read_user_integration_tokens (migration 20260423_007).';
