
-- Merchants profile table linked to auth.users
CREATE TABLE public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Merchant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own profile"
  ON public.merchants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Merchants can update own profile"
  ON public.merchants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('MTN', 'Zamtel', 'Airtel')),
  phone TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  fee INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  reference TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Helper function to get merchant_id for current user
CREATE OR REPLACE FUNCTION public.get_merchant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.merchants WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE POLICY "Merchants can view own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (merchant_id = public.get_merchant_id());

CREATE POLICY "Merchants can insert own transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id = public.get_merchant_id());

CREATE POLICY "Merchants can update own transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (merchant_id = public.get_merchant_id());

-- Index for faster queries
CREATE INDEX idx_transactions_merchant ON public.transactions(merchant_id);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_merchants_phone ON public.merchants(phone_number);
