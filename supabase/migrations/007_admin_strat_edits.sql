-- Admin shared-strat edits + safe usage bump (replaces broad strats_update_usage).

alter table profiles
  add column if not exists is_admin boolean not null default false;

-- Too broad: any auth user could rewrite system strat content.
drop policy if exists "strats_update_usage" on strats;

-- Admins may update system catalog rows directly (also covered by RPC below).
create policy "strats_update_system_admin" on strats
for update to authenticated
using (
  exists (select 1 from profiles pr where pr.id = auth.uid() and pr.is_admin)
  and exists (
    select 1 from packs p
    where p.id = strats.pack_id and p.visibility = 'system'
  )
  and owner_user_id is null
)
with check (
  exists (select 1 from profiles pr where pr.id = auth.uid() and pr.is_admin)
  and owner_user_id is null
  and exists (
    select 1 from packs p
    where p.id = strats.pack_id and p.visibility = 'system'
  )
);

-- Edit a system strat and sync personal pool copies (source = catalog:<id>).
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
  v_admin boolean;
begin
  select is_admin into v_admin from profiles where id = auth.uid();
  if coalesce(v_admin, false) is not true then
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

revoke all on function public.admin_update_shared_strat(
  uuid, text, text, text[], text[], text, text, jsonb, integer, text, text
) from public;
grant execute on function public.admin_update_shared_strat(
  uuid, text, text, text[], text[], text, text, jsonb, integer, text, text
) to authenticated;

-- Usage counters without allowing arbitrary column writes.
create or replace function public.bump_strat_usage(p_strat_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update strats
  set times_used = times_used + 1,
      last_used = now(),
      updated_at = now()
  where id = p_strat_id;
end;
$$;

revoke all on function public.bump_strat_usage(uuid) from public;
grant execute on function public.bump_strat_usage(uuid) to authenticated;
