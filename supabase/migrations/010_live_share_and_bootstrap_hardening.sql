-- Live-share IDOR fix, one-super-admin race guard, revoke open claim RPC,
-- server-side link allowlist on admin strat edits, private-only strat inserts.

-- ─── 1) get_live_call: only expose strats the share owner can see ───────────
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
  v_visible boolean := false;
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
    select s.* into v_strat
    from strats s
    join packs p on p.id = s.pack_id
    where s.id = v_sess.current_pick_id
      and (p.visibility = 'system' or p.owner_user_id = v_owner);

    if found then
      v_visible := true;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'has_pick', v_visible,
    'selected_map', v_sess.selected_map,
    'selected_side', v_sess.selected_side,
    'site_filter', v_sess.site_filter,
    'timer_ends_at', v_sess.timer_ends_at,
    'updated_at', v_sess.updated_at,
    'logged', v_sess.logged,
    'callout', case when v_visible then v_strat.callout else null end,
    'description', case when v_visible then v_strat.description else null end,
    'tasks', case when v_visible then to_jsonb(coalesce(v_strat.tasks, '{}'::text[])) else '[]'::jsonb end,
    'links', case when v_visible then coalesce(v_strat.links, '[]'::jsonb) else '[]'::jsonb end,
    'site', case when v_visible then v_strat.site else null end
  );
end;
$$;

-- Block writing another user's private strat id into session pick.
create or replace function public.user_sessions_pick_visible()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.current_pick_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from strats s
    join packs p on p.id = s.pack_id
    where s.id = new.current_pick_id
      and (p.visibility = 'system' or p.owner_user_id = new.user_id)
  ) then
    raise exception 'current_pick_id not visible to session owner';
  end if;

  return new;
end;
$$;

drop trigger if exists user_sessions_pick_visible on user_sessions;
create trigger user_sessions_pick_visible
  before insert or update of current_pick_id on user_sessions
  for each row execute function public.user_sessions_pick_visible();

-- ─── 2) At most one super admin; harden / revoke open claim ─────────────────
create unique index if not exists profiles_one_super_admin
  on profiles (is_super_admin)
  where is_super_admin;

create or replace function public.claim_first_super_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'sign in required';
  end if;

  perform pg_advisory_xact_lock(87201401);

  if exists (select 1 from profiles where is_super_admin) then
    raise exception 'super admin already claimed';
  end if;

  perform set_config('app.allow_role_change', 'on', true);

  update profiles
  set is_super_admin = true,
      is_admin = true,
      updated_at = now()
  where id = v_uid;

  if not found then
    raise exception 'profile missing — sign in once first';
  end if;
end;
$$;

-- Prefer SQL bootstrap (DEPLOY.md). Do not leave an open in-app claim for signup.
revoke all on function public.claim_first_super_admin() from public;
revoke all on function public.claim_first_super_admin() from anon, authenticated;

-- ─── 3) Private strat inserts must target a private pack ────────────────────
drop policy if exists "strats_insert_own" on strats;
create policy "strats_insert_own" on strats
for insert to authenticated
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1 from packs p
    where p.id = pack_id
      and p.owner_user_id = auth.uid()
      and p.visibility = 'private'
  )
);

-- ─── 4) Server-side http(s) link allowlist on admin shared edits ────────────
create or replace function public.sanitize_strat_links(p_links jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_out jsonb := '[]'::jsonb;
  v_el jsonb;
  v_url text;
  v_label text;
  v_n int := 0;
begin
  if p_links is null or jsonb_typeof(p_links) <> 'array' then
    return '[]'::jsonb;
  end if;

  for v_el in select value from jsonb_array_elements(p_links)
  loop
    exit when v_n >= 8;
    v_url := trim(both from coalesce(v_el->>'url', ''));
    v_label := left(trim(both from coalesce(v_el->>'label', '')), 80);
    if v_url ~* '^https?://[^[:space:]]+$' then
      v_out := v_out || jsonb_build_array(
        jsonb_build_object('label', v_label, 'url', v_url)
      );
      v_n := v_n + 1;
    end if;
  end loop;

  return v_out;
end;
$$;

create or replace function public.admin_update_shared_strat(
  p_id uuid,
  p_callout text,
  p_description text,
  p_tasks text[],
  p_rounds text[],
  p_site text,
  p_status text,
  p_links jsonb,
  p_level integer,
  p_map text default null,
  p_side text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_callout text := left(trim(both from coalesce(p_callout, '')), 60);
  v_description text := left(trim(both from coalesce(p_description, '')), 280);
  v_tasks text[];
  v_links jsonb := public.sanitize_strat_links(p_links);
begin
  if not public.viewer_is_admin() then
    raise exception 'not admin';
  end if;

  select coalesce(array_agg(t), '{}'::text[])
  into v_tasks
  from (
    select left(trim(both from x), 200) as t
    from unnest(coalesce(p_tasks, '{}'::text[])) as x
    where length(trim(both from x)) > 0
    limit 5
  ) s;

  update strats set
    callout = v_callout,
    description = v_description,
    tasks = v_tasks,
    rounds = coalesce(p_rounds, rounds),
    site = p_site,
    status = coalesce(nullif(p_status, ''), status),
    links = v_links,
    level = coalesce(p_level, level),
    map = coalesce(nullif(p_map, ''), map),
    side = coalesce(nullif(p_side, ''), side),
    updated_at = now()
  where id = p_id
    and owner_user_id is null
    and exists (
      select 1 from packs p
      where p.id = strats.pack_id and p.visibility = 'system'
    );

  if not found then
    raise exception 'strat not found or not a system strat';
  end if;

  update strats set
    callout = v_callout,
    description = v_description,
    tasks = v_tasks,
    rounds = coalesce(p_rounds, rounds),
    site = p_site,
    status = coalesce(nullif(p_status, ''), status),
    links = v_links,
    level = coalesce(p_level, level),
    map = coalesce(nullif(p_map, ''), map),
    side = coalesce(nullif(p_side, ''), side),
    updated_at = now()
  where source = 'catalog:' || p_id::text;
end;
$$;

revoke all on function public.sanitize_strat_links(jsonb) from public;
grant execute on function public.sanitize_strat_links(jsonb) to authenticated;
revoke all on function public.admin_update_shared_strat(
  uuid, text, text, text[], text[], text, text, jsonb, integer, text, text
) from public;
grant execute on function public.admin_update_shared_strat(
  uuid, text, text, text[], text[], text, text, jsonb, integer, text, text
) to authenticated;
revoke all on function public.get_live_call(text) from public;
grant execute on function public.get_live_call(text) to anon, authenticated;
