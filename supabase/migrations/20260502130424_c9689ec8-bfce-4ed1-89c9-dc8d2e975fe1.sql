-- Support inbox tickets
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to UUID,
  admin_reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (merchant_id = get_merchant_id());
CREATE POLICY "Merchants insert own tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (merchant_id = get_merchant_id());
CREATE POLICY "Admins view all tickets" ON public.support_tickets FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Merchant webhooks
CREATE TABLE public.merchant_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['payment.success'],
  secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_delivery_at TIMESTAMPTZ,
  last_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants manage own webhooks" ON public.merchant_webhooks FOR ALL TO authenticated USING (merchant_id = get_merchant_id()) WITH CHECK (merchant_id = get_merchant_id());
CREATE POLICY "Admins view webhooks" ON public.merchant_webhooks FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Referral program
CREATE TABLE public.merchant_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_merchant_id UUID NOT NULL,
  referred_merchant_id UUID,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_amount NUMERIC NOT NULL DEFAULT 50,
  reward_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchants view own referrals" ON public.merchant_referrals FOR SELECT TO authenticated USING (referrer_merchant_id = get_merchant_id());
CREATE POLICY "Merchants insert own referrals" ON public.merchant_referrals FOR INSERT TO authenticated WITH CHECK (referrer_merchant_id = get_merchant_id());
CREATE POLICY "Admins view all referrals" ON public.merchant_referrals FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update referrals" ON public.merchant_referrals FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- A/B feature rollouts (admin-controlled rollout %)
CREATE TABLE public.feature_rollouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  rollout_percent INTEGER NOT NULL DEFAULT 100,
  target_tier_id UUID,
  notes TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_rollouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read rollouts" ON public.feature_rollouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage rollouts" ON public.feature_rollouts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add columns to existing tables
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS tip_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS split_group_id UUID,
  ADD COLUMN IF NOT EXISTS lat NUMERIC,
  ADD COLUMN IF NOT EXISTS lng NUMERIC,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS synced_offline BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_band TEXT NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Feature flags
INSERT INTO public.app_settings (key, value) VALUES
  ('feature_tip', 'true'),
  ('feature_split_payment', 'true'),
  ('feature_offline_mode', 'true'),
  ('feature_webhooks', 'true'),
  ('feature_referrals', 'true')
ON CONFLICT (key) DO NOTHING;