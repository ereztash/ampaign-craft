-- Index-backed API key lookup for user_integrations.
--
-- Prior lookup used `.contains("tokens", { api_key })` which is a JSONB
-- containment scan over the full table. That is both a DoS vector on the
-- public webhook-receive endpoint and a timing side-channel that leaks
-- whether a guessed key exists. Replace with a SHA-256 hex column backed
-- by an index; the edge function hashes the input and does an equality
-- lookup.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE user_integrations
  ADD COLUMN IF NOT EXISTS api_key_hash TEXT;

-- Backfill: hash any existing api_key stored in tokens JSONB.
UPDATE user_integrations
SET api_key_hash = encode(digest(tokens->>'api_key', 'sha256'), 'hex')
WHERE api_key_hash IS NULL
  AND tokens ? 'api_key'
  AND (tokens->>'api_key') IS NOT NULL
  AND (tokens->>'api_key') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_integrations_api_key_hash
  ON user_integrations (api_key_hash)
  WHERE api_key_hash IS NOT NULL;
