# Phase 5: Team workspaces (parked)

v1 is **solo IGL**. Schema already has nullable `team_id` on `packs` and `strats`.

When building teams:

1. Add `teams` + `team_members` (role: owner/igl/player).
2. Set `packs.visibility = 'team'` and `team_id`.
3. Extend RLS: member can select team packs/strats.
4. Lobby: share pack subscription defaults per team.
5. Keep Match eligible = union of enabled packs; no UI rewrite required.

Do not build live 5-phone call sync in Phase 5 unless product demand is clear.
