
-- 1. Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own notifications" ON public.notifications FOR SELECT USING (merchant_id = get_merchant_id());
CREATE POLICY "Merchants can update own notifications" ON public.notifications FOR UPDATE USING (merchant_id = get_merchant_id());
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. Expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL DEFAULT '',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own expenses" ON public.expenses FOR SELECT USING (merchant_id = get_merchant_id());
CREATE POLICY "Merchants can insert own expenses" ON public.expenses FOR INSERT WITH CHECK (merchant_id = get_merchant_id());
CREATE POLICY "Merchants can update own expenses" ON public.expenses FOR UPDATE USING (merchant_id = get_merchant_id());
CREATE POLICY "Merchants can delete own expenses" ON public.expenses FOR DELETE USING (merchant_id = get_merchant_id());

-- 3. Add daily_sales_goal and approval fields to merchants
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS daily_sales_goal NUMERIC DEFAULT 0;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS approval_note TEXT DEFAULT '';
