
-- ============ customs_declarations ============
CREATE TABLE public.customs_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  declaration_no TEXT NOT NULL,
  declaration_type TEXT NOT NULL CHECK (declaration_type IN ('import','export')),
  customs_office TEXT NOT NULL,
  declaration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  importer_tin TEXT,
  hs_code TEXT,
  goods_description TEXT NOT NULL,
  country TEXT,
  quantity NUMERIC(18,3) DEFAULT 0,
  unit TEXT,
  currency TEXT NOT NULL DEFAULT 'AFN',
  invoice_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  value_afn NUMERIC(18,2) NOT NULL DEFAULT 0,
  customs_duty_rate NUMERIC(5,2) DEFAULT 0,
  customs_duty NUMERIC(18,2) DEFAULT 0,
  brt_rate NUMERIC(5,2) DEFAULT 2,
  brt_amount NUMERIC(18,2) DEFAULT 0,
  vat_rate NUMERIC(5,2) DEFAULT 10,
  vat_amount NUMERIC(18,2) DEFAULT 0,
  red_tax NUMERIC(18,2) DEFAULT 0,
  total_tax NUMERIC(18,2) DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','partial')),
  payment_date DATE,
  receipt_no TEXT,
  broker_name TEXT,
  vehicle_vin TEXT,
  bill_of_lading_no TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, declaration_no)
);
CREATE INDEX idx_cd_user_date ON public.customs_declarations(user_id, declaration_date DESC);
CREATE INDEX idx_cd_company ON public.customs_declarations(company_id);
CREATE INDEX idx_cd_status ON public.customs_declarations(payment_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customs_declarations TO authenticated;
GRANT ALL ON public.customs_declarations TO service_role;
ALTER TABLE public.customs_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cd_select_own" ON public.customs_declarations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cd_insert_own" ON public.customs_declarations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cd_update_own" ON public.customs_declarations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cd_delete_own" ON public.customs_declarations FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_cd_updated BEFORE UPDATE ON public.customs_declarations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cd_audit AFTER INSERT OR UPDATE OR DELETE ON public.customs_declarations FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

-- ============ exchange_rates ============
CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code TEXT NOT NULL,
  rate_to_afn NUMERIC(18,6) NOT NULL,
  rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (currency_code, rate_date)
);
CREATE INDEX idx_er_currency_date ON public.exchange_rates(currency_code, rate_date DESC);
GRANT SELECT ON public.exchange_rates TO authenticated;
GRANT ALL ON public.exchange_rates TO service_role;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "er_select_all_auth" ON public.exchange_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "er_admin_write" ON public.exchange_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_er_updated BEFORE UPDATE ON public.exchange_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ hs_tariffs ============
CREATE TABLE public.hs_tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hs_code TEXT NOT NULL UNIQUE,
  description_fa TEXT NOT NULL,
  duty_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  vat_applicable BOOLEAN NOT NULL DEFAULT true,
  restricted BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hs_tariffs TO authenticated;
GRANT ALL ON public.hs_tariffs TO service_role;
ALTER TABLE public.hs_tariffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hs_select_all_auth" ON public.hs_tariffs FOR SELECT TO authenticated USING (true);
CREATE POLICY "hs_admin_write" ON public.hs_tariffs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_hs_updated BEFORE UPDATE ON public.hs_tariffs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ tax_brackets ============
CREATE TABLE public.tax_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_type TEXT NOT NULL CHECK (bracket_type IN ('salary','rent','contractor','brt','vat','customs','corporate')),
  min_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  max_amount NUMERIC(18,2),
  rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  fixed_deduction NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tax_brackets TO authenticated;
GRANT ALL ON public.tax_brackets TO service_role;
ALTER TABLE public.tax_brackets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tb_select_all_auth" ON public.tax_brackets FOR SELECT TO authenticated USING (true);
CREATE POLICY "tb_admin_write" ON public.tax_brackets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_tb_updated BEFORE UPDATE ON public.tax_brackets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED DATA ============
-- Salary tax brackets (monthly, AFN) - Article 4
INSERT INTO public.tax_brackets (bracket_type, min_amount, max_amount, rate, fixed_deduction, notes) VALUES
('salary', 0, 5000, 0, 0, 'معاف'),
('salary', 5000, 12500, 0.02, 0, '۲٪ مازاد بر ۵۰۰۰'),
('salary', 12500, 100000, 0.10, 0, '۱۰٪ مازاد بر ۱۲,۵۰۰'),
('salary', 100000, NULL, 0.20, 0, '۲۰٪ مازاد بر ۱۰۰,۰۰۰'),
-- Rent tax
('rent', 0, 10000, 0, 0, 'معاف'),
('rent', 10000, 100000, 0.10, 0, '۱۰٪'),
('rent', 100000, NULL, 0.15, 0, '۱۵٪'),
-- Contractor withholding
('contractor', 0, 500000, 0, 0, 'آستانه معافیت ماده ۷۲ (سالانه)'),
('contractor', 500000, NULL, 0.02, 0, '۲٪ دارای جواز'),
-- BRT
('brt', 0, NULL, 0.02, 0, 'BRT عمومی ۲٪'),
-- VAT
('vat', 0, NULL, 0.10, 0, 'مالیات بر ارزش افزوده ۱۰٪'),
-- Corporate
('corporate', 0, NULL, 0.20, 0, 'مالیات اشخاص حقوقی ۲۰٪');

-- Default currencies today
INSERT INTO public.exchange_rates (currency_code, rate_to_afn, rate_date, source) VALUES
('USD', 71.00, CURRENT_DATE, 'default'),
('EUR', 78.00, CURRENT_DATE, 'default'),
('PKR', 0.25, CURRENT_DATE, 'default'),
('IRR', 0.0017, CURRENT_DATE, 'default'),
('AFN', 1, CURRENT_DATE, 'default');

-- Common HS codes (samples)
INSERT INTO public.hs_tariffs (hs_code, description_fa, duty_rate, vat_applicable, restricted, notes) VALUES
('1006', 'برنج', 5, true, false, null),
('1701', 'شکر', 10, true, false, null),
('2709', 'نفت خام', 5, true, false, null),
('2710', 'فرآورده‌های نفتی', 10, true, false, null),
('3004', 'داروها', 0, false, false, 'معاف'),
('4901', 'کتب چاپی', 0, false, false, 'معاف'),
('5208', 'پارچه پنبه‌ای', 10, true, false, null),
('6109', 'تی‌شرت', 15, true, false, null),
('7108', 'طلا', 5, true, true, 'کالای حساس'),
('8517', 'موبایل و تجهیزات مخابراتی', 5, true, false, null),
('8703', 'خودرو سواری', 20, true, false, null),
('8711', 'موتورسیکلت', 15, true, false, null),
('9302', 'اسلحه', 0, false, true, 'ممنوع'),
('2208', 'مشروبات الکلی', 0, false, true, 'ممنوع'),
('2402', 'سیگار', 30, true, false, null);
