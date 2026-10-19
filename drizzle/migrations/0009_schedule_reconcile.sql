-- Runs reconcile-payments every 5 minutes. The callback_secret is read at run time, so no secret lives in the job text.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('reconcile-payments') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconcile-payments');
SELECT cron.schedule(
  'reconcile-payments',
  '*/5 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://biyopyqclxzocchowpwo.supabase.co/functions/v1/reconcile-payments?token='
           || (SELECT value FROM public.app_settings WHERE key = 'callback_secret'),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $job$
);
