CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants manage own products" ON public.products
  FOR ALL TO authenticated
  USING (merchant_id = public.get_merchant_id())
  WITH CHECK (merchant_id = public.get_merchant_id());

CREATE POLICY "Admins read all products" ON public.products
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.parked_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'parked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resumed_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parked_sales TO authenticated;
GRANT ALL ON public.parked_sales TO service_role;

ALTER TABLE public.parked_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants manage own parked sales" ON public.parked_sales
  FOR ALL TO authenticated
  USING (merchant_id = public.get_merchant_id())
  WITH CHECK (merchant_id = public.get_merchant_id());

CREATE POLICY "Admins read all parked sales" ON public.parked_sales
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));