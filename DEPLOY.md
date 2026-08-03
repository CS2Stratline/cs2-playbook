# Deploy Cloud Playbook

## Live (GitHub Pages)

After push to `main`, Actions deploys:

**https://cs2stratline.github.io/cs2-playbook/**

Uses `HashRouter`, so routes work on project Pages. Without Supabase secrets the site runs in **local demo** mode (packs in the browser).

Optional repo secrets for cloud builds:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase (cloud auth + sync)

1. Create a project at [supabase.com](https://supabase.com).
2. SQL editor: run [`supabase/migrations/001_cloud_playbook.sql`](supabase/migrations/001_cloud_playbook.sql).
3. Auth → enable Email (magic link). Add redirect URLs:
   - `https://cs2stratline.github.io/cs2-playbook/`
   - `http://localhost:5173/`

   Site URL must be the **playbook** path, not bare `https://cs2stratline.github.io/` (that causes a 404 after magic link).

3b. (Recommended) Authentication → Providers → **Discord** → enable.  
    Create an app at [discord.com/developers](https://discord.com/developers/applications):  
    - OAuth2 redirect: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`  
    - Paste Client ID + Secret into Supabase Discord provider.  
    Login is **optional** — guests use the app without an account. Share `https://cs2stratline.github.io/cs2-playbook/`.

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
   `001` → `002` → `003` → `004` → `005` → `006` → `007` → `008` → `009_launch_security.sql` → `010_live_share_and_bootstrap_hardening.sql` → `011_strat_votes.sql`.  
   Do **not** stop after `001` + seed — without `007`–`010`, signed-in users can escalate or leak private strats via live share.  
   `011` enables community upvote/downvote. Or: `SUPABASE_ACCESS_TOKEN=sbp_… npm run migrate:votes` (also turns on **Anonymous Sign-Ins** + **Manual linking** so guests can vote without Discord/email).

9. **Anonymous voting (no login UI):** Authentication → Providers → enable **Anonymous Sign-Ins**. Optionally enable **Manual linking** so Discord/email upgrades keep the same user id (and their votes).

10. **Admins / super admin (shared strat edits):**

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

- [x] All migrations through `010_live_share_and_bootstrap_hardening.sql` applied
- [ ] `011_strat_votes.sql` applied + Anonymous Sign-Ins enabled (guest voting)
- [x] Super admin bootstrapped via SQL (not open signup claim)
- [x] Non-admin JWT cannot `update profiles set is_admin = true` (returns `role flags are immutable`)
- [x] Non-admin JWT cannot rewrite system strats / promote private packs to `system`
- [x] Open `claim_first_super_admin` denied for authenticated/anon (`permission denied`)
- [ ] Live share: setting `current_pick_id` to another user’s private strat UUID does not leak content via `get_live_call` (spot-check optional; guarded in `010`)
- [x] Service role key never in client env or GitHub Actions `VITE_*` secrets
- [x] Supabase Auth redirect URLs match Pages + localhost; Discord login verified
- [ ] Custom domain: set `VITE_BASE_PATH=/` in deploy workflow, attach DNS, update Auth allowlist
- [ ] Soft Reddit launch: prefer guest mode first, or invite-only Discord until you’re ready for open signup
- [x] Cloud catalog re-seeded from `system-packs.json` (`npm run seed:supabase`)

## Custom domain (when ready)

1. Buy domain / point DNS at GitHub Pages or Vercel.
2. In `.github/workflows/deploy.yml`, set `VITE_BASE_PATH: /` if the site is at the domain root.
3. Supabase Auth → add `https://your.domain/` to Site URL / Redirect URLs (keep Pages URL during transition).
4. Discord app callback stays `https://YOUR.supabase.co/auth/v1/callback` (no change).
5. Redeploy and smoke-test Discord + magic link + live share link.

## Vercel (optional)

1. Import `CS2Stratline/cs2-playbook`.
2. Framework: Vite. Output: `dist`.
3. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. `vercel.json` already rewrites SPA paths (useful if you switch back to `BrowserRouter`).

With HashRouter, Vercel and Pages both work without rewrite tricks.

## Phase 5

See [TEAM.md](TEAM.md) — team workspaces parked; `team_id` is reserved in schema.
