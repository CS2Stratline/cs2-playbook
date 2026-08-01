-- Fix: gen_random_bytes lives in extensions schema on Supabase

create extension if not exists pgcrypto with schema extensions;

create or replace function public.ensure_live_share()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select token into v_token from live_shares where owner_user_id = auth.uid();
  if v_token is not null then
    return v_token;
  end if;
  v_token := encode(gen_random_bytes(16), 'hex');
  insert into live_shares (token, owner_user_id) values (v_token, auth.uid());
  return v_token;
end;
$$;

create or replace function public.regenerate_live_share()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from live_shares where owner_user_id = auth.uid();
  v_token := encode(gen_random_bytes(16), 'hex');
  insert into live_shares (token, owner_user_id) values (v_token, auth.uid());
  return v_token;
end;
$$;

grant execute on function public.ensure_live_share() to authenticated;
grant execute on function public.regenerate_live_share() to authenticated;
