-- Private live-call share links (read-only for teammates, no login required)

create table if not exists live_shares (
  token text primary key,
  owner_user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table live_shares enable row level security;

drop policy if exists "live_shares_own" on live_shares;
create policy "live_shares_own" on live_shares for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- Token helpers use extensions.gen_random_bytes (see 004_fix_live_share_pgcrypto.sql)
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

create or replace function public.get_live_call(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_sess user_sessions%rowtype;
  v_strat strats%rowtype;
begin
  select owner_user_id into v_owner from live_shares where token = p_token;
  if v_owner is null then
    return null;
  end if;

  select * into v_sess from user_sessions where user_id = v_owner;

  if not found then
    return jsonb_build_object(
      'ok', true,
      'has_pick', false,
      'selected_map', 'Mirage',
      'selected_side', 'T',
      'site_filter', 'all',
      'timer_ends_at', null,
      'updated_at', null,
      'logged', null,
      'callout', null,
      'description', null,
      'tasks', '[]'::jsonb,
      'links', '[]'::jsonb,
      'site', null
    );
  end if;

  if v_sess.current_pick_id is not null then
    select * into v_strat from strats where id = v_sess.current_pick_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'has_pick', v_strat.id is not null,
    'selected_map', v_sess.selected_map,
    'selected_side', v_sess.selected_side,
    'site_filter', v_sess.site_filter,
    'timer_ends_at', v_sess.timer_ends_at,
    'updated_at', v_sess.updated_at,
    'logged', v_sess.logged,
    'callout', v_strat.callout,
    'description', v_strat.description,
    'tasks', to_jsonb(coalesce(v_strat.tasks, '{}'::text[])),
    'links', coalesce(v_strat.links, '[]'::jsonb),
    'site', v_strat.site
  );
end;
$$;

grant execute on function public.ensure_live_share() to authenticated;
grant execute on function public.regenerate_live_share() to authenticated;
grant execute on function public.get_live_call(text) to anon, authenticated;
