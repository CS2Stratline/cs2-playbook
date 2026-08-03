# Auth: Cloud Playbook

v1 uses **Supabase Auth**: Discord (recommended) and email magic link.

When `VITE_SUPABASE_*` is set, visitors also get a **silent anonymous session** (no login UI) so community strat votes work with one vote per browser. Discord/email is optional and upgrades that identity (Manual linking) so My pool / favorites can sync across devices.

Without `VITE_SUPABASE_*`, the app runs as a local demo (no cloud votes).

Redirect URL is computed at runtime as `origin + import.meta.env.BASE_URL` (`authRedirectTo()` in `src/lib/supabase.ts`). With HashRouter on GitHub Pages that is typically:

- `https://cs2stratline.github.io/cs2-playbook/`
- `http://localhost:5173/` (local Vite)

Add those (and any custom domain) under Supabase → Authentication → URL configuration. Discord’s OAuth callback stays on the Supabase project (`https://YOUR.supabase.co/auth/v1/callback`).

Enable **Anonymous Sign-Ins** (and ideally **Manual linking**) under Authentication → Providers. Schema for votes: migrations `011`–`012` (see [DEPLOY.md](./DEPLOY.md)).

Super admin is bootstrapped via SQL only (see [DEPLOY.md](./DEPLOY.md)); then grant other admins in Settings → Admins.

## Team sync (Phase 5)

Not built yet. Schema reserves `team_id` on packs/strats. Build when:

1. The same book must live on 2+ devices for a full roster, and
2. Export is no longer enough.

Preferred shape: membership table + RLS on `team_id`, Match pool unchanged.
