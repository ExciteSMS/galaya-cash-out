SELECT cron.unschedule('process-outbox') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-outbox');
SELECT cron.schedule(
  'process-outbox',
  '* * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://biyopyqclxzocchowpwo.supabase.co/functions/v1/process-outbox?token='
           || (SELECT value FROM public.app_settings WHERE key = 'callback_secret'),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $job$
);
