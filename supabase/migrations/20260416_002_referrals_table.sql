-- ═══════════════════════════════════════════════
-- Referrals Table — Ref1
-- Migrates referral tracking from localStorage to
-- persistent Supabase storage for cross-device sync.
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_email   TEXT NOT NULL,
  referral_code   TEXT NOT NULL,
  converted_at    TIMESTAMPTZ,
  reward_claimed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT referrals_referee_email_check CHECK (char_length(referee_email) > 0),
  CONSTRAINT referrals_referral_code_check CHECK (char_length(referral_code) > 0)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referral_code_idx ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS referrals_created_at_idx ON referrals(created_at DESC);

-- RLS: users can only see their own referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can insert own referrals"
  ON referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Users can update own referrals"
  ON referrals FOR UPDATE
  USING (auth.uid() = referrer_id);
