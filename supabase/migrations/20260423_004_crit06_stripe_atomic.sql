-- CRIT-06 Fix: atomic Stripe tier mutation.
--
-- The webhook used to:
--   1. INSERT INTO stripe_events_processed  (sets "processed" flag)
--   2. UPDATE profiles.tier
--   3. INSERT INTO tier_audit_log
-- If step 2 or 3 failed (DB transient, timeout), the event was still marked
-- processed and every Stripe retry bounced as a duplicate. The customer
-- never received the tier they paid for and recovery required manual ops.
--
-- This function executes all three steps in a single transaction. A failure
-- anywhere rolls back the dedup insert, so Stripe's next retry can succeed.
-- The function is SECURITY DEFINER because the webhook already calls it
-- with the service role; marking it DEFINER also protects against future
-- accidental exposure to authenticated clients.

CREATE OR REPLACE FUNCTION public.process_stripe_tier_change(
  p_event_id TEXT,
  p_event_type TEXT,
  p_user_id UUID,
  p_new_tier TEXT,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier TEXT;
BEGIN
  -- Idempotency: claim the event first. If it's already processed,
  -- signal that to the caller without side effects.
  BEGIN
    INSERT INTO stripe_events_processed (event_id, event_type)
    VALUES (p_event_id, p_event_type);
  EXCEPTION WHEN unique_violation THEN
    RETURN 'duplicate';
  END;

  -- Snapshot old tier for the audit row.
  SELECT tier INTO v_old_tier FROM profiles WHERE id = p_user_id;

  -- Apply the tier change along with Stripe identifiers. Passing NULL for
  -- stripe_subscription_id on cancellation clears the subscription link.
  UPDATE profiles
  SET tier = p_new_tier,
      stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
      stripe_subscription_id = CASE
        WHEN p_event_type = 'customer.subscription.deleted' THEN NULL
        ELSE COALESCE(p_stripe_subscription_id, stripe_subscription_id)
      END
  WHERE id = p_user_id;

  INSERT INTO tier_audit_log (
    user_id, old_tier, new_tier, stripe_event_id, stripe_event_type
  ) VALUES (
    p_user_id, v_old_tier, p_new_tier, p_event_id, p_event_type
  );

  RETURN 'applied';
END;
$$;

COMMENT ON FUNCTION public.process_stripe_tier_change IS
  'Atomic dedup + tier update + audit insert. Any failure rolls back the dedup '
  'so Stripe retries can still succeed. See CRIT-06 in security audit.';

-- Only service role should call this (the webhook does). Explicit revoke
-- from PUBLIC prevents an authenticated client from invoking it over PostgREST.
REVOKE ALL ON FUNCTION public.process_stripe_tier_change FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_stripe_tier_change FROM authenticated, anon;
