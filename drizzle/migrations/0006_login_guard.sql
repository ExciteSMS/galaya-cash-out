-- Login protection: failed-attempt counters and one-time codes. Service role only (RLS on, no policies).
CREATE TABLE IF NOT EXISTS public.login_attempts (
  phone text PRIMARY KEY,
  failed_count integer NOT NULL DEFAULT 0,
  last_failed_at timestamptz,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.login_otps (
  phone text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  verified_until timestamptz,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_attempts, public.login_otps FROM anon, authenticated;
GRANT ALL ON public.login_attempts, public.login_otps TO service_role;

-- Admin-controlled switches (read by edge functions with the service role).
INSERT INTO public.app_settings (key, value) VALUES
  ('otp_after_failed_logins', 'false'),
  ('otp_failed_login_threshold', '4')
ON CONFLICT (key) DO NOTHING;

-- Shared secret appended to the Lipila callback URL (?token=...). Shown to admins in Settings.
INSERT INTO public.app_settings (key, value) VALUES
  ('callback_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
ON CONFLICT (key) DO NOTHING;
