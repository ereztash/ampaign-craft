-- P0 RLS hardening — fixes for CRIT-01, CRIT-02, CRIT-03 from the security
-- audit. Each block is independent; applying this migration on an existing
-- production DB is non-destructive.

-- ═══════════════════════════════════════════════
-- CRIT-01: prevent users from self-upgrading their tier
-- ═══════════════════════════════════════════════
--
-- The pre-existing "Users can update own profile" policy had no WITH CHECK
-- clause, which let any authenticated client run
--   UPDATE profiles SET tier = 'business' WHERE id = auth.uid();
-- and bypass Stripe entirely. We replace it with a policy that re-reads the
-- current tier in the CHECK and refuses any change. Tier mutations continue
-- to work via the service role (stripe-webhook already uses it).

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users update own profile (tier locked)"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND tier IS NOT DISTINCT FROM (SELECT tier FROM public.profiles WHERE id = auth.uid())
  );

COMMENT ON POLICY "Users update own profile (tier locked)" ON public.profiles IS
  'Owners can update non-tier fields. Tier changes require the service role. '
  'See CRIT-01 in security audit.';

-- ═══════════════════════════════════════════════
-- CRIT-02: sentinel_view was readable by anonymous users
-- ═══════════════════════════════════════════════
--
-- GRANT SELECT ... TO anon exposed every SYSTEM-* row from shared_context to
-- anyone holding the (public) anon key, bypassing auth entirely.

REVOKE SELECT ON public.sentinel_view FROM anon;

-- ═══════════════════════════════════════════════
-- CRIT-03: quotes share_token policy granted blanket read
-- ═══════════════════════════════════════════════
--
-- The policy USING (share_token IS NOT NULL) let every authenticated user
-- SELECT every shared quote regardless of whether they held the specific
-- token. Token-based access is now handled exclusively by the
-- get-quote-by-token edge function, which looks up the exact token with the
-- service role and returns a single quote.

DROP POLICY IF EXISTS "Public read via share token" ON public.quotes;

COMMENT ON TABLE public.quotes IS
  'Share-token access routes through the get-quote-by-token edge function, '
  'not RLS. See CRIT-03 in security audit.';
