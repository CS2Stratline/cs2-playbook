-- Owners can delete their own strats; admins / super admins can delete any.

drop policy if exists "strats_delete_own" on strats;
drop policy if exists "strats_delete_own_or_admin" on strats;

create policy "strats_delete_own_or_admin" on strats
for delete to authenticated
using (
  owner_user_id = auth.uid()
  or public.viewer_is_admin()
);
