-- Optional: after 001_cloud_playbook.sql, seed from exported JSON via dashboard
-- or use the app local demo (src/data/system-packs.json) without cloud.
--
-- For production cloud, prefer a one-off Node script with service role key
-- that upserts packs + strats from src/data/system-packs.json.
--
-- Phase 5: add teams / team_members tables; set packs.visibility = 'team'
-- and filter RLS on team_id.

comment on column packs.team_id is 'Phase 5 team workspace — unused in v1';
comment on column strats.team_id is 'Phase 5 team workspace — unused in v1';
