CREATE TABLE public.sms_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient text NOT NULL,
  message text NOT NULL,
  sender_id text NOT NULL DEFAULT 'Galaya',
  category text NOT NULL DEFAULT 'custom',
  status text NOT NULL DEFAULT 'pending',
  error text,
  sent_by uuid,
  merchant_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view sms log" ON public.sms_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert sms log" ON public.sms_log
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_sms_log_created_at ON public.sms_log(created_at DESC);
CREATE INDEX idx_sms_log_merchant ON public.sms_log(merchant_id);