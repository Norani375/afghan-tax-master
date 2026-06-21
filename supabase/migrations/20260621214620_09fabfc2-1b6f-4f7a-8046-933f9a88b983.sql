
-- Scope policies on sensitive tables to authenticated role only
DROP POLICY IF EXISTS del_own_branches ON public.branches;
DROP POLICY IF EXISTS ins_own_branches ON public.branches;
DROP POLICY IF EXISTS sel_own_branches ON public.branches;
DROP POLICY IF EXISTS upd_own_branches ON public.branches;
CREATE POLICY sel_own_branches ON public.branches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ins_own_branches ON public.branches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY upd_own_branches ON public.branches FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY del_own_branches ON public.branches FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS del_own_currencies ON public.currencies;
DROP POLICY IF EXISTS ins_own_currencies ON public.currencies;
DROP POLICY IF EXISTS sel_own_currencies ON public.currencies;
DROP POLICY IF EXISTS upd_own_currencies ON public.currencies;
CREATE POLICY sel_own_currencies ON public.currencies FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ins_own_currencies ON public.currencies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY upd_own_currencies ON public.currencies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY del_own_currencies ON public.currencies FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS del_own_customers ON public.customers;
DROP POLICY IF EXISTS ins_own_customers ON public.customers;
DROP POLICY IF EXISTS sel_own_customers ON public.customers;
DROP POLICY IF EXISTS upd_own_customers ON public.customers;
CREATE POLICY sel_own_customers ON public.customers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ins_own_customers ON public.customers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY upd_own_customers ON public.customers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY del_own_customers ON public.customers FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS del_own_excat ON public.expense_categories;
DROP POLICY IF EXISTS ins_own_excat ON public.expense_categories;
DROP POLICY IF EXISTS sel_own_excat ON public.expense_categories;
DROP POLICY IF EXISTS upd_own_excat ON public.expense_categories;
CREATE POLICY sel_own_excat ON public.expense_categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ins_own_excat ON public.expense_categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY upd_own_excat ON public.expense_categories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY del_own_excat ON public.expense_categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Scope INSERT/UPDATE policies on financial tables to authenticated
DROP POLICY IF EXISTS "Users can insert own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON public.contracts;
CREATE POLICY "Users can insert own contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contracts" ON public.contracts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own employees" ON public.employees;
DROP POLICY IF EXISTS "Users can update own employees" ON public.employees;
CREATE POLICY "Users can insert own employees" ON public.employees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own employees" ON public.employees FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
CREATE POLICY "Users can insert own expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON public.expenses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own incomes" ON public.incomes;
DROP POLICY IF EXISTS "Users can update own incomes" ON public.incomes;
CREATE POLICY "Users can insert own incomes" ON public.incomes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own incomes" ON public.incomes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own rents" ON public.rents;
DROP POLICY IF EXISTS "Users can update own rents" ON public.rents;
CREATE POLICY "Users can insert own rents" ON public.rents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rents" ON public.rents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage: restrict app-assets bucket
-- 1) Restrict SELECT so listing returns nothing for anonymous/auth; only direct object access via public URL works.
--    We require the path's first folder to match the requesting user's id (or allow service_role via bypass).
DROP POLICY IF EXISTS "Public read app-assets" ON storage.objects;
CREATE POLICY "Owner read app-assets" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'app-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2) Restrict UPDATE/DELETE/INSERT to the owner folder
DROP POLICY IF EXISTS "Authenticated upload app-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update app-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete app-assets" ON storage.objects;
CREATE POLICY "Owner upload app-assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'app-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner update app-assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'app-assets' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'app-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner delete app-assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'app-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- SECURITY DEFINER function: restrict EXECUTE on has_role to authenticated only (it must remain
-- callable for RLS policies). Revoke from PUBLIC explicitly.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
