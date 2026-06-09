
-- 1. Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_changed_by ON public.audit_logs(changed_by);
CREATE INDEX idx_audit_logs_changed_at ON public.audit_logs(changed_at DESC);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);

-- 2. Grants
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- 3. Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies — only admins can view; no client writes
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies — trigger uses SECURITY DEFINER to bypass RLS

-- 5. Generic audit trigger function
CREATE OR REPLACE FUNCTION public.log_audit_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id TEXT;
  v_old JSONB;
  v_new JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_record_id := COALESCE(v_old->>'id', NULL);
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(v_new->>'id', v_old->>'id', NULL);
  ELSE -- INSERT
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(v_new->>'id', NULL);
  END IF;

  INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
  VALUES (TG_TABLE_NAME, v_record_id, TG_OP, v_old, v_new, auth.uid());

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Attach trigger to sensitive tables
CREATE TRIGGER audit_companies      AFTER INSERT OR UPDATE OR DELETE ON public.companies      FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
CREATE TRIGGER audit_transactions   AFTER INSERT OR UPDATE OR DELETE ON public.transactions   FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
CREATE TRIGGER audit_incomes        AFTER INSERT OR UPDATE OR DELETE ON public.incomes        FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
CREATE TRIGGER audit_expenses       AFTER INSERT OR UPDATE OR DELETE ON public.expenses       FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
CREATE TRIGGER audit_contracts      AFTER INSERT OR UPDATE OR DELETE ON public.contracts      FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
CREATE TRIGGER audit_rents          AFTER INSERT OR UPDATE OR DELETE ON public.rents          FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
CREATE TRIGGER audit_employees      AFTER INSERT OR UPDATE OR DELETE ON public.employees      FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
CREATE TRIGGER audit_user_roles     AFTER INSERT OR UPDATE OR DELETE ON public.user_roles     FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
CREATE TRIGGER audit_report_history AFTER INSERT OR UPDATE OR DELETE ON public.report_history FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
