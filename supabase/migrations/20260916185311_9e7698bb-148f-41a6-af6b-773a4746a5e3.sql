ALTER TABLE public.customs_declarations
  ADD COLUMN IF NOT EXISTS etax_ref_no text,
  ADD COLUMN IF NOT EXISTS etax_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS etax_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS etax_clearance_no text,
  ADD COLUMN IF NOT EXISTS etax_cleared_at date,
  ADD COLUMN IF NOT EXISTS etax_last_message text,
  ADD COLUMN IF NOT EXISTS etax_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_cd_etax_status ON public.customs_declarations(etax_status);

CREATE TABLE IF NOT EXISTS public.etax_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  declaration_id uuid NOT NULL REFERENCES public.customs_declarations(id) ON DELETE CASCADE,
  status text NOT NULL,
  ref_no text,
  source text NOT NULL DEFAULT 'manual',
  message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.etax_events TO authenticated;
GRANT ALL ON public.etax_events TO service_role;
ALTER TABLE public.etax_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etax_events_select_own" ON public.etax_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "etax_events_insert_own" ON public.etax_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "etax_events_update_own" ON public.etax_events FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "etax_events_delete_own" ON public.etax_events FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_etax_events_decl ON public.etax_events(declaration_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.etax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  base_url text,
  taxpayer_id text,
  enabled boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.etax_settings TO authenticated;
GRANT ALL ON public.etax_settings TO service_role;
ALTER TABLE public.etax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etax_settings_select_own" ON public.etax_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "etax_settings_insert_own" ON public.etax_settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "etax_settings_update_own" ON public.etax_settings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "etax_settings_delete_own" ON public.etax_settings FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_etax_settings_updated BEFORE UPDATE ON public.etax_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_etax_events_audit AFTER INSERT OR UPDATE OR DELETE ON public.etax_events
FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();