-- Strat upvote / downvote: per-user votes + denormalized counters on strats.

alter table strats
  add column if not exists upvotes int not null default 0,
  add column if not exists downvotes int not null default 0;

alter table strats
  drop constraint if exists strats_upvotes_nonneg,
  drop constraint if exists strats_downvotes_nonneg;

alter table strats
  add constraint strats_upvotes_nonneg check (upvotes >= 0),
  add constraint strats_downvotes_nonneg check (downvotes >= 0);

create table if not exists user_strat_votes (
  user_id uuid not null references auth.users (id) on delete cascade,
  strat_id uuid not null references strats (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, strat_id)
);

create index if not exists user_strat_votes_strat_id_idx on user_strat_votes (strat_id);

alter table user_strat_votes enable row level security;

drop policy if exists "votes_select_own" on user_strat_votes;
drop policy if exists "votes_insert_own" on user_strat_votes;
drop policy if exists "votes_update_own" on user_strat_votes;
drop policy if exists "votes_delete_own" on user_strat_votes;

-- Users can read their own votes (scores come from strats columns for everyone).
create policy "votes_select_own" on user_strat_votes
  for select to authenticated
  using (user_id = auth.uid());

-- Mutations go through set_strat_vote RPC so counters stay consistent.
revoke all on table user_strat_votes from anon, authenticated;
grant select on table user_strat_votes to authenticated;

create or replace function public.set_strat_vote(p_strat_id uuid, p_value int)
returns table (upvotes int, downvotes int, my_vote int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_prev smallint;
  v_next smallint;
  v_up int;
  v_down int;
begin
  if v_uid is null then
    raise exception 'sign in required';
  end if;

  if p_value is null or p_value not in (-1, 0, 1) then
    raise exception 'vote must be -1, 0, or 1';
  end if;

  -- Must be able to see the strat (system pack or own private pack).
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

  v_next := case when p_value = 0 then null else p_value::smallint end;

  -- Same vote again clears (toggle off).
  if v_prev is not null and v_next is not null and v_prev = v_next then
    v_next := null;
  end if;

  if v_prev is null and v_next is null then
    null; -- no-op
  elsif v_prev is null and v_next is not null then
    insert into user_strat_votes (user_id, strat_id, value)
    values (v_uid, p_strat_id, v_next);
  elsif v_prev is not null and v_next is null then
    delete from user_strat_votes
    where user_id = v_uid and strat_id = p_strat_id;
  else
    update user_strat_votes
    set value = v_next, updated_at = now()
    where user_id = v_uid and strat_id = p_strat_id;
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

  return query select v_up, v_down, coalesce(v_next, 0)::int;
end;
$$;

revoke all on function public.set_strat_vote(uuid, int) from public;
grant execute on function public.set_strat_vote(uuid, int) to authenticated;
