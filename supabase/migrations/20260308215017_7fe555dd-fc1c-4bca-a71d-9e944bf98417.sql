
-- Allow authenticated users to read feature flags from app_settings
CREATE POLICY "Authenticated users can read feature flags"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (key LIKE 'feature_%');
