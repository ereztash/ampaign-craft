-- ═══════════════════════════════════════════════
-- Training Data Pipeline — Engine I/O capture
-- Powers the MOAT flywheel: captures every behavioral
-- science engine invocation for future LLM fine-tuning.
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_id TEXT NOT NULL,
  engine_version TEXT NOT NULL DEFAULT '1.0.0',
  input JSONB NOT NULL,
  output JSONB NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  quality TEXT CHECK (quality IN ('positive', 'negative')) DEFAULT NULL,
  feedback_text TEXT DEFAULT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_pairs_engine
  ON training_pairs (engine_id);

CREATE INDEX IF NOT EXISTS idx_training_pairs_user
  ON training_pairs (user_id);

CREATE INDEX IF NOT EXISTS idx_training_pairs_quality
  ON training_pairs (quality) WHERE quality IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_training_pairs_timestamp
  ON training_pairs (timestamp DESC);

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════

ALTER TABLE training_pairs ENABLE ROW LEVEL SECURITY;

-- Users can INSERT their own training pairs
CREATE POLICY "Users insert own training pairs"
  ON training_pairs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can SELECT their own pairs
CREATE POLICY "Users read own training pairs"
  ON training_pairs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can UPDATE only quality and feedback_text on their own pairs
CREATE POLICY "Users update feedback on own training pairs"
  ON training_pairs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
