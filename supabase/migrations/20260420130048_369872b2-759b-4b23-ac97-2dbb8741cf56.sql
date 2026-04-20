CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  message TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can submit feedback
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);