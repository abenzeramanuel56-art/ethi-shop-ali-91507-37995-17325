
create or replace function public.notify_telegram_mirror()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_tid bigint;
begin
  select telegram_id into v_tid from public.profiles where id = NEW.user_id;
  if v_tid is null then return NEW; end if;
  perform net.http_post(
    url := 'https://xzdxljodgyyildniobqi.supabase.co/functions/v1/telegram-notify',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('notification_id', NEW.id)
  );
  return NEW;
exception when others then
  raise warning 'telegram mirror failed: %', SQLERRM;
  return NEW;
end;
$$;
