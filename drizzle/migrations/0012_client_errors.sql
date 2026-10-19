CREATE TABLE IF NOT EXISTS public.client_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  message text NOT NULL CHECK (length(message) <= 1000),
  stack text CHECK (length(stack) <= 4000),
  url text CHECK (length(url) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_errors_created_idx ON public.client_errors (created_at DESC);
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_errors FROM anon, authenticated;
GRANT INSERT ON public.client_errors TO authenticated;
GRANT SELECT, DELETE ON public.client_errors TO authenticated;
GRANT ALL ON public.client_errors TO service_role;
DROP POLICY IF EXISTS "Users log own errors" ON public.client_errors;
CREATE POLICY "Users log own errors" ON public.client_errors FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins read errors" ON public.client_errors;
CREATE POLICY "Admins read errors" ON public.client_errors FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete errors" ON public.client_errors;
CREATE POLICY "Admins delete errors" ON public.client_errors FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
