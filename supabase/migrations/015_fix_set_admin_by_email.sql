-- Fix ambiguous column refs in set_admin_by_email (RETURNS TABLE vars vs profiles.id).
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

  if exists (select 1 from profiles where profiles.id = v_uid and profiles.is_super_admin) then
    raise exception 'cannot change super admin via this action';
  end if;

  perform set_config('app.allow_role_change', 'on', true);

  update profiles
  set is_admin = coalesce(p_is_admin, false),
      updated_at = now()
  where profiles.id = v_uid;

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
