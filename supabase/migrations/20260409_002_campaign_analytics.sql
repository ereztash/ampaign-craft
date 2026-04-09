-- ═══════════════════════════════════════════════
-- Campaign Analytics — Aggregate benchmark tables
-- Powers the "Cornered Resource" strategic moat.
-- ═══════════════════════════════════════════════

-- Aggregated benchmarks across all users (anonymized)
CREATE TABLE IF NOT EXISTS campaign_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL,
  audience_type TEXT NOT NULL DEFAULT 'all',
  metric_name TEXT NOT NULL,
  metric_value FLOAT NOT NULL,
  sample_size INT NOT NULL DEFAULT 1,
  confidence FLOAT DEFAULT 0.5,
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint to upsert on
  UNIQUE (industry, audience_type, metric_name)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_benchmarks_industry
  ON campaign_benchmarks (industry);

CREATE INDEX IF NOT EXISTS idx_benchmarks_metric
  ON campaign_benchmarks (metric_name);

-- User integration connections
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'pending', 'connected', 'error')),
  config JSONB DEFAULT '{}',
  tokens JSONB DEFAULT '{}', -- encrypted OAuth tokens
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user
  ON user_integrations (user_id);

-- Notification preferences per user-platform
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, platform, event_type)
);

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════

ALTER TABLE campaign_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Benchmarks: readable by all authenticated users (aggregate, anonymized data)
CREATE POLICY "Benchmarks readable by authenticated users"
  ON campaign_benchmarks FOR SELECT
  TO authenticated
  USING (true);

-- User integrations: users can only access their own
CREATE POLICY "Users manage own integrations"
  ON user_integrations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notification preferences: users manage their own
CREATE POLICY "Users manage own notification preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
