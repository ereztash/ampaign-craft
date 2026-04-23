-- Audit log for tier mutations driven by the Stripe webhook.
--
-- profiles.tier is mutated with the service role, so a spoofed or replayed
-- webhook that somehow slipped past signature verification would leave no
-- trace. This table records every tier change alongside the Stripe event
-- that caused it, so ops can reconstruct and reconcile after an incident.

CREATE TABLE IF NOT EXISTS tier_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_tier TEXT,
  new_tier TEXT NOT NULL,
  stripe_event_id TEXT,
  stripe_event_type TEXT,
  source TEXT NOT NULL DEFAULT 'stripe_webhook',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tier_audit_user
  ON tier_audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tier_audit_event
  ON tier_audit_log (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

ALTER TABLE tier_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log from the client; the edge function
-- writes with the service role which bypasses RLS.
CREATE POLICY "Admins can read tier audit log"
  ON tier_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
