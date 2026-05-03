INSERT INTO public.app_settings (key, value)
VALUES ('gateway_lipila_enabled', 'true'), ('gateway_moneyunify_enabled', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;