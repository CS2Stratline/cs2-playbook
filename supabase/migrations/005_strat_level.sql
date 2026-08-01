-- FACEIT-style execution difficulty on each strat (1–10).
-- Not player Elo — how hard the call is to run in freeze time.

alter table strats
  add column if not exists level smallint not null default 5
  check (level between 1 and 10);

comment on column strats.level is 'FACEIT-style execution difficulty 1–10';
