-- Merchants must not be able to approve themselves, change tier/risk, or forge transactions.

-- Transactions are created and settled only by edge functions (service role).
DROP POLICY IF EXISTS "Merchants can insert own transactions" ON public.transactions;

DROP POLICY IF EXISTS "Admins can update transactions" ON public.transactions;
CREATE POLICY "Admins can update transactions" ON public.transactions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update merchants" ON public.merchants;
CREATE POLICY "Admins can update merchants" ON public.merchants
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.guard_transactions_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  -- Merchants may only tag their own transactions with a split group.
  IF to_jsonb(NEW) - 'split_group_id' IS DISTINCT FROM to_jsonb(OLD) - 'split_group_id' THEN
    RAISE EXCEPTION 'Transactions cannot be modified';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS guard_transactions_update ON public.transactions;
CREATE TRIGGER guard_transactions_update BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.guard_transactions_update();

CREATE OR REPLACE FUNCTION public.guard_merchants_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    -- Self-registration always starts at defaults; status/tier/risk are admin-controlled.
    NEW.status := 'active';
    NEW.tier_id := NULL;
    NEW.risk_score := 0;
    NEW.risk_band := 'low';
    NEW.approval_note := NULL;
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.phone_number IS DISTINCT FROM OLD.phone_number
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.tier_id IS DISTINCT FROM OLD.tier_id
     OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.approval_note IS DISTINCT FROM OLD.approval_note
     OR NEW.risk_score IS DISTINCT FROM OLD.risk_score
     OR NEW.risk_band IS DISTINCT FROM OLD.risk_band THEN
    RAISE EXCEPTION 'These merchant fields can only be changed by an admin';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS guard_merchants_write ON public.merchants;
CREATE TRIGGER guard_merchants_write BEFORE INSERT OR UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION public.guard_merchants_write();
