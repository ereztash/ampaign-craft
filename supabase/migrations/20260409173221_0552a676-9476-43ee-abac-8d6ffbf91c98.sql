
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Create differentiation_results table
CREATE TABLE public.differentiation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.differentiation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own differentiation results"
  ON public.differentiation_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all differentiation results"
  ON public.differentiation_results FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own differentiation results"
  ON public.differentiation_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own differentiation results"
  ON public.differentiation_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own differentiation results"
  ON public.differentiation_results FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Create user_form_data table
CREATE TABLE public.user_form_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_form_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own form data"
  ON public.user_form_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all form data"
  ON public.user_form_data FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own form data"
  ON public.user_form_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own form data"
  ON public.user_form_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own form data"
  ON public.user_form_data FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Timestamp trigger function (reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_differentiation_results_updated_at
  BEFORE UPDATE ON public.differentiation_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_form_data_updated_at
  BEFORE UPDATE ON public.user_form_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Admin policies on existing tables
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all saved plans"
  ON public.saved_plans FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
