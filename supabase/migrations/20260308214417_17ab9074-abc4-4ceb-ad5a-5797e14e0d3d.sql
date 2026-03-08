
-- Drop the broken restrictive policies on merchant_tiers
DROP POLICY IF EXISTS "Anyone authenticated can view tiers" ON public.merchant_tiers;
DROP POLICY IF EXISTS "Admins can manage tiers" ON public.merchant_tiers;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Anyone authenticated can view tiers"
  ON public.merchant_tiers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tiers"
  ON public.merchant_tiers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));
