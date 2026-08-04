-- Clear Supabase DB advisor noise / drift:
-- 1) Drop leftover debug SECURITY DEFINER RPC
-- 2) Pin search_path on trigger/helper functions
-- 3) Re-assert EXECUTE grants (revoke PUBLIC + anon; keep intentional client RPCs)

-- ─── 1) Debug leftover ──────────────────────────────────────────────────────
drop function if exists public._test_vote_guc(uuid);

-- ─── 2) Mutable search_path (lint 0011) ─────────────────────────────────────
alter function public.sanitize_strat_links(jsonb) set search_path = public;
alter function public.profiles_freeze_role_flags() set search_path = public;
alter function public.strats_preserve_vote_counters() set search_path = public;

-- ─── 3) EXECUTE surface ─────────────────────────────────────────────────────
-- Trigger-only / internal helpers: no client RPC.
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;
revoke all on function public.profiles_freeze_role_flags() from public;
revoke all on function public.profiles_freeze_role_flags() from anon, authenticated;
revoke all on function public.strats_preserve_vote_counters() from public;
revoke all on function public.strats_preserve_vote_counters() from anon, authenticated;
revoke all on function public.sanitize_strat_links(jsonb) from public;
revoke all on function public.sanitize_strat_links(jsonb) from anon, authenticated;
revoke all on function public.vote_client_ip_hash() from public;
revoke all on function public.vote_client_ip_hash() from anon, authenticated;
revoke all on function public.claim_first_super_admin() from public;
revoke all on function public.claim_first_super_admin() from anon, authenticated;

-- Admin / role helpers: signed-in only (function body still enforces admin checks).
revoke all on function public.admin_update_shared_strat(
  uuid, text, text, text[], text[], text, text, jsonb, integer, text, text
) from public;
revoke all on function public.admin_update_shared_strat(
  uuid, text, text, text[], text[], text, text, jsonb, integer, text, text
) from anon;
grant execute on function public.admin_update_shared_strat(
  uuid, text, text, text[], text[], text, text, jsonb, integer, text, text
) to authenticated;

revoke all on function public.set_admin_by_email(text, boolean) from public;
revoke all on function public.set_admin_by_email(text, boolean) from anon;
grant execute on function public.set_admin_by_email(text, boolean) to authenticated;

revoke all on function public.list_admin_profiles() from public;
revoke all on function public.list_admin_profiles() from anon;
grant execute on function public.list_admin_profiles() to authenticated;

revoke all on function public.viewer_is_admin() from public;
revoke all on function public.viewer_is_admin() from anon;
grant execute on function public.viewer_is_admin() to authenticated;

revoke all on function public.viewer_is_super_admin() from public;
revoke all on function public.viewer_is_super_admin() from anon;
grant execute on function public.viewer_is_super_admin() to authenticated;

-- Match / pool helpers: signed-in (incl. silent anonymous sessions = authenticated).
revoke all on function public.bump_strat_usage(uuid) from public;
revoke all on function public.bump_strat_usage(uuid) from anon;
grant execute on function public.bump_strat_usage(uuid) to authenticated;

revoke all on function public.set_strat_vote(uuid, int) from public;
revoke all on function public.set_strat_vote(uuid, int) from anon;
grant execute on function public.set_strat_vote(uuid, int) to authenticated;

revoke all on function public.ensure_live_share() from public;
revoke all on function public.ensure_live_share() from anon;
grant execute on function public.ensure_live_share() to authenticated;

revoke all on function public.regenerate_live_share() from public;
revoke all on function public.regenerate_live_share() from anon;
grant execute on function public.regenerate_live_share() to authenticated;

-- Live call poll: intentional for logged-out teammates with a share token.
revoke all on function public.get_live_call(text) from public;
grant execute on function public.get_live_call(text) to anon, authenticated;
