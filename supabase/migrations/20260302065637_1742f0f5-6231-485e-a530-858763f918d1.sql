
-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- app_settings
DROP POLICY IF EXISTS "Admins can insert settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can read settings" ON public.app_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.app_settings;

CREATE POLICY "Admins can read settings" ON public.app_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update settings" ON public.app_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- merchants
DROP POLICY IF EXISTS "Admins can view all merchants" ON public.merchants;
DROP POLICY IF EXISTS "Merchants can view own profile" ON public.merchants;
DROP POLICY IF EXISTS "Merchants can update own profile" ON public.merchants;
DROP POLICY IF EXISTS "Users can create own merchant profile" ON public.merchants;

CREATE POLICY "Admins can view all merchants" ON public.merchants FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Merchants can view own profile" ON public.merchants FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Merchants can update own profile" ON public.merchants FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own merchant profile" ON public.merchants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- transactions
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Merchants can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Merchants can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Merchants can update own transactions" ON public.transactions;

CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Merchants can view own transactions" ON public.transactions FOR SELECT TO authenticated USING (merchant_id = get_merchant_id());
CREATE POLICY "Merchants can insert own transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (merchant_id = get_merchant_id());
CREATE POLICY "Merchants can update own transactions" ON public.transactions FOR UPDATE TO authenticated USING (merchant_id = get_merchant_id());

-- user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
