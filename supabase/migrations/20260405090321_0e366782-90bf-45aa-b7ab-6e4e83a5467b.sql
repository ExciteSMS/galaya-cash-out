
-- Customer directory table
CREATE TABLE public.customer_directory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT DEFAULT '',
  total_transactions INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, phone)
);

ALTER TABLE public.customer_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own customers" ON public.customer_directory FOR SELECT TO authenticated USING (merchant_id = get_merchant_id());
CREATE POLICY "Merchants can insert own customers" ON public.customer_directory FOR INSERT TO authenticated WITH CHECK (merchant_id = get_merchant_id());
CREATE POLICY "Merchants can update own customers" ON public.customer_directory FOR UPDATE TO authenticated USING (merchant_id = get_merchant_id());
CREATE POLICY "Merchants can delete own customers" ON public.customer_directory FOR DELETE TO authenticated USING (merchant_id = get_merchant_id());
CREATE POLICY "Admins can view all customers" ON public.customer_directory FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Add SMS receipt and customer directory feature flags
INSERT INTO public.app_settings (key, value) VALUES ('feature_sms_receipt', 'true') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.app_settings (key, value) VALUES ('feature_customer_directory', 'true') ON CONFLICT (key) DO NOTHING;
