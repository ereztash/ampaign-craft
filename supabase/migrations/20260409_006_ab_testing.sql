-- A/B Testing infrastructure for Campaign Craft
-- Supports experiment management, deterministic assignment, and conversion tracking

-- Experiments table
CREATE TABLE IF NOT EXISTS experiments (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  variants JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  target_sample_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Experiment assignments (which user sees which variant)
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(experiment_id, user_id)
);

-- Conversion events
CREATE TABLE IF NOT EXISTS experiment_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 1,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exp_assignments_experiment ON experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_exp_assignments_user ON experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_exp_conversions_experiment ON experiment_conversions(experiment_id);
CREATE INDEX IF NOT EXISTS idx_exp_conversions_variant ON experiment_conversions(experiment_id, variant_id);

-- RLS
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own experiments"
  ON experiments FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own assignments"
  ON experiment_assignments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assignments"
  ON experiment_assignments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own conversions"
  ON experiment_conversions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversions"
  ON experiment_conversions FOR INSERT WITH CHECK (auth.uid() = user_id);
