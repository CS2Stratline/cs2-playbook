-- Stratline schema (solo IGL v1, team_id reserved for Phase 5)

create extension if not exists "pgcrypto";

create type pack_tier as enum ('pug', 'five_stack', 'pro');
create type pack_visibility as enum ('system', 'private', 'team');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  default_tier_filter text default 'all',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table packs (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  description text not null default '',
  tier pack_tier not null default 'five_stack',
  visibility pack_visibility not null default 'private',
  owner_user_id uuid references auth.users (id) on delete cascade,
  team_id uuid, -- reserved for Phase 5 team workspaces
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);

create table strats (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references packs (id) on delete cascade,
  owner_user_id uuid references auth.users (id) on delete cascade,
  team_id uuid, -- reserved
  map text not null,
  side text not null check (side in ('T', 'CT')),
  site text check (site is null or site in ('a', 'b', 'mid', 'default')),
  callout text not null default '',
  description text not null default '',
  tasks text[] not null default '{}',
  rounds text[] not null default '{}',
  status text not null default 'ready' check (status in ('ready', 'practice')),
  links jsonb not null default '[]',
  wins int not null default 0,
  losses int not null default 0,
  times_used int not null default 0,
  last_used timestamptz,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  strat_id uuid not null references strats (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, strat_id)
);

create table user_pack_subscriptions (
  user_id uuid not null references auth.users (id) on delete cascade,
  pack_id uuid not null references packs (id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, pack_id)
);

create table nade_catalog (
  id uuid primary key default gen_random_uuid(),
  map text not null,
  type text not null,
  title_to text not null default '',
  title_from text not null default '',
  slug text not null,
  url text not null unique,
  team text,
  label text not null default '',
  label_en text not null default ''
);

create table user_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tab text not null default 'match',
  selected_map text not null default 'Mirage',
  selected_side text not null default 'T',
  site_filter text not null default 'all',
  round_filter text not null default 'all',
  include_practice boolean not null default false,
  current_pick_id uuid references strats (id) on delete set null,
  logged text check (logged is null or logged in ('win', 'loss')),
  timer_ends_at timestamptz,
  called_at timestamptz,
  updated_at timestamptz not null default now()
);

create index strats_pack_id_idx on strats (pack_id);
create index strats_map_side_idx on strats (map, side);
create index nade_catalog_map_idx on nade_catalog (map);

-- RLS
alter table profiles enable row level security;
alter table packs enable row level security;
alter table strats enable row level security;
alter table user_favorites enable row level security;
alter table user_pack_subscriptions enable row level security;
alter table nade_catalog enable row level security;
alter table user_sessions enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

create policy "packs_select_visible" on packs for select using (
  visibility = 'system'
  or owner_user_id = auth.uid()
);
create policy "packs_insert_own" on packs for insert with check (
  visibility = 'private' and owner_user_id = auth.uid()
);
create policy "packs_update_own" on packs for update using (owner_user_id = auth.uid());
create policy "packs_delete_own" on packs for delete using (owner_user_id = auth.uid());

create policy "strats_select_visible" on strats for select using (
  exists (
    select 1 from packs p
    where p.id = strats.pack_id
      and (p.visibility = 'system' or p.owner_user_id = auth.uid())
  )
);
create policy "strats_insert_own" on strats for insert with check (
  owner_user_id = auth.uid()
  and exists (select 1 from packs p where p.id = pack_id and p.owner_user_id = auth.uid())
);
create policy "strats_update_own" on strats for update using (owner_user_id = auth.uid());
create policy "strats_delete_own" on strats for delete using (owner_user_id = auth.uid());
-- system strat stats (times_used) updated via service role seed or allow authenticated update on readable rows:
create policy "strats_update_usage" on strats for update using (
  exists (
    select 1 from packs p
    where p.id = strats.pack_id and (p.visibility = 'system' or p.owner_user_id = auth.uid())
  )
);

create policy "favorites_all_own" on user_favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "subs_all_own" on user_pack_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sessions_all_own" on user_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "nades_read_auth" on nade_catalog for select to authenticated using (true);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  -- subscribe to all system packs by default
  insert into public.user_pack_subscriptions (user_id, pack_id, enabled)
  select new.id, p.id, true from public.packs p where p.visibility = 'system'
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
