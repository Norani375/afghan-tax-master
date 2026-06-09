-- branches.company_id
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_branches_company_id ON public.branches(company_id);
UPDATE public.branches b SET company_id = c.id
FROM public.companies c
WHERE b.company_id IS NULL AND b.user_id = c.user_id
  AND (SELECT COUNT(*) FROM public.companies c2 WHERE c2.user_id = b.user_id) = 1;

-- customers.company_id
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
UPDATE public.customers cu SET company_id = c.id
FROM public.companies c
WHERE cu.company_id IS NULL AND cu.user_id = c.user_id
  AND (SELECT COUNT(*) FROM public.companies c2 WHERE c2.user_id = cu.user_id) = 1;

-- branch_id روی جداول مالی
ALTER TABLE public.incomes      ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.expenses     ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.contracts    ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.rents        ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.employees    ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_incomes_branch_id      ON public.incomes(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id     ON public.expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_contracts_branch_id    ON public.contracts(branch_id);
CREATE INDEX IF NOT EXISTS idx_rents_branch_id        ON public.rents(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_branch_id ON public.transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id    ON public.employees(branch_id);

-- transactions.currency_id (نگه داشتن ستون قدیم currency برای سازگاری عقب‌رو)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS currency_id uuid REFERENCES public.currencies(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_transactions_currency_id ON public.transactions(currency_id);

UPDATE public.transactions t SET currency_id = cur.id
FROM public.currencies cur
WHERE t.currency_id IS NULL
  AND cur.user_id = t.user_id
  AND upper(cur.code) = upper(t.currency);

-- expenses.category_id
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);

-- ایندکس‌های ترکیبی برای گزارش‌های فصلی
CREATE INDEX IF NOT EXISTS idx_incomes_company_period   ON public.incomes(company_id, year, quarter);
CREATE INDEX IF NOT EXISTS idx_expenses_company_period  ON public.expenses(company_id, year, quarter);
CREATE INDEX IF NOT EXISTS idx_transactions_company_date ON public.transactions(company_id, date DESC);