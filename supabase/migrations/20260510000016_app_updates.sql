-- Update info for installed apps. app_settings is admin-only, so expose just these keys.
CREATE OR REPLACE FUNCTION public.get_app_update_info()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  FROM public.app_settings
  WHERE key IN (
    'app_web_version', 'app_web_bundle_url', 'app_min_native_version',
    'app_store_url_android', 'app_store_url_ios'
  );
$$;

REVOKE ALL ON FUNCTION public.get_app_update_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_app_update_info() TO anon, authenticated;
