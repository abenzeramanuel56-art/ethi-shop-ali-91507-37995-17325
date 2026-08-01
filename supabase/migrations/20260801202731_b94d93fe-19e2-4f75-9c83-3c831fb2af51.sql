
create extension if not exists pg_net with schema extensions;

create table if not exists public.telegram_link_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '15 minutes',
  created_at timestamptz not null default now()
);

grant select, insert, delete on public.telegram_link_tokens to authenticated;
grant all on public.telegram_link_tokens to service_role;

alter table public.telegram_link_tokens enable row level security;

create policy "Users manage their own telegram link tokens"
on public.telegram_link_tokens for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.create_telegram_link_token()
returns text language plpgsql security definer set search_path to 'public'
as $$
declare v_token text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from public.telegram_link_tokens where user_id = auth.uid() or expires_at < now();
  v_token := encode(gen_random_bytes(16), 'hex');
  insert into public.telegram_link_tokens (token, user_id) values (v_token, auth.uid());
  return v_token;
end;
$$;

create or replace function public.remind_telegram_link()
returns boolean language plpgsql security definer set search_path to 'public'
as $$
declare v_uid uuid := auth.uid(); v_linked bigint; v_recent int;
begin
  if v_uid is null then return false; end if;
  select telegram_id into v_linked from public.profiles where id = v_uid;
  if v_linked is not null then return false; end if;
  select count(*) into v_recent from public.notifications
   where user_id = v_uid and type = 'telegram_reminder' and created_at > now() - interval '3 days';
  if v_recent > 0 then return false; end if;
  insert into public.notifications (user_id, title, message, type, is_read)
  values (v_uid, 'Link Telegram for instant updates',
          'Your account is not linked to Telegram. Open your Account page and tap "Continue with Telegram" to get order, wallet and delivery updates instantly.',
          'telegram_reminder', false);
  return true;
end;
$$;

create or replace function public.notify_telegram_mirror()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
declare v_tid bigint;
begin
  select telegram_id into v_tid from public.profiles where id = NEW.user_id;
  if v_tid is null then return NEW; end if;
  perform extensions.net.http_post(
    url := 'https://xzdxljodgyyildniobqi.supabase.co/functions/v1/telegram-notify',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('notification_id', NEW.id)
  );
  return NEW;
exception when others then
  return NEW;
end;
$$;

drop trigger if exists trg_notify_telegram_mirror on public.notifications;
create trigger trg_notify_telegram_mirror
after insert on public.notifications
for each row execute function public.notify_telegram_mirror();
