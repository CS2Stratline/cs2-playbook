# Cloud Playbook

Match-first **IGL freeze-time** webapp with strat packs, favorites (signed-in: add to My pool + pin), and optional Supabase auth/sync.

**Live:** https://cs2startline.github.io/cs2-playbook/  
English-only UI for v1. Sibling lightweight app (no login): [cs2-callout-app](https://github.com/JonasLundervold/cs2-callout-app).

## Product

| Screen | Job |
|--------|-----|
| **Match** | Pick (or Surprise) a call → tasks + lineups |
| **Playbook** | Pack toggles for Match (Fundamentals + Stack). Signed in: also My pool / favorites |
| **Settings** | Optional Discord login, live-call link, export |

Day-1 Match is ready immediately via Fundamentals (on by default) for guests and signed-in users. Stack is optional depth; Advanced is hidden until premium.

Strats carry a FACEIT-style **execution level** (1–10): how hard the call is to run in freeze time (not player Elo). UI theme uses FACEIT orange `#FF5500` on a dark shell.

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
