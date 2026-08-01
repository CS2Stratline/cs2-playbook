# Auth — Cloud Playbook

v1 uses **Supabase Auth** (email magic link). Local demo mode runs without auth when env vars are missing.

## Team sync (Phase 5)

Not built yet. Schema reserves `team_id` on packs/strats. Build when:

1. The same book must live on 2+ devices for a full roster, and
2. Export is no longer enough.

Preferred shape: membership table + RLS on `team_id`, Match pool unchanged.
