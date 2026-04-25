-- ═══════════════════════════════════════════════
-- CRM tables — leads, lead_interactions, lead_recommendations_cache
--
-- Purpose: per-user mini-CRM that doubles as a touchpoint for orthogonal
-- data (real-world acquisition source, "why us?" qualitative moat signal,
-- objection patterns from lost deals, actual conversion rates). Feeds the
-- weekly decision loop with Signals (stale leads) and Reports (actual vs
-- predicted close rate).
--
-- All three tables are user-scoped via auth.uid() = user_id RLS.
-- ═══════════════════════════════════════════════

-- ───────────────────────────────────────────────
-- 1. leads
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.leads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Identity
  name            text NOT NULL,
  phone           text NOT NULL DEFAULT '',
  email           text NOT NULL DEFAULT '',
  business        text NOT NULL DEFAULT '',
  -- Pipeline state
  status          text NOT NULL CHECK (status IN ('lead','meeting','proposal','closed','lost')),
  notes           text NOT NULL DEFAULT '',
  value_nis       numeric NOT NULL DEFAULT 0,
  next_followup   timestamptz,
  -- Orthogonal CRM data (the reason this whole feature exists)
  source          text NOT NULL DEFAULT '',          -- open text, clustered later
  why_us          text NOT NULL DEFAULT '',          -- qualitative moat signal
  lost_reason     text NOT NULL DEFAULT '',          -- objections — fed to closingAgent
  closed_at       timestamptz,                       -- time-to-close distribution
  -- Optional plan link — closes the recommendation→outcome loop
  plan_id         text,
  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_user_id        ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_status    ON public.leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_user_created   ON public.leads(user_id, created_at DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at auto-bump
CREATE OR REPLACE FUNCTION public.tg_leads_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  -- Mirror status→closed_at so the time-to-close metric is reliable.
  IF NEW.status IN ('closed','lost') AND OLD.status NOT IN ('closed','lost') THEN
    NEW.closed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_set_updated_at ON public.leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_leads_set_updated_at();

-- ───────────────────────────────────────────────
-- 2. lead_interactions
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lead_interactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('note','call','meeting','email','whatsapp','status_change')),
  note            text NOT NULL DEFAULT '',
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead     ON public.lead_interactions(lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_user     ON public.lead_interactions(user_id, occurred_at DESC);

ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own interactions"
  ON public.lead_interactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own interactions"
  ON public.lead_interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own interactions"
  ON public.lead_interactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own interactions"
  ON public.lead_interactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────
-- 3. lead_recommendations_cache
--
-- 24h cache for Lead Coach output. Keyed by lead_id, refreshed when an
-- interaction is added. Cache miss = recompute via leadCoachEngine.
-- ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lead_recommendations_cache (
  lead_id         uuid PRIMARY KEY REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendations jsonb NOT NULL,
  computed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_recs_user ON public.lead_recommendations_cache(user_id);

ALTER TABLE public.lead_recommendations_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own recs"
  ON public.lead_recommendations_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own recs"
  ON public.lead_recommendations_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own recs"
  ON public.lead_recommendations_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own recs"
  ON public.lead_recommendations_cache FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
