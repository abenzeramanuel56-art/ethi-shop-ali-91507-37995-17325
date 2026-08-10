CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.create_telegram_link_token()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_token text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from public.telegram_link_tokens where user_id = auth.uid() or expires_at < now();
  v_token := encode(extensions.gen_random_bytes(16), 'hex');
  insert into public.telegram_link_tokens (token, user_id) values (v_token, auth.uid());
  return v_token;
end;
$function$;