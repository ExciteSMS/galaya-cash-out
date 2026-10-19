-- Staff become real users with enforced roles. Plaintext PINs are removed.
ALTER TABLE public.merchant_staff ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE public.merchant_staff SET pin_hash = '' WHERE pin_hash <> '';
ALTER TABLE public.merchant_staff DROP CONSTRAINT IF EXISTS merchant_staff_role_check;
ALTER TABLE public.merchant_staff ADD CONSTRAINT merchant_staff_role_check
  CHECK (role IN ('manager', 'supervisor', 'cashier', 'viewer'));
CREATE UNIQUE INDEX IF NOT EXISTS merchant_staff_phone_key ON public.merchant_staff (phone);

-- Staff are created and changed only through the staff-admin function (service role).
DROP POLICY IF EXISTS "Merchants can insert own staff" ON public.merchant_staff;
DROP POLICY IF EXISTS "Merchants can update own staff" ON public.merchant_staff;
DROP POLICY IF EXISTS "Merchants can delete own staff" ON public.merchant_staff;
REVOKE INSERT, UPDATE, DELETE ON public.merchant_staff FROM authenticated;

-- Owner, or an active staff member's merchant.
CREATE OR REPLACE FUNCTION public.get_merchant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT id FROM public.merchants WHERE user_id = auth.uid() LIMIT 1),
    (SELECT merchant_id FROM public.merchant_staff WHERE user_id = auth.uid() AND is_active LIMIT 1)
  );
$$;

-- 'owner', a staff role, or NULL when the caller has no merchant.
CREATE OR REPLACE FUNCTION public.merchant_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.merchants WHERE user_id = auth.uid()) THEN 'owner'
    ELSE (SELECT role FROM public.merchant_staff WHERE user_id = auth.uid() AND is_active LIMIT 1)
  END;
$$;

-- manage: settings, payouts, webhooks, withdrawals. inventory: products. sell: sales and refund requests.
CREATE OR REPLACE FUNCTION public.has_merchant_perm(p_perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE p_perm
    WHEN 'owner' THEN public.merchant_role() = 'owner'
    WHEN 'manage' THEN public.merchant_role() IN ('owner', 'manager')
    WHEN 'inventory' THEN public.merchant_role() IN ('owner', 'manager', 'supervisor')
    WHEN 'sell' THEN public.merchant_role() IN ('owner', 'manager', 'supervisor', 'cashier')
    ELSE false
  END;
$$;
GRANT EXECUTE ON FUNCTION public.merchant_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_merchant_perm(text) TO authenticated;

-- Staff read their own merchant's profile.
DROP POLICY IF EXISTS "Staff view their merchant" ON public.merchants;
CREATE POLICY "Staff view their merchant" ON public.merchants FOR SELECT TO authenticated
  USING (id = public.get_merchant_id());

-- Restrictive policies are ANDed with the existing ones, so they only narrow access.
DROP POLICY IF EXISTS "Role: manage payouts" ON public.merchant_payout_accounts;
CREATE POLICY "Role: manage payouts" ON public.merchant_payout_accounts AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_merchant_perm('owner'));
DROP POLICY IF EXISTS "Role: edit payouts" ON public.merchant_payout_accounts;
CREATE POLICY "Role: edit payouts" ON public.merchant_payout_accounts AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_merchant_perm('owner'));
DROP POLICY IF EXISTS "Role: delete payouts" ON public.merchant_payout_accounts;
CREATE POLICY "Role: delete payouts" ON public.merchant_payout_accounts AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.has_merchant_perm('owner'));

DROP POLICY IF EXISTS "Role: withdraw" ON public.disbursements;
CREATE POLICY "Role: withdraw" ON public.disbursements AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_merchant_perm('manage'));

DROP POLICY IF EXISTS "Role: webhooks" ON public.merchant_webhooks;
CREATE POLICY "Role: webhooks" ON public.merchant_webhooks AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_merchant_perm('manage') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_merchant_perm('manage') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Role: zra settings" ON public.merchant_zra_settings;
CREATE POLICY "Role: zra settings" ON public.merchant_zra_settings AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.has_merchant_perm('manage') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_merchant_perm('manage') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Role: staff list" ON public.merchant_staff;
CREATE POLICY "Role: staff list" ON public.merchant_staff AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.has_merchant_perm('manage') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Role: refund requests" ON public.refunds;
CREATE POLICY "Role: refund requests" ON public.refunds AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_merchant_perm('sell'));

DROP POLICY IF EXISTS "Role: product insert" ON public.products;
CREATE POLICY "Role: product insert" ON public.products AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_merchant_perm('inventory'));
DROP POLICY IF EXISTS "Role: product update" ON public.products;
CREATE POLICY "Role: product update" ON public.products AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_merchant_perm('inventory') OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Role: product delete" ON public.products;
CREATE POLICY "Role: product delete" ON public.products AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.has_merchant_perm('inventory') OR public.has_role(auth.uid(), 'admin'));
