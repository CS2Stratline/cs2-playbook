# AGENTS.md

## Cursor Cloud specific instructions

Cloud Playbook is a single-page **Vite + React 19 + TypeScript** web app (a CS2 IGL freeze-time playbook). There is no backend to run locally: `src/lib/api.ts` falls back to a `localStorage`-backed **local demo** mode whenever Supabase env vars are absent, so the app is fully usable without any secrets.

Standard commands live in `package.json` (`dev`, `build`, `preview`, `seed:packs`, `seed:supabase`). Notable points:

- Run the app in development with `npm run dev` (Vite dev server on http://localhost:5173/).
- There is **no separate lint step and no test framework**. `npm run build` runs `tsc --noEmit && vite build`, so use `npm run build` as the typecheck/lint gate.
- The `seed:packs` / `seed:supabase` scripts and everything under `supabase/` are **optional** — only needed to populate a real Supabase project (requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, or `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` for cloud auth). Not required for local development or the demo.
- Supabase auth/sync only activates when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (and the URL does not contain `YOUR_`); see `.env.example`. Without them the Settings login is hidden and data stays in the browser.
- Signed-in users use a personal **My pool** for Match. On first login with an empty pool, Fundamentals are auto-copied for all maps (`ensureFundamentalsSeeded` + `localStorage` flag `cs2-playbook-fundamentals-seeded:<userId>`). Guests instead toggle system packs. Advanced (pro) packs are hidden in the UI until premium.
- Each strat has `level` 1–10 (FACEIT-style execution difficulty). Icons live in `FaceitLevelIcon`; Elo brackets in `src/lib/faceitLevels.ts`. After changing catalog levels, re-seed Supabase (`npm run seed:supabase`) once migration `005_strat_level.sql` is applied.
- Content pipeline: `npm run starter` → `src/starter-library.json` → `npm run seed:packs` → `src/data/system-packs.json` → `npm run seed:supabase`.
- Routing uses `HashRouter` (URLs look like `/#/...`) because the production target is GitHub Pages under `/cs2-playbook/`. For a custom domain at site root, set `VITE_BASE_PATH=/` in the deploy workflow and update Supabase Auth redirect URLs (see `DEPLOY.md`).
- Live cloud project is already wired via GitHub Actions `VITE_SUPABASE_*` secrets. Service role is for seed/admin only — never `VITE_*`.
