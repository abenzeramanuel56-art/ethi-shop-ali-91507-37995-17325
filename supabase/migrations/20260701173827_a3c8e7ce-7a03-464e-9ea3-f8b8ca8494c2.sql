
INSERT INTO public.app_settings (key, value)
VALUES ('tab_locks', '{"products": false, "services": false, "digital": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
