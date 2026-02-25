ALTER TABLE public.merchants ADD COLUMN address text DEFAULT '';
ALTER TABLE public.merchants ADD COLUMN notification_transactions boolean DEFAULT true;
ALTER TABLE public.merchants ADD COLUMN notification_daily_summary boolean DEFAULT false;