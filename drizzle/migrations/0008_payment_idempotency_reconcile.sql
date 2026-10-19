-- Idempotent payment requests and reconciliation bookkeeping.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS gateway text,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconcile_attempts integer NOT NULL DEFAULT 0;

-- One charge per (merchant, key): a retry or double tap returns the original transaction.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_idempotency_key_uniq
  ON public.transactions (merchant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS transactions_pending_idx
  ON public.transactions (created_at) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.touch_reconcile(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.transactions
  SET reconcile_attempts = reconcile_attempts + 1, reconciled_at = now()
  WHERE id = p_id AND status = 'pending';
$$;
REVOKE ALL ON FUNCTION public.touch_reconcile(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_reconcile(uuid) TO service_role;
