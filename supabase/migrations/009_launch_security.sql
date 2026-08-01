-- Launch hardening: freeze role flags, stop catalog injection, tighten usage bump.

-- ─── 1) Nobody can self-grant admin via profiles UPDATE ─────────────────────
create or replace function public.profiles_freeze_role_flags()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    new.is_admin := false;
    new.is_super_admin := false;
    return new;
  end if;

  -- Non–security-definer paths cannot change role flags.
  if new.is_admin is distinct from old.is_admin
     or new.is_super_admin is distinct from old.is_super_admin then
    if current_setting('app.allow_role_change', true) is distinct from 'on' then
      raise exception 'role flags are immutable';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_freeze_role_flags on profiles;
create trigger profiles_freeze_role_flags
  before insert or update on profiles
  for each row execute function public.profiles_freeze_role_flags();

-- Super-admin RPCs that change is_admin must opt in for one statement.
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

  perform set_config('app.allow_role_change', 'on', true);

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

-- ─── 2) Private packs cannot become system / steal ownership ────────────────
drop policy if exists "packs_update_own" on packs;
create policy "packs_update_own" on packs
for update to authenticated
using (owner_user_id = auth.uid() and visibility = 'private')
with check (owner_user_id = auth.uid() and visibility = 'private');

-- ─── 3) Private strats cannot move onto system packs ────────────────────────
drop policy if exists "strats_update_own" on strats;
create policy "strats_update_own" on strats
for update to authenticated
using (owner_user_id = auth.uid())
with check (
  owner_user_id = auth.uid()
  and exists (
    select 1 from packs p
    where p.id = pack_id
      and p.owner_user_id = auth.uid()
      and p.visibility = 'private'
  )
);

-- Ensure legacy broad usage policy stays gone.
drop policy if exists "strats_update_usage" on strats;

-- ─── 4) Usage bump only for visible strats ──────────────────────────────────
create or replace function public.bump_strat_usage(p_strat_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;

  update strats s
  set times_used = times_used + 1,
      last_used = now(),
      updated_at = now()
  where s.id = p_strat_id
    and exists (
      select 1 from packs p
      where p.id = s.pack_id
        and (p.visibility = 'system' or p.owner_user_id = auth.uid())
    );

  if not found then
    raise exception 'strat not found or not visible';
  end if;
end;
$$;

-- One-time bootstrap: first (and only) super admin claim by signed-in email.
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

revoke all on function public.set_admin_by_email(text, boolean) from public;
grant execute on function public.set_admin_by_email(text, boolean) to authenticated;
revoke all on function public.bump_strat_usage(uuid) from public;
grant execute on function public.bump_strat_usage(uuid) to authenticated;
revoke all on function public.claim_first_super_admin() from public;
grant execute on function public.claim_first_super_admin() to authenticated;
