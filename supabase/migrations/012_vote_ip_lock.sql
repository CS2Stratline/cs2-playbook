-- Soft abuse control: one vote slot per client IP per strat.
-- Stops casual Incognito re-votes from the same network. VPNs / mobile CGNAT can still evade.

create table if not exists strat_vote_ip_locks (
  strat_id uuid not null references strats (id) on delete cascade,
  ip_hash text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  updated_at timestamptz not null default now(),
  primary key (strat_id, ip_hash)
);

create index if not exists strat_vote_ip_locks_user_id_idx on strat_vote_ip_locks (user_id);

alter table strat_vote_ip_locks enable row level security;
revoke all on table strat_vote_ip_locks from anon, authenticated;
-- No direct client access; only security definer RPC touches this table.

create or replace function public.vote_client_ip_hash()
returns text
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_headers jsonb;
  v_ip text;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := null;
  end;

  if v_headers is null then
    return null;
  end if;

  v_ip := nullif(trim(both from coalesce(
    v_headers->>'cf-connecting-ip',
    v_headers->>'x-real-ip',
    split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1),
    ''
  )), '');

  if v_ip is null or v_ip = '' then
    return null;
  end if;

  -- Hash so raw IPs are not stored. Pepper is app-specific, not a secret vault.
  return encode(digest(v_ip || ':cs2-playbook-vote-v1', 'sha256'), 'hex');
end;
$$;

revoke all on function public.vote_client_ip_hash() from public;
grant execute on function public.vote_client_ip_hash() to authenticated;

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
      and (p.visibility = 'system' or p.owner_user_id = v_uid)
  ) then
    raise exception 'strat not found or not visible';
  end if;

  select v.value into v_prev
  from user_strat_votes v
  where v.user_id = v_uid and v.strat_id = p_strat_id;

  v_ip_hash := public.vote_client_ip_hash();

  -- Same network already voted (e.g. new Incognito anonymous user) → reuse that slot.
  if v_ip_hash is not null then
    select l.user_id, l.value into v_ip_uid, v_ip_prev
    from strat_vote_ip_locks l
    where l.strat_id = p_strat_id and l.ip_hash = v_ip_hash;

    if v_ip_uid is not null and v_ip_uid is distinct from v_uid then
      delete from user_strat_votes
      where user_id = v_ip_uid and strat_id = p_strat_id;

      if v_prev is null then
        -- Take over the previous IP vote as our starting point.
        v_prev := v_ip_prev;
      else
        -- Rare: both identities had rows — drop the IP owner's contribution from counters now.
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

  -- Same vote again clears (toggle off).
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
