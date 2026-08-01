# Cloud Playbook

Match-first **IGL freeze-time** webapp with strat packs, favorites, and optional Supabase auth/sync.

**Live:** https://jonaslundervold.github.io/cs2-playbook/  
English-only UI for v1. Sibling lightweight app (no login): [cs2-callout-app](https://github.com/JonasLundervold/cs2-callout-app).

## Product

| Screen | Job |
|--------|-----|
| **Match** | Pick (or Surprise) a call → timer + W/L + lineups |
| **Playbook** | Catalog shop + My pool (signed in), or pack toggles (guest) |
| **Settings** | Optional Discord login, live-call link, export |

Catalog levels: **Fundamentals** / **Stack** / **Advanced** (Advanced locked). Signed-in Match pool = My pool only.

Pinned lineup links live on each strat; dashed chips are **suggested** from the CSNADES catalog.

## Quick start (local demo)

No Supabase required — packs seed into `localStorage`.

```bash
npm install
npm run dev
```

## Cloud + deploy

See **[DEPLOY.md](DEPLOY.md)** for GitHub Pages, Supabase seed, and Vercel.

## Architecture

- Solo IGL v1; `team_id` reserved for Phase 5 ([TEAM.md](TEAM.md)).
- `src/lib/api.ts` → Supabase when env is set, otherwise local demo.
- Schema/RLS: `supabase/migrations/`.
