ALTER TABLE public.user_devices
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_accuracy double precision,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS location_status text,
  ADD COLUMN IF NOT EXISTS battery_level integer,
  ADD COLUMN IF NOT EXISTS is_charging boolean,
  ADD COLUMN IF NOT EXISTS app_online boolean NOT NULL DEFAULT true;

-- An account can only have one bound, active device until an admin releases it.
CREATE UNIQUE INDEX IF NOT EXISTS user_devices_one_bound_per_user
  ON public.user_devices(user_id) WHERE is_bound AND is_active;

DROP POLICY IF EXISTS "Users insert own devices" ON public.user_devices;
CREATE POLICY "Users insert own devices"
  ON public.user_devices FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      NOT is_bound
      OR NOT EXISTS (
        SELECT 1 FROM public.user_devices d
        WHERE d.user_id = auth.uid() AND d.is_bound AND d.is_active
      )
    )
  );

-- Only admins may release a binding or change which device an account is bound to.
CREATE OR REPLACE FUNCTION public.guard_user_devices_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id <> OLD.user_id OR NEW.device_id <> OLD.device_id THEN
    RAISE EXCEPTION 'Device identity cannot be changed';
  END IF;
  IF OLD.is_bound AND OLD.is_active AND (NOT NEW.is_bound OR NOT NEW.is_active) THEN
    RAISE EXCEPTION 'Only an admin can release a bound device';
  END IF;
  IF NEW.is_bound AND NEW.is_active AND NOT (OLD.is_bound AND OLD.is_active)
     AND EXISTS (SELECT 1 FROM public.user_devices d WHERE d.user_id = NEW.user_id AND d.id <> NEW.id AND d.is_bound AND d.is_active) THEN
    RAISE EXCEPTION 'Account is already bound to another device';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_user_devices_update ON public.user_devices;
CREATE TRIGGER guard_user_devices_update
  BEFORE UPDATE ON public.user_devices
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_devices_update();
