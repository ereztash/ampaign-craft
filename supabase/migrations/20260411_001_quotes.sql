-- Quotes table for structured price proposals
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'expired')),
  recipient_name text,
  recipient_company text,
  total numeric,
  currency text NOT NULL DEFAULT 'ILS' CHECK (currency IN ('ILS', 'USD', 'EUR')),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_share_token ON public.quotes(share_token);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own quotes"
  ON public.quotes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read via share token"
  ON public.quotes FOR SELECT
  USING (share_token IS NOT NULL);
