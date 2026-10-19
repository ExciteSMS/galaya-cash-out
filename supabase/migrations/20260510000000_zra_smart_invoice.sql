CREATE TABLE public.merchant_zra_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL UNIQUE REFERENCES public.merchants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  tpin text NOT NULL DEFAULT '',
  bhf_id text NOT NULL DEFAULT '000',
  dvc_srl_no text NOT NULL DEFAULT '',
  vsdc_url text NOT NULL DEFAULT '',
  tax_type text NOT NULL DEFAULT 'A',
  initialized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.merchant_zra_settings TO authenticated;
GRANT ALL ON public.merchant_zra_settings TO service_role;
ALTER TABLE public.merchant_zra_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Merchant manages own ZRA settings" ON public.merchant_zra_settings FOR ALL TO authenticated
  USING (merchant_id = public.get_merchant_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (merchant_id = public.get_merchant_id() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.zra_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  refund_id uuid REFERENCES public.refunds(id) ON DELETE SET NULL,
  invoice_type text NOT NULL DEFAULT 'sale',
  invoice_no bigint NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  rcpt_no text,
  sdc_id text,
  mrc_no text,
  rcpt_sign text,
  intrl_data text,
  qr_url text,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  request jsonb,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, invoice_no)
);
CREATE UNIQUE INDEX zra_invoices_tx_sale ON public.zra_invoices(transaction_id) WHERE invoice_type = 'sale';
CREATE UNIQUE INDEX zra_invoices_refund ON public.zra_invoices(refund_id) WHERE refund_id IS NOT NULL;
GRANT SELECT ON public.zra_invoices TO authenticated;
GRANT ALL ON public.zra_invoices TO service_role;
ALTER TABLE public.zra_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or admin ZRA invoices" ON public.zra_invoices FOR SELECT TO authenticated
  USING (merchant_id = public.get_merchant_id() OR public.has_role(auth.uid(),'admin'));