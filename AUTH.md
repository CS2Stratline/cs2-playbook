# Auth — Cloud Playbook

v1 uses **Supabase Auth**: Discord (recommended) and email magic link. Guest / local demo mode runs without auth when `VITE_SUPABASE_*` is missing.

Redirect URL is computed at runtime as `origin + import.meta.env.BASE_URL` (`authRedirectTo()` in `src/lib/supabase.ts`). With HashRouter on GitHub Pages that is typically:

- `https://cs2startline.github.io/cs2-playbook/`
- `http://localhost:5173/` (local Vite)

Add those (and any custom domain) under Supabase → Authentication → URL configuration. Discord’s OAuth callback stays on the Supabase project (`https://YOUR.supabase.co/auth/v1/callback`).

Super admin is bootstrapped via SQL only (see [DEPLOY.md](./DEPLOY.md)); then grant other admins in Settings → Admins.

## Team sync (Phase 5)

Not built yet. Schema reserves `team_id` on packs/strats. Build when:

1. The same book must live on 2+ devices for a full roster, and
2. Export is no longer enough.

Preferred shape: membership table + RLS on `team_id`, Match pool unchanged.
