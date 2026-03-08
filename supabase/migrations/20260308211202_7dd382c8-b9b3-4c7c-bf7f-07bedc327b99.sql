
-- 1. Refunds table
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id),
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own refunds" ON public.refunds FOR SELECT USING (merchant_id = get_merchant_id());
CREATE POLICY "Merchants can insert own refunds" ON public.refunds FOR INSERT WITH CHECK (merchant_id = get_merchant_id());
CREATE POLICY "Admins can view all refunds" ON public.refunds FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update refunds" ON public.refunds FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- 2. Fraud alerts table
CREATE TABLE public.fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.merchants(id),
  transaction_id UUID REFERENCES public.transactions(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all fraud alerts" ON public.fraud_alerts FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update fraud alerts" ON public.fraud_alerts FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert fraud alerts" ON public.fraud_alerts FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Merchant tiers table  
CREATE TABLE public.merchant_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_monthly_volume NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 2.0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view tiers" ON public.merchant_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage tiers" ON public.merchant_tiers FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Add tier_id to merchants
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES public.merchant_tiers(id);

-- Insert default tiers
INSERT INTO public.merchant_tiers (name, min_monthly_volume, commission_rate, sort_order) VALUES
  ('Bronze', 0, 3.0, 1),
  ('Silver', 5000, 2.0, 2),
  ('Gold', 20000, 1.0, 3);

-- Allow service role to insert fraud alerts from edge functions
-- Edge functions use service role key so they bypass RLS
