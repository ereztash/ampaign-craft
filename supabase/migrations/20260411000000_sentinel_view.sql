-- ═══════════════════════════════════════════════
-- Sentinel View — read-only projection of shared_context
--
-- Exposes only the rows whose concept_key lives in the SYSTEM-*
-- namespace so the Sentinel rail / frontend pulse can poll a
-- narrow observation stream without touching the primary table.
--
-- Purely additive:
--   - No ALTER TABLE on public.shared_context
--   - No new indexes
--   - No schema change to any existing object
--
-- The view inherits RLS from public.shared_context via the
-- `security_invoker = true` option, so every SELECT runs with
-- the caller's row-level security policies (each user still only
-- sees their own rows).
-- ═══════════════════════════════════════════════

CREATE OR REPLACE VIEW public.sentinel_view
  WITH (security_invoker = true) AS
SELECT
  id,
  concept_key,
  created_at,
  stage,
  payload
FROM public.shared_context
WHERE concept_key LIKE 'SYSTEM-%';

COMMENT ON VIEW public.sentinel_view IS
  'Read-only projection of shared_context filtered to SYSTEM-* namespace. Housekeeping rail observer.';

GRANT SELECT ON public.sentinel_view TO authenticated;
GRANT SELECT ON public.sentinel_view TO anon;
