-- Remote disable, geofence alerts and device transfer requests.
ALTER TABLE public.user_devices
  ADD COLUMN IF NOT EXISTS remote_disabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS remote_disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS geofence_lat double precision,
  ADD COLUMN IF NOT EXISTS geofence_lng double precision,
  ADD COLUMN IF NOT EXISTS geofence_radius_m integer CHECK (geofence_radius_m IS NULL OR geofence_radius_m BETWEEN 50 AND 200000),
  ADD COLUMN IF NOT EXISTS outside_geofence boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.guard_user_devices_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id <> OLD.user_id OR NEW.device_id <> OLD.device_id THEN
    RAISE EXCEPTION 'Device identity cannot be changed';
  END IF;
  IF NEW.remote_disabled IS DISTINCT FROM OLD.remote_disabled
     OR NEW.remote_disabled_at IS DISTINCT FROM OLD.remote_disabled_at
     OR NEW.geofence_lat IS DISTINCT FROM OLD.geofence_lat
     OR NEW.geofence_lng IS DISTINCT FROM OLD.geofence_lng
     OR NEW.geofence_radius_m IS DISTINCT FROM OLD.geofence_radius_m
     OR NEW.outside_geofence IS DISTINCT FROM OLD.outside_geofence THEN
    RAISE EXCEPTION 'Only an admin can change device restrictions';
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

-- Prevents a bound device from being created already restricted/unrestricted by a client.
CREATE OR REPLACE FUNCTION public.guard_user_devices_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.remote_disabled := false; NEW.remote_disabled_at := NULL;
    NEW.geofence_lat := NULL; NEW.geofence_lng := NULL; NEW.geofence_radius_m := NULL; NEW.outside_geofence := false;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_user_devices_insert ON public.user_devices;
CREATE TRIGGER guard_user_devices_insert BEFORE INSERT ON public.user_devices
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_devices_insert();

CREATE OR REPLACE FUNCTION public.haversine_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)));
$$;

-- Runs after guard_user_devices_update (triggers fire alphabetically).
CREATE OR REPLACE FUNCTION public.user_devices_geofence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dist double precision; mid uuid;
BEGIN
  IF NEW.geofence_lat IS NULL OR NEW.geofence_lng IS NULL OR NEW.geofence_radius_m IS NULL
     OR NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    NEW.outside_geofence := false;
    RETURN NEW;
  END IF;
  dist := public.haversine_m(NEW.geofence_lat, NEW.geofence_lng, NEW.latitude, NEW.longitude);
  NEW.outside_geofence := dist > NEW.geofence_radius_m;
  IF NEW.outside_geofence AND NOT OLD.outside_geofence THEN
    SELECT COALESCE((SELECT id FROM public.merchants WHERE user_id = NEW.user_id),
                    (SELECT merchant_id FROM public.merchant_staff WHERE user_id = NEW.user_id)) INTO mid;
    INSERT INTO public.fraud_alerts (merchant_id, alert_type, severity, description)
    VALUES (mid, 'device_outside_geofence', 'high',
            format('Device %s is %s m from its allowed area (limit %s m)', COALESCE(NEW.device_name, NEW.device_id), round(dist), NEW.geofence_radius_m));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zz_user_devices_geofence ON public.user_devices;
CREATE TRIGGER zz_user_devices_geofence BEFORE UPDATE ON public.user_devices
  FOR EACH ROW EXECUTE FUNCTION public.user_devices_geofence();

-- True when the caller's bound device was disabled by an admin.
CREATE OR REPLACE FUNCTION public.device_disabled()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_devices WHERE user_id = auth.uid() AND is_bound AND is_active AND remote_disabled);
$$;
GRANT EXECUTE ON FUNCTION public.device_disabled() TO authenticated;

CREATE TABLE IF NOT EXISTS public.device_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  new_device_row_id uuid NOT NULL REFERENCES public.user_devices(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS device_transfer_one_pending ON public.device_transfer_requests (user_id) WHERE status = 'pending';
ALTER TABLE public.device_transfer_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.device_transfer_requests FROM anon, authenticated;
GRANT SELECT ON public.device_transfer_requests TO authenticated;
GRANT ALL ON public.device_transfer_requests TO service_role;
DROP POLICY IF EXISTS "View own or admin transfer requests" ON public.device_transfer_requests;
CREATE POLICY "View own or admin transfer requests" ON public.device_transfer_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Asks the admin to move the account to the device the user is on now (their latest unbound attempt).
CREATE OR REPLACE FUNCTION public.request_device_transfer(p_device_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row_id uuid;
BEGIN
  SELECT id INTO row_id FROM public.user_devices
    WHERE user_id = auth.uid() AND device_id = p_device_id AND NOT is_bound;
  IF row_id IS NULL THEN RAISE EXCEPTION 'Device not found'; END IF;
  INSERT INTO public.device_transfer_requests (user_id, new_device_row_id) VALUES (auth.uid(), row_id)
  ON CONFLICT DO NOTHING;
END $$;
GRANT EXECUTE ON FUNCTION public.request_device_transfer(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_device_transfer(p_id uuid, p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO r FROM public.device_transfer_requests WHERE id = p_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF p_approve THEN
    UPDATE public.user_devices SET is_bound = false, is_active = false WHERE user_id = r.user_id AND is_bound AND id <> r.new_device_row_id;
    UPDATE public.user_devices SET is_bound = true, is_active = true WHERE id = r.new_device_row_id;
  END IF;
  UPDATE public.device_transfer_requests
    SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END, resolved_at = now(), resolved_by = auth.uid()
    WHERE id = p_id;
END $$;
GRANT EXECUTE ON FUNCTION public.resolve_device_transfer(uuid, boolean) TO authenticated;
