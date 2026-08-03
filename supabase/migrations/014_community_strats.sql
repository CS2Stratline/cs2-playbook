-- Community strats: user-authored calls can be public (is_private = false).
-- Existing user rows stay private. System catalog rows stay non-owned (is_private unused).

alter table strats
  add column if not exists is_private boolean not null default true;

comment on column strats.is_private is
  'When true, only the owner can read. When false (and owner_user_id set), visible in Community.';

-- Backfill: keep every existing owned strat private; system rows stay default true (ignored).
update strats
set is_private = true
where owner_user_id is not null;

create index if not exists strats_community_idx
  on strats (map, side)
  where owner_user_id is not null and is_private = false;

-- Readable: system pack, own private pack, OR public user-authored strat.
drop policy if exists "strats_select_visible" on strats;
create policy "strats_select_visible" on strats for select using (
  exists (
    select 1 from packs p
    where p.id = strats.pack_id
      and (
        p.visibility = 'system'
        or p.owner_user_id = auth.uid()
      )
  )
  or (
    owner_user_id is not null
    and is_private = false
  )
);

-- Owners may flip is_private on update (still must stay on their private pack).
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

-- Votes allowed on system strats, own strats, and public community strats.
create or replace function public.set_strat_vote(p_strat_id uuid, p_value int)
returns table (upvotes int, downvotes int, my_vote int)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_prev smallint;
  v_next smallint;
  v_up int;
  v_down int;
  v_ip_hash text;
  v_ip_uid uuid;
  v_ip_prev smallint;
begin
  if v_uid is null then
    raise exception 'sign in required';
  end if;

  if p_value is null or p_value not in (-1, 0, 1) then
    raise exception 'vote must be -1, 0, or 1';
  end if;

  if not exists (
    select 1
    from strats s
    join packs p on p.id = s.pack_id
    where s.id = p_strat_id
      and (
        p.visibility = 'system'
        or p.owner_user_id = v_uid
        or (s.owner_user_id is not null and s.is_private = false)
      )
  ) then
    raise exception 'strat not found or not visible';
  end if;

  select v.value into v_prev
  from user_strat_votes v
  where v.user_id = v_uid and v.strat_id = p_strat_id;

  v_ip_hash := public.vote_client_ip_hash();

  if v_ip_hash is not null then
    select l.user_id, l.value into v_ip_uid, v_ip_prev
    from strat_vote_ip_locks l
    where l.strat_id = p_strat_id and l.ip_hash = v_ip_hash;

    if v_ip_uid is not null and v_ip_uid is distinct from v_uid then
      delete from user_strat_votes
      where user_id = v_ip_uid and strat_id = p_strat_id;

      if v_prev is null then
        v_prev := v_ip_prev;
      else
        update strats s
        set
          upvotes = greatest(0, s.upvotes - case when v_ip_prev = 1 then 1 else 0 end),
          downvotes = greatest(0, s.downvotes - case when v_ip_prev = -1 then 1 else 0 end),
          updated_at = now()
        where s.id = p_strat_id;
      end if;
    elsif v_ip_uid = v_uid and v_prev is null then
      v_prev := v_ip_prev;
    end if;
  end if;

  v_next := case when p_value = 0 then null else p_value::smallint end;

  if v_prev is not null and v_next is not null and v_prev = v_next then
    v_next := null;
  end if;

  if v_prev is null and v_next is null then
    null;
  elsif v_prev is null and v_next is not null then
    insert into user_strat_votes (user_id, strat_id, value)
    values (v_uid, p_strat_id, v_next)
    on conflict (user_id, strat_id) do update
      set value = excluded.value, updated_at = now();
  elsif v_prev is not null and v_next is null then
    delete from user_strat_votes
    where user_id = v_uid and strat_id = p_strat_id;
  else
    insert into user_strat_votes (user_id, strat_id, value)
    values (v_uid, p_strat_id, v_next)
    on conflict (user_id, strat_id) do update
      set value = excluded.value, updated_at = now();
  end if;

  update strats s
  set
    upvotes = greatest(0, s.upvotes
      + case when v_next = 1 then 1 else 0 end
      - case when v_prev = 1 then 1 else 0 end),
    downvotes = greatest(0, s.downvotes
      + case when v_next = -1 then 1 else 0 end
      - case when v_prev = -1 then 1 else 0 end),
    updated_at = now()
  where s.id = p_strat_id
  returning s.upvotes, s.downvotes into v_up, v_down;

  if v_ip_hash is not null then
    if v_next is null then
      delete from strat_vote_ip_locks
      where strat_id = p_strat_id and ip_hash = v_ip_hash;
    else
      insert into strat_vote_ip_locks (strat_id, ip_hash, user_id, value, updated_at)
      values (p_strat_id, v_ip_hash, v_uid, v_next, now())
      on conflict (strat_id, ip_hash) do update
        set user_id = excluded.user_id,
            value = excluded.value,
            updated_at = now();
    end if;
  end if;

  return query select v_up, v_down, coalesce(v_next, 0)::int;
end;
$$;

revoke all on function public.set_strat_vote(uuid, int) from public;
grant execute on function public.set_strat_vote(uuid, int) to authenticated;
