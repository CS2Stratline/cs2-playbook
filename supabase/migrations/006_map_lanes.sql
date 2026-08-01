-- Map-specific T-side approach lanes (Nuke: outside, ramp).
alter table public.strats drop constraint if exists strats_site_check;
alter table public.strats
  add constraint strats_site_check
  check (site is null or site in ('a', 'b', 'mid', 'default', 'outside', 'ramp'));
