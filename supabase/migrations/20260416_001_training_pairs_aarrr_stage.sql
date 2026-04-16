-- ═══════════════════════════════════════════════
-- Training Pairs — add aarrr_stage column
-- Enables stage-scoped prompt optimization via
-- promptOptimizerEngine.analyzeTrainingPatterns()
-- ═══════════════════════════════════════════════

ALTER TABLE training_pairs
  ADD COLUMN IF NOT EXISTS aarrr_stage TEXT
    CHECK (aarrr_stage IN ('acquisition', 'activation', 'retention', 'revenue', 'referral'))
    DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_training_pairs_aarrr_stage
  ON training_pairs (aarrr_stage) WHERE aarrr_stage IS NOT NULL;

COMMENT ON COLUMN training_pairs.aarrr_stage IS
  'Which AARRR funnel stage this training pair belongs to. NULL = cross-cutting.';
