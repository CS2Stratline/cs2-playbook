# Cloud Playbook

Match-first **IGL freeze-time** webapp with strat packs, favorites, and optional Supabase auth/sync.

English-only UI for v1. Sibling lightweight app (no login): [cs2-callout-app](https://github.com/JonasLundervold/cs2-callout-app).

## Product

| Screen | Job |
|--------|-----|
| **Packs** | Enable PUG / 5-stack / Pro (and private) packs before the game |
| **Match** | Filters → Surprise or Pick → call card + timer + W/L |
| **Book** | Browse/edit strats, favorites, lineup chips |
| **Settings** | Account, export, local demo reset |

Pinned lineup links live on each strat; dashed chips are **suggested** from the CSNADES catalog (same matcher idea as the lite app).

## Quick start (local demo)

No Supabase required — packs seed into `localStorage`.

```bash
npm install
npm run dev
```

Open the URL on your phone (same Wi‑Fi) for freeze-time practice.

## Cloud mode (Supabase + Vercel)

1. Create a Supabase project.
2. Run [`supabase/migrations/001_cloud_playbook.sql`](supabase/migrations/001_cloud_playbook.sql) in the SQL editor.
3. Seed system packs (see below) or insert via dashboard.
4. Copy [`.env.example`](.env.example) → `.env.local` with project URL + anon key.
5. Enable Email magic link auth; set redirect URL to your Vercel domain.
6. Deploy to Vercel (`vercel.json` SPA rewrites included).

```bash
npm run build
```

### Seeding system packs into Supabase

`src/data/system-packs.json` is generated from the verified starter library:

```bash
npm run seed:packs
```

Load packs/strats with a small script or SQL insert (service role). New users auto-subscribe to all `visibility = system` packs via trigger.

### Nade catalog

Client ships with `src/csnades-catalog.json` for suggestions. Optional: import into `nade_catalog` for server-side queries later.

## Architecture notes

- Solo IGL v1; `team_id` columns reserved for Phase 5 team workspaces.
- Data API in `src/lib/api.ts` talks to Supabase when env is set, otherwise local demo store.
- Schema/RLS in `supabase/migrations/`.

## Phase 5 (parked)

Team invites, shared packs (`visibility = team`), conflict rules — schema is ready; Match UX stays the same.
