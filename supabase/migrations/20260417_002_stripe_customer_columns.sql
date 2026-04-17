-- Track Stripe customer and subscription IDs on the profile so the app can
-- open the Billing Portal without a secondary lookup, and so the webhook can
-- resolve a user on customer.subscription.deleted when the subscription
-- metadata is missing.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
