
-- Merchant payout accounts (where merchant receives their money)
CREATE TABLE public.merchant_payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('MTN', 'Airtel', 'Zamtel')),
  phone_number text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_payout_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own payout accounts"
  ON public.merchant_payout_accounts FOR SELECT
  USING (merchant_id = get_merchant_id());

CREATE POLICY "Merchants can insert own payout accounts"
  ON public.merchant_payout_accounts FOR INSERT
  WITH CHECK (merchant_id = get_merchant_id());

CREATE POLICY "Merchants can update own payout accounts"
  ON public.merchant_payout_accounts FOR UPDATE
  USING (merchant_id = get_merchant_id());

CREATE POLICY "Merchants can delete own payout accounts"
  ON public.merchant_payout_accounts FOR DELETE
  USING (merchant_id = get_merchant_id());

CREATE POLICY "Admins can view all payout accounts"
  ON public.merchant_payout_accounts FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Disbursements table
CREATE TABLE public.disbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  payout_account_id uuid NOT NULL REFERENCES public.merchant_payout_accounts(id),
  amount numeric NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own disbursements"
  ON public.disbursements FOR SELECT
  USING (merchant_id = get_merchant_id());

CREATE POLICY "Merchants can insert own disbursements"
  ON public.disbursements FOR INSERT
  WITH CHECK (merchant_id = get_merchant_id());

CREATE POLICY "Admins can view all disbursements"
  ON public.disbursements FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update disbursements"
  ON public.disbursements FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));
