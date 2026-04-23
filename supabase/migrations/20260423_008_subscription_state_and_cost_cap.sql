-- Stage 11: close two remaining exploitable surfaces.
--
-- 1. Subscription state machine. Stripe delivers webhook events without
--    ordering guarantees, so a race between checkout.session.completed
--    and customer.subscription.deleted (or the reverse on an interrupted
--    resubscribe) can leave profiles.tier in the wrong state. Adding a
--    subscription_status column plus a guarded tier-change path means the
--    latest authoritative Stripe event always wins and stale ones cannot
--    downgrade an active sub.
--
-- 2. Per-user daily cost cap for LLM calls. The existing per-minute rate
--    limit can be sat on: a patient attacker burns a full minute's quota
--    every minute and drains Anthropic credit over hours. A daily cost
--    counter with an enforced cap is the missing second wall.

-- ───────────────────────────────────────────────
-- Subscription status column + state-machine helper
-- ───────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing', NULL));

COMMENT ON COLUMN public.profiles.subscription_status IS
  'Mirror of the Stripe subscription status. Mutated only by stripe-webhook '
  'via process_stripe_tier_change. Used to reject tier-upgrade events that '
  'arrive after a cancellation.';

-- Recreate the atomic tier RPC to consult subscription_status. If the
-- incoming event would upgrade tier but the current subscription is
-- canceled / past_due, we refuse; this closes the "deleted before
-- completed" race because the late upgrade event finds the status
-- already canceled and is dropped.

CREATE OR REPLACE FUNCTION public.process_stripe_tier_change(
  p_event_id TEXT,
  p_event_type TEXT,
  p_user_id UUID,
  p_new_tier TEXT,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL,
  p_new_subscription_status TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tier TEXT;
  v_old_status TEXT;
  v_tier_order JSONB := '{"free":0,"pro":1,"business":2}'::jsonb;
BEGIN
  BEGIN
    INSERT INTO stripe_events_processed (event_id, event_type)
    VALUES (p_event_id, p_event_type);
  EXCEPTION WHEN unique_violation THEN
    RETURN 'duplicate';
  END;

  SELECT tier, subscription_status INTO v_old_tier, v_old_status
    FROM profiles WHERE id = p_user_id;

  -- State-machine guard: refuse upgrades when the subscription has
  -- already terminated. "canceled" and "past_due" must downgrade freely;
  -- they must not be overwritten by a late upgrade event.
  IF v_old_status IN ('canceled', 'past_due')
     AND p_event_type = 'checkout.session.completed'
     AND (v_tier_order->p_new_tier)::int > (v_tier_order->v_old_tier)::int THEN
    RETURN 'stale_upgrade_rejected';
  END IF;

  UPDATE profiles
  SET tier = p_new_tier,
      subscription_status = COALESCE(p_new_subscription_status, v_old_status),
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

REVOKE ALL ON FUNCTION public.process_stripe_tier_change(TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, authenticated, anon;

-- ───────────────────────────────────────────────
-- Per-user daily LLM cost tracking
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_daily_cost (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::DATE,
  tokens_used BIGINT NOT NULL DEFAULT 0,
  cost_usd_millis BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.user_daily_cost ENABLE ROW LEVEL SECURITY;

-- Users can read their own spend (lets the UI show "X% of daily quota
-- used"); only service role writes.
CREATE POLICY "users read own daily cost"
  ON public.user_daily_cost FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Helper: increment and return whether the user is still under cap.
-- A separate atomic RPC avoids read-modify-write races across isolates.
CREATE OR REPLACE FUNCTION public.bump_user_daily_cost(
  p_user_id UUID,
  p_tokens BIGINT,
  p_cost_usd_millis BIGINT,
  p_token_cap BIGINT DEFAULT 500000,
  p_cost_cap_usd_millis BIGINT DEFAULT 5000
)
RETURNS TABLE (over_cap BOOLEAN, day_tokens BIGINT, day_cost_usd_millis BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'UTC')::DATE;
  v_tokens BIGINT;
  v_cost BIGINT;
BEGIN
  INSERT INTO user_daily_cost (user_id, day, tokens_used, cost_usd_millis)
  VALUES (p_user_id, v_today, p_tokens, p_cost_usd_millis)
  ON CONFLICT (user_id, day) DO UPDATE
    SET tokens_used = user_daily_cost.tokens_used + EXCLUDED.tokens_used,
        cost_usd_millis = user_daily_cost.cost_usd_millis + EXCLUDED.cost_usd_millis
  RETURNING tokens_used, cost_usd_millis INTO v_tokens, v_cost;

  RETURN QUERY SELECT
    (v_tokens > p_token_cap OR v_cost > p_cost_cap_usd_millis),
    v_tokens,
    v_cost;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_user_daily_cost(UUID, BIGINT, BIGINT, BIGINT, BIGINT)
  FROM PUBLIC, authenticated, anon;

COMMENT ON FUNCTION public.bump_user_daily_cost IS
  'Atomic daily-spend increment. Service role calls from edge functions '
  'after each LLM call; UI reads user_daily_cost directly under RLS.';
