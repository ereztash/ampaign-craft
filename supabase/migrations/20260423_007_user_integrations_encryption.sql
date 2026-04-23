-- Encryption at rest for user_integrations.tokens.
--
-- Until now the OAuth access / refresh / webhook tokens for connected
-- integrations were stored in a plain JSONB column. Anyone with a DB
-- snapshot or a read-only analytics role could lift live credentials for
-- every connected account. This migration:
--
--   1. Enables pgcrypto (idempotent).
--   2. Adds tokens_encrypted BYTEA alongside the legacy tokens column.
--   3. Provides SECURITY DEFINER helpers
--        - set_user_integration_tokens(row_id, jsonb, encryption_key)
--        - read_user_integration_tokens(row_id, encryption_key)
--      that wrap pgp_sym_encrypt/decrypt with a service-role-only key.
--   4. Revokes direct write access to the encrypted column from clients.
--
-- The backfill from the legacy column is left intentionally to a manual
-- ops step because the encryption key must be provisioned from the
-- Supabase dashboard or vault before any real data moves across.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.user_integrations
  ADD COLUMN IF NOT EXISTS tokens_encrypted BYTEA;

COMMENT ON COLUMN public.user_integrations.tokens_encrypted IS
  'pgp_sym_encrypt-wrapped JSONB of OAuth / webhook tokens. Access only '
  'through set_user_integration_tokens / read_user_integration_tokens.';

COMMENT ON COLUMN public.user_integrations.tokens IS
  'DEPRECATED: plaintext tokens. Kept for backfill compatibility; new '
  'writes must go through tokens_encrypted.';

CREATE OR REPLACE FUNCTION public.set_user_integration_tokens(
  p_row_id UUID,
  p_tokens JSONB,
  p_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_key IS NULL OR length(p_key) < 32 THEN
    RAISE EXCEPTION 'encryption key too short';
  END IF;
  UPDATE public.user_integrations
  SET tokens_encrypted = pgp_sym_encrypt(p_tokens::text, p_key),
      tokens = '{}'::jsonb
  WHERE id = p_row_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_integration_tokens(UUID, JSONB, TEXT)
  FROM PUBLIC, authenticated, anon;

CREATE OR REPLACE FUNCTION public.read_user_integration_tokens(
  p_row_id UUID,
  p_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enc BYTEA;
BEGIN
  IF p_key IS NULL OR length(p_key) < 32 THEN
    RAISE EXCEPTION 'encryption key too short';
  END IF;
  SELECT tokens_encrypted INTO v_enc FROM public.user_integrations WHERE id = p_row_id;
  IF v_enc IS NULL THEN RETURN NULL; END IF;
  RETURN pgp_sym_decrypt(v_enc, p_key)::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.read_user_integration_tokens(UUID, TEXT)
  FROM PUBLIC, authenticated, anon;

-- Forbid authenticated writes to tokens_encrypted directly — it must go
-- through the SECURITY DEFINER setter so the raw JSON never lives in the
-- client request body.
--
-- Existing RLS policies on user_integrations already gate the row; this
-- column-level grant revoke is a defense-in-depth measure that stops a
-- misconfigured policy from exposing ciphertext manipulation.
REVOKE UPDATE (tokens_encrypted) ON public.user_integrations FROM PUBLIC, authenticated, anon;
