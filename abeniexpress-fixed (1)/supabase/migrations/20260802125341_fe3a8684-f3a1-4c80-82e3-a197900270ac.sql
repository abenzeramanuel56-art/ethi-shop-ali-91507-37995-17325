CREATE OR REPLACE FUNCTION public.notify_telegram_mirror()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  perform net.http_post(
    url := 'https://xzdxljodgyyildniobqi.supabase.co/functions/v1/telegram-notify',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('notification_id', NEW.id)
  );
  return NEW;
exception when others then
  raise warning 'notification fanout failed: %', SQLERRM;
  return NEW;
end;
$function$;