-- Lets a seller send a customer an SMS receipt for a successful sale, delivered through the outbox.
CREATE OR REPLACE FUNCTION public.send_sms_receipt(p_transaction_id uuid, p_phone text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tx record; m_name text;
BEGIN
  IF NOT public.has_merchant_perm('sell') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF p_phone !~ '^0\d{9}$' THEN RAISE EXCEPTION 'Invalid phone number'; END IF;
  SELECT * INTO tx FROM public.transactions
    WHERE id = p_transaction_id AND merchant_id = public.get_merchant_id() AND status = 'success';
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  SELECT name INTO m_name FROM public.merchants WHERE id = tx.merchant_id;
  PERFORM public.enqueue_outbox('sms', 'sms:receipt:' || tx.id || ':' || p_phone,
    jsonb_build_object('receipt_to', p_phone,
      'message', format('Receipt from %s: K%s paid via %s. Ref %s. Thank you!', m_name, tx.amount, tx.provider, tx.reference)));
END $$;
REVOKE ALL ON FUNCTION public.send_sms_receipt(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_sms_receipt(uuid, text) TO authenticated;
