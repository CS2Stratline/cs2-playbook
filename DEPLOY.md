# Deploy Cloud Playbook

## Live (GitHub Pages)

After push to `main`, Actions deploys:

**https://jonaslundervold.github.io/cs2-playbook/**

Uses `HashRouter`, so routes work on project Pages. Without Supabase secrets the site runs in **local demo** mode (packs in the browser).

Optional repo secrets for cloud builds:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase (cloud auth + sync)

1. Create a project at [supabase.com](https://supabase.com).
2. SQL editor: run [`supabase/migrations/001_cloud_playbook.sql`](supabase/migrations/001_cloud_playbook.sql).
3. Auth → enable Email (magic link). Add redirect URLs:
   - `https://jonaslundervold.github.io/cs2-playbook/`
   - `http://localhost:5173/`

   Site URL must be the **playbook** path, not bare `https://jonaslundervold.github.io/` (that causes a 404 after magic link).

3b. (Recommended) Authentication → Providers → **Discord** → enable.  
    Create an app at [discord.com/developers](https://discord.com/developers/applications):  
    - OAuth2 redirect: `https://xlevljkrjlyfrqkowdmg.supabase.co/auth/v1/callback`  
    - Paste Client ID + Secret into Supabase Discord provider.  
    Login is **optional** — guests use the app without an account. Share `https://jonaslundervold.github.io/cs2-playbook/`.

4. Seed packs + nades:

```bash
export SUPABASE_URL=https://YOUR.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ...   # service role, not anon
npm run seed:supabase
```

5. Add the same URL/anon key as GitHub Actions secrets (or `.env.local` for `npm run dev`).

## Vercel (optional)

1. Import `JonasLundervold/cs2-playbook`.
2. Framework: Vite. Output: `dist`.
3. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. `vercel.json` already rewrites SPA paths (useful if you switch back to `BrowserRouter`).

With HashRouter, Vercel and Pages both work without rewrite tricks.

## Phase 5

See [TEAM.md](TEAM.md) — team workspaces parked; `team_id` is reserved in schema.
