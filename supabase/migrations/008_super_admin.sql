-- Super admin can grant/revoke regular admins in-app.
-- Bootstrap once via SQL (see DEPLOY.md); after that use Settings → Admins.

alter table profiles
  add column if not exists is_super_admin boolean not null default false;

-- Super admins are always admins for shared edits.
update profiles set is_admin = true where is_super_admin = true and is_admin = false;

create or replace function public.viewer_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (is_admin or is_super_admin) from profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.viewer_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_super_admin from profiles where id = auth.uid()),
    false
  );
$$;

-- Allow super admins through the same system-strat update policy.
drop policy if exists "strats_update_system_admin" on strats;
create policy "strats_update_system_admin" on strats
for update to authenticated
using (
  public.viewer_is_admin()
  and owner_user_id is null
  and exists (
    select 1 from packs p
    where p.id = strats.pack_id and p.visibility = 'system'
  )
)
with check (
  public.viewer_is_admin()
  and owner_user_id is null
  and exists (
    select 1 from packs p
    where p.id = strats.pack_id and p.visibility = 'system'
  )
);

-- Shared strat edits: admin OR super_admin
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
begin
  if not public.viewer_is_admin() then
    raise exception 'not admin';
  end if;

  update strats set
    callout = p_callout,
    description = p_description,
    tasks = p_tasks,
    rounds = coalesce(p_rounds, rounds),
    site = p_site,
    status = coalesce(nullif(p_status, ''), status),
    links = coalesce(p_links, links),
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
    callout = p_callout,
    description = p_description,
    tasks = p_tasks,
    rounds = coalesce(p_rounds, rounds),
    site = p_site,
    status = coalesce(nullif(p_status, ''), status),
    links = coalesce(p_links, links),
    level = coalesce(p_level, level),
    map = coalesce(nullif(p_map, ''), map),
    side = coalesce(nullif(p_side, ''), side),
    updated_at = now()
  where source = 'catalog:' || p_id::text;
end;
$$;

-- List admins (email from auth.users). Super admin only.
create or replace function public.list_admin_profiles()
returns table (
  id uuid,
  display_name text,
  email text,
  is_admin boolean,
  is_super_admin boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.viewer_is_super_admin() then
    raise exception 'not super admin';
  end if;

  return query
  select
    p.id,
    p.display_name,
    u.email::text,
    (p.is_admin or p.is_super_admin) as is_admin,
    p.is_super_admin
  from profiles p
  join auth.users u on u.id = p.id
  where p.is_admin or p.is_super_admin
  order by p.is_super_admin desc, u.email;
end;
$$;

-- Grant/revoke regular admin by email. Super admin only.
-- Cannot change super_admin flags here (bootstrap stays SQL-only).
create or replace function public.set_admin_by_email(p_email text, p_is_admin boolean)
returns table (
  id uuid,
  display_name text,
  email text,
  is_admin boolean,
  is_super_admin boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_email text := lower(trim(p_email));
begin
  if not public.viewer_is_super_admin() then
    raise exception 'not super admin';
  end if;
  if v_email is null or v_email = '' then
    raise exception 'email required';
  end if;

  select u.id into v_uid from auth.users u where lower(u.email) = v_email limit 1;
  if v_uid is null then
    raise exception 'no user with that email — they must sign in once first';
  end if;

  if exists (select 1 from profiles where id = v_uid and is_super_admin) then
    raise exception 'cannot change super admin via this action';
  end if;

  update profiles
  set is_admin = coalesce(p_is_admin, false),
      updated_at = now()
  where id = v_uid;

  if not found then
    raise exception 'profile missing — user must sign in once first';
  end if;

  return query
  select
    p.id,
    p.display_name,
    u.email::text,
    p.is_admin,
    p.is_super_admin
  from profiles p
  join auth.users u on u.id = p.id
  where p.id = v_uid;
end;
$$;

revoke all on function public.viewer_is_admin() from public;
revoke all on function public.viewer_is_super_admin() from public;
revoke all on function public.list_admin_profiles() from public;
revoke all on function public.set_admin_by_email(text, boolean) from public;

grant execute on function public.viewer_is_admin() to authenticated;
grant execute on function public.viewer_is_super_admin() to authenticated;
grant execute on function public.list_admin_profiles() to authenticated;
grant execute on function public.set_admin_by_email(text, boolean) to authenticated;
grant execute on function public.admin_update_shared_strat(
  uuid, text, text, text[], text[], text, text, jsonb, integer, text, text
) to authenticated;
