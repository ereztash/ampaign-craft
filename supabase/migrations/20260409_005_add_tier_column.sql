-- Add dedicated tier column to profiles table
-- Previously tier was stored in display_name as a temporary hack
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free';

-- Migrate any existing tier data from display_name
UPDATE profiles
SET tier = display_name
WHERE display_name IN ('free', 'pro', 'business')
  AND tier = 'free';

-- Add check constraint for valid tiers
ALTER TABLE profiles ADD CONSTRAINT valid_tier CHECK (tier IN ('free', 'pro', 'business'));

-- Index for quick tier lookups
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles (tier);
