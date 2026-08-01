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
    - OAuth2 redirect: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`  
    - Paste Client ID + Secret into Supabase Discord provider.  
    Login is **optional** — guests use the app without an account. Share `https://jonaslundervold.github.io/cs2-playbook/`.

4. Seed packs + nades:

```bash
export SUPABASE_URL=https://YOUR.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ...   # service role, not anon
npm run seed:supabase
```

5. Add the same URL/anon key as GitHub Actions secrets (or `.env.local` for `npm run dev`).
6. SQL editor: run [`003_live_share.sql`](supabase/migrations/003_live_share.sql) then [`004_fix_live_share_pgcrypto.sql`](supabase/migrations/004_fix_live_share_pgcrypto.sql) for private live-call links (Settings → Live call link when signed in).
7. After updating [`src/data/system-packs.json`](src/data/system-packs.json), re-run `npm run seed:supabase` so catalog titles/levels and new strats land in the project.

8. **Migrations (run in order in the SQL editor):**  
   `001` → `002` → `003` → `004` → `005` → `006` → `007` → `008` → `009_launch_security.sql` → `010_live_share_and_bootstrap_hardening.sql`.  
   Do **not** stop after `001` + seed — without `007`–`010`, signed-in users can escalate or leak private strats via live share.

9. **Admins / super admin (shared strat edits):**

   1. Sign in once with your Discord/email account (so a `profiles` row exists).
   2. Bootstrap **only via SQL** (in-app claim is revoked in `010` so random signups cannot own the catalog):

```sql
select set_config('app.allow_role_change', 'on', true);
update profiles p
set is_super_admin = true, is_admin = true
from auth.users u
where p.id = u.id and lower(u.email) = lower('you@example.com');
```

   3. **Settings → Admins** — add others by email (they must sign in once first).  
      - **Super admin:** edit shared strats + manage admins.  
      - **Admin:** edit shared strats only.  
      - Role flags cannot be self-granted via the profiles table (`009`).  
      - At most one super admin (`010` unique index).

Without Supabase, local demo can edit shared strats on that device only.

## Launch security checklist

- [ ] All migrations through `010_live_share_and_bootstrap_hardening.sql` applied
- [ ] Super admin bootstrapped via SQL (not open signup claim)
- [ ] Non-admin JWT cannot `update profiles set is_admin = true`
- [ ] Non-admin JWT cannot rewrite system strats / promote private packs to `system`
- [ ] Live share: setting `current_pick_id` to another user’s private strat UUID does not leak content via `get_live_call`
- [ ] Service role key never in client env or GitHub Actions `VITE_*` secrets
- [ ] Supabase Auth redirect URLs match the real domain (Pages or custom)
- [ ] Custom domain: update `VITE_BASE_PATH=/` (or `/`) and Discord/email redirects
- [ ] Soft Reddit launch: prefer guest mode first, or invite-only Discord until checklist is green

## Vercel (optional)

1. Import `JonasLundervold/cs2-playbook`.
2. Framework: Vite. Output: `dist`.
3. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. `vercel.json` already rewrites SPA paths (useful if you switch back to `BrowserRouter`).

With HashRouter, Vercel and Pages both work without rewrite tricks.

## Phase 5

See [TEAM.md](TEAM.md) — team workspaces parked; `team_id` is reserved in schema.
