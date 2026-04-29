-- ═══════════════════════════════════════════════════════════════
-- Usage tracking + overage credits
--
-- Drives the "subscription with hidden overage" model:
--   • Each meterable action increments a per-user, per-month counter.
--   • When usage exceeds the user's tier limit, we deduct from their
--     credit balance instead of from the included quota.
--   • If credits are also exhausted, the edge function returns 402
--     and the client opens the buy-more-credits modal.
--
-- Design notes:
--   • period_month is the month bucket as a DATE on the first of the
--     month (UTC). Cleanly groupable, indexable, and easy to reset
--     by simply moving the bucket.
--   • action is an opaque string mirroring the metered features in
--     src/lib/pricingTiers.ts (currently: "ai_coach_message",
--     "knowledge_query_deep", "plan_generation"). Adding a new
--     metered action is a code-only change; no schema migration.
--   • credit_ledger is append-only audit so we can reconstruct any
--     balance from history if user_credits.balance ever drifts.
-- ═══════════════════════════════════════════════════════════════

-- Per-user, per-month counter for each metered action.
CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month DATE        NOT NULL,
  action       TEXT        NOT NULL,
  count        INTEGER     NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, period_month, action)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_user_period
  ON public.usage_counters (user_id, period_month);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own usage"
  ON public.usage_counters FOR SELECT
  USING (user_id = auth.uid());

-- Writes go through the service role from the edge functions; no
-- INSERT/UPDATE policy for authenticated users.

-- Current credit balance per user. One row per user; balance is the
-- single source of truth for "how many overage actions can I take".
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance    INTEGER     NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own credit balance"
  ON public.user_credits FOR SELECT
  USING (user_id = auth.uid());

-- Audit trail for every credit change. Append-only — we never UPDATE
-- a ledger row, so the sum of `delta` for a user always equals their
-- current balance (modulo race-condition recovery).
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta        INTEGER     NOT NULL,  -- positive = grant, negative = spend
  reason       TEXT        NOT NULL CHECK (reason IN (
    'purchase', 'spend', 'refund', 'admin_grant', 'expiration'
  )),
  action       TEXT,                  -- which action consumed (for spends)
  stripe_payment_intent_id TEXT,      -- correlates a purchase to Stripe
  metadata     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_created
  ON public.credit_ledger (user_id, created_at DESC);

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ledger"
  ON public.credit_ledger FOR SELECT
  USING (user_id = auth.uid());

-- Atomic counter increment. Returns the post-increment value so the
-- caller can compare it against the tier's included quota in a single
-- round-trip. Using a SECURITY DEFINER function lets us write to
-- usage_counters without exposing it via INSERT policy to clients.
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id UUID,
  p_action  TEXT,
  p_amount  INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period DATE := date_trunc('month', NOW() AT TIME ZONE 'UTC')::date;
  v_count  INTEGER;
BEGIN
  IF p_amount < 1 THEN
    RAISE EXCEPTION 'increment_usage: p_amount must be >= 1';
  END IF;

  INSERT INTO public.usage_counters (user_id, period_month, action, count, updated_at)
  VALUES (p_user_id, v_period, p_action, p_amount, NOW())
  ON CONFLICT (user_id, period_month, action) DO UPDATE
    SET count = public.usage_counters.count + EXCLUDED.count,
        updated_at = NOW()
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_usage(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT, INTEGER) TO service_role;

-- Atomic credit spend. Returns the post-spend balance, or NULL if the
-- user has insufficient credits. Pairs every spend with a ledger row
-- in the same transaction so balance and ledger never diverge.
CREATE OR REPLACE FUNCTION public.spend_credits(
  p_user_id UUID,
  p_amount  INTEGER,
  p_action  TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount < 1 THEN
    RAISE EXCEPTION 'spend_credits: p_amount must be >= 1';
  END IF;

  -- UPSERT-then-decrement keeps the row creation race-free: a user
  -- with no credits row gets one created at 0 and immediately fails
  -- the balance check below.
  INSERT INTO public.user_credits (user_id, balance, updated_at)
  VALUES (p_user_id, 0, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_credits
     SET balance = balance - p_amount,
         updated_at = NOW()
   WHERE user_id = p_user_id
     AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN NULL; -- insufficient credits; caller must reject the request
  END IF;

  INSERT INTO public.credit_ledger (user_id, delta, reason, action)
  VALUES (p_user_id, -p_amount, 'spend', p_action);

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.spend_credits(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spend_credits(UUID, INTEGER, TEXT) TO service_role;

-- Atomic credit grant. Used by purchase-credits (Stripe webhook) and
-- by admin tooling. The stripe_payment_intent_id is unique when set
-- so a webhook replay cannot double-credit the user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_unique_payment_intent
  ON public.credit_ledger (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.grant_credits(
  p_user_id                 UUID,
  p_amount                  INTEGER,
  p_reason                  TEXT,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_metadata                JSONB DEFAULT '{}'::jsonb
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  IF p_amount < 1 THEN
    RAISE EXCEPTION 'grant_credits: p_amount must be >= 1';
  END IF;
  IF p_reason NOT IN ('purchase', 'admin_grant', 'refund') THEN
    RAISE EXCEPTION 'grant_credits: invalid reason %', p_reason;
  END IF;

  -- Idempotency on Stripe payment_intent: if a row already exists for
  -- this intent, return the current balance unchanged.
  IF p_stripe_payment_intent_id IS NOT NULL THEN
    PERFORM 1
      FROM public.credit_ledger
     WHERE stripe_payment_intent_id = p_stripe_payment_intent_id;
    IF FOUND THEN
      SELECT balance INTO v_new_balance FROM public.user_credits WHERE user_id = p_user_id;
      RETURN COALESCE(v_new_balance, 0);
    END IF;
  END IF;

  INSERT INTO public.user_credits (user_id, balance, updated_at)
  VALUES (p_user_id, p_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_credits.balance + EXCLUDED.balance,
        updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.credit_ledger (
    user_id, delta, reason, stripe_payment_intent_id, metadata
  ) VALUES (
    p_user_id, p_amount, p_reason, p_stripe_payment_intent_id, p_metadata
  );

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_credits(UUID, INTEGER, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_credits(UUID, INTEGER, TEXT, TEXT, JSONB) TO service_role;
