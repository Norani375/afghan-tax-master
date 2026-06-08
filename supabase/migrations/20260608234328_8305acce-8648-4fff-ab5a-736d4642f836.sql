
-- contracts
DROP POLICY IF EXISTS "Users can insert own contracts" ON public.contracts;
CREATE POLICY "Users can insert own contracts" ON public.contracts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update own contracts" ON public.contracts;
CREATE POLICY "Users can update own contracts" ON public.contracts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- employees
DROP POLICY IF EXISTS "Users can insert own employees" ON public.employees;
CREATE POLICY "Users can insert own employees" ON public.employees FOR INSERT
  WITH CHECK (auth.uid() = user_id AND company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update own employees" ON public.employees;
CREATE POLICY "Users can update own employees" ON public.employees FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- expenses
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
CREATE POLICY "Users can insert own expenses" ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id AND company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
CREATE POLICY "Users can update own expenses" ON public.expenses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- incomes
DROP POLICY IF EXISTS "Users can insert own incomes" ON public.incomes;
CREATE POLICY "Users can insert own incomes" ON public.incomes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update own incomes" ON public.incomes;
CREATE POLICY "Users can update own incomes" ON public.incomes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- rents
DROP POLICY IF EXISTS "Users can insert own rents" ON public.rents;
CREATE POLICY "Users can insert own rents" ON public.rents FOR INSERT
  WITH CHECK (auth.uid() = user_id AND company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update own rents" ON public.rents;
CREATE POLICY "Users can update own rents" ON public.rents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
