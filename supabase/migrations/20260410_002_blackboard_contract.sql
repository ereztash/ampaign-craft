-- ═══════════════════════════════════════════════
-- Blackboard Contract — Shared state across all engines
-- Single source of truth that every engine reads from and
-- writes to. Inserts automatically flow into training_pairs.
-- ═══════════════════════════════════════════════

-- ───────────────────────────────────────────────
-- shared_context — primary blackboard table
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shared_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.saved_plans(id) ON DELETE CASCADE,
  concept_key TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('discover', 'diagnose', 'design', 'deploy')),
  payload JSONB NOT NULL,
  written_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_id, concept_key)
);

CREATE INDEX IF NOT EXISTS idx_shared_context_lookup
  ON public.shared_context (user_id, plan_id, concept_key);

CREATE INDEX IF NOT EXISTS idx_shared_context_stage
  ON public.shared_context (stage);

-- ───────────────────────────────────────────────
-- shared_intents — next-action hints between engines
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shared_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.saved_plans(id) ON DELETE CASCADE,
  intent_key TEXT NOT NULL,
  next_action TEXT NOT NULL,
  blocked_by TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_intents_user_plan
  ON public.shared_intents (user_id, plan_id);

-- ───────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ───────────────────────────────────────────────

ALTER TABLE public.shared_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own shared context"
  ON public.shared_context FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own shared context"
  ON public.shared_context FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own shared context"
  ON public.shared_context FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own shared context"
  ON public.shared_context FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE public.shared_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own shared intents"
  ON public.shared_intents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own shared intents"
  ON public.shared_intents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own shared intents"
  ON public.shared_intents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own shared intents"
  ON public.shared_intents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────
-- TRAINING DATA FLYWHEEL TRIGGER
-- Every shared_context INSERT mirrors into training_pairs
-- so every engine write becomes future fine-tuning data.
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.mirror_context_to_training_pairs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.training_pairs (
    engine_id,
    engine_version,
    input,
    output,
    user_id,
    timestamp,
    metadata
  ) VALUES (
    NEW.written_by,
    '1.0.0',
    jsonb_build_object(
      'concept_key', NEW.concept_key,
      'stage', NEW.stage,
      'plan_id', NEW.plan_id
    ),
    NEW.payload,
    NEW.user_id,
    NEW.created_at,
    jsonb_build_object(
      'source', 'shared_context',
      'shared_context_id', NEW.id
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the blackboard write on training capture.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mirror_context_to_training ON public.shared_context;

CREATE TRIGGER trg_mirror_context_to_training
  AFTER INSERT ON public.shared_context
  FOR EACH ROW
  EXECUTE FUNCTION public.mirror_context_to_training_pairs();

-- ───────────────────────────────────────────────
-- updated_at auto-bump on UPDATE
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.bump_shared_context_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_shared_context_updated_at ON public.shared_context;

CREATE TRIGGER trg_bump_shared_context_updated_at
  BEFORE UPDATE ON public.shared_context
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_shared_context_updated_at();
