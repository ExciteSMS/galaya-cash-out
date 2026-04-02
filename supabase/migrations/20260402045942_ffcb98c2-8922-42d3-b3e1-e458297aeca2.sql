
-- Loyalty points table
CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_redeemed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, customer_phone)
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own loyalty points" ON public.loyalty_points
  FOR SELECT TO authenticated USING (merchant_id = get_merchant_id());

CREATE POLICY "Merchants can insert own loyalty points" ON public.loyalty_points
  FOR INSERT TO authenticated WITH CHECK (merchant_id = get_merchant_id());

CREATE POLICY "Merchants can update own loyalty points" ON public.loyalty_points
  FOR UPDATE TO authenticated USING (merchant_id = get_merchant_id());

CREATE POLICY "Admins can view all loyalty points" ON public.loyalty_points
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Merchant staff table
CREATE TABLE public.merchant_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  pin_hash TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'cashier',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own staff" ON public.merchant_staff
  FOR SELECT TO authenticated USING (merchant_id = get_merchant_id());

CREATE POLICY "Merchants can insert own staff" ON public.merchant_staff
  FOR INSERT TO authenticated WITH CHECK (merchant_id = get_merchant_id());

CREATE POLICY "Merchants can update own staff" ON public.merchant_staff
  FOR UPDATE TO authenticated USING (merchant_id = get_merchant_id());

CREATE POLICY "Merchants can delete own staff" ON public.merchant_staff
  FOR DELETE TO authenticated USING (merchant_id = get_merchant_id());

CREATE POLICY "Admins can view all staff" ON public.merchant_staff
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Add feature flags for new features
INSERT INTO public.app_settings (key, value) VALUES ('feature_loyalty_points', 'true') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.app_settings (key, value) VALUES ('feature_staff_accounts', 'true') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.app_settings (key, value) VALUES ('feature_dark_mode', 'true') ON CONFLICT (key) DO NOTHING;
