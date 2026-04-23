-- Centralised security audit log.
--
-- tier_audit_log already tracks Stripe-driven tier changes, but there is
-- no single place to reconstruct "who did what" across the other sensitive
-- surfaces: user_roles membership, user_integrations writes, profile
-- display-name / avatar / email changes, saved_plan deletions, etc.
-- This migration adds a generic security_audit_log and attaches triggers
-- to the high-sensitivity tables.
--
-- The log is append-only from the application's perspective: no UPDATE
-- or DELETE policy for authenticated users. Admins can SELECT.

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID,                      -- auth.uid() when available
  subject_id UUID,                    -- row user_id when the event concerns a user
  action TEXT NOT NULL,               -- e.g. 'insert', 'update', 'delete'
  table_name TEXT NOT NULL,
  row_id UUID,
  changes JSONB                       -- { column: { old, new } } for updates
);

CREATE INDEX IF NOT EXISTS idx_security_audit_by_subject
  ON public.security_audit_log (subject_id, at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_by_table
  ON public.security_audit_log (table_name, at DESC);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read security audit log"
  ON public.security_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Generic audit-row emitter. Designed to be called from AFTER triggers.
-- We keep the payload small (diff of changed JSONB fields) so a noisy
-- table does not balloon the audit log.
CREATE OR REPLACE FUNCTION public.emit_audit_row(
  p_actor_id UUID,
  p_subject_id UUID,
  p_action TEXT,
  p_table TEXT,
  p_row_id UUID,
  p_changes JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO security_audit_log (
    actor_id, subject_id, action, table_name, row_id, changes
  ) VALUES (
    p_actor_id, p_subject_id, p_action, p_table, p_row_id, p_changes
  );
EXCEPTION WHEN OTHERS THEN
  -- Audit must never block the business operation. A failure here is
  -- logged to the server log but the caller continues.
  RAISE WARNING 'emit_audit_row failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_audit_row(UUID, UUID, TEXT, TEXT, UUID, JSONB)
  FROM PUBLIC, authenticated, anon;

-- ───────────────────────────────────────────────
-- Trigger: user_roles
-- Every role grant / revoke is audited with the current auth.uid() as
-- the actor so privilege escalations leave a trail.
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_audit_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM emit_audit_row(
      auth.uid(), NEW.user_id, 'insert', 'user_roles', NEW.user_id,
      jsonb_build_object('role', jsonb_build_object('old', NULL, 'new', NEW.role))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM emit_audit_row(
      auth.uid(), NEW.user_id, 'update', 'user_roles', NEW.user_id,
      jsonb_build_object('role', jsonb_build_object('old', OLD.role, 'new', NEW.role))
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM emit_audit_row(
      auth.uid(), OLD.user_id, 'delete', 'user_roles', OLD.user_id,
      jsonb_build_object('role', jsonb_build_object('old', OLD.role, 'new', NULL))
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_user_roles();

-- ───────────────────────────────────────────────
-- Trigger: user_integrations
-- Any change to connected integrations (API key creation, token rotation,
-- disconnect) hits the audit log so a compromised account can be traced.
-- We avoid logging the tokens themselves, just the event metadata.
-- ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_audit_user_integrations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM emit_audit_row(
      auth.uid(), NEW.user_id, 'insert', 'user_integrations', NEW.id,
      jsonb_build_object('platform', NEW.platform, 'status', NEW.status)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM emit_audit_row(
      auth.uid(), NEW.user_id, 'update', 'user_integrations', NEW.id,
      jsonb_build_object(
        'status', jsonb_build_object('old', OLD.status, 'new', NEW.status),
        'platform', NEW.platform
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM emit_audit_row(
      auth.uid(), OLD.user_id, 'delete', 'user_integrations', OLD.id,
      jsonb_build_object('platform', OLD.platform)
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_user_integrations ON public.user_integrations;
CREATE TRIGGER audit_user_integrations
  AFTER INSERT OR UPDATE OR DELETE ON public.user_integrations
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_user_integrations();
