-- Durable outbox for SMS, ZRA invoices and merchant webhooks, with retry/backoff.
CREATE TABLE IF NOT EXISTS public.outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('sms', 'zra', 'webhook')),
  dedupe_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped', 'dead')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_due_idx ON public.outbox (next_attempt_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS outbox_dead_idx ON public.outbox (updated_at DESC) WHERE status = 'dead';

ALTER TABLE public.outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.outbox FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.outbox TO authenticated;
GRANT ALL ON public.outbox TO service_role;
DROP POLICY IF EXISTS "Admins view outbox" ON public.outbox;
CREATE POLICY "Admins view outbox" ON public.outbox FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins retry outbox" ON public.outbox;
CREATE POLICY "Admins retry outbox" ON public.outbox FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Atomically hands out due rows; a lease keeps overlapping runs from taking the same row.
CREATE OR REPLACE FUNCTION public.claim_outbox(p_limit integer DEFAULT 25)
RETURNS SETOF public.outbox
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.outbox o
  SET next_attempt_at = now() + interval '5 minutes', updated_at = now()
  WHERE o.id IN (
    SELECT id FROM public.outbox
    WHERE status = 'pending' AND next_attempt_at <= now()
    ORDER BY next_attempt_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING o.*;
$$;
REVOKE ALL ON FUNCTION public.claim_outbox(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_outbox(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_outbox(p_kind text, p_key text, p_payload jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.outbox (kind, dedupe_key, payload) VALUES (p_kind, p_key, p_payload)
  ON CONFLICT (dedupe_key) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.enqueue_outbox(text, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_webhooks(p_merchant uuid, p_event text, p_ref uuid, p_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h record;
BEGIN
  FOR h IN SELECT id FROM public.merchant_webhooks WHERE merchant_id = p_merchant AND is_active AND p_event = ANY(events) LOOP
    PERFORM public.enqueue_outbox('webhook', 'webhook:' || h.id || ':' || p_event || ':' || p_ref,
      jsonb_build_object('webhook_id', h.id, 'event', p_event, 'data', p_data));
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_webhooks(uuid, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_transaction_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record; data jsonb;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  data := jsonb_build_object('id', NEW.id, 'reference', NEW.reference, 'amount', NEW.amount, 'fee', NEW.fee,
                             'provider', NEW.provider, 'phone', NEW.phone, 'status', NEW.status, 'created_at', NEW.created_at);
  IF NEW.status = 'success' THEN
    SELECT name, phone_number INTO m FROM public.merchants WHERE id = NEW.merchant_id;
    PERFORM public.enqueue_outbox('sms', 'sms:merchant:' || NEW.id,
      jsonb_build_object('merchant_phone', m.phone_number, 'customer_phone', NEW.phone, 'merchant_name', m.name, 'amount', NEW.amount, 'reference', NEW.reference, 'provider', NEW.provider));
    PERFORM public.enqueue_outbox('sms', 'sms:customer:' || NEW.id,
      jsonb_build_object('customer_phone', NEW.phone, 'merchant_name', m.name, 'amount', NEW.amount, 'reference', NEW.reference, 'provider', NEW.provider));
    PERFORM public.enqueue_outbox('zra', 'zra:sale:' || NEW.id, jsonb_build_object('action', 'sale', 'transaction_id', NEW.id));
    PERFORM public.enqueue_webhooks(NEW.merchant_id, 'payment.success', NEW.id, data);
  ELSIF NEW.status = 'failed' THEN
    PERFORM public.enqueue_webhooks(NEW.merchant_id, 'payment.failed', NEW.id, data);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_transaction_status_change ON public.transactions;
CREATE TRIGGER on_transaction_status_change AFTER UPDATE OF status ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.on_transaction_status_change();

CREATE OR REPLACE FUNCTION public.on_refund_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_webhooks(NEW.merchant_id, 'refund.created', NEW.id,
      jsonb_build_object('id', NEW.id, 'transaction_id', NEW.transaction_id, 'amount', NEW.amount, 'status', NEW.status));
  ELSIF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    PERFORM public.enqueue_outbox('zra', 'zra:credit:' || NEW.id, jsonb_build_object('action', 'credit_note', 'refund_id', NEW.id));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_refund_change ON public.refunds;
CREATE TRIGGER on_refund_change AFTER INSERT OR UPDATE OF status ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.on_refund_change();
