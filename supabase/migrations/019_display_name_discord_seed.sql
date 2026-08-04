-- Seed profiles.display_name from Discord username fields when available.
-- Users can still edit their Stratline username in Settings (profiles_update_own).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := nullif(trim(both from coalesce(
    new.raw_user_meta_data->>'preferred_username',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->'custom_claims'->>'global_name',
    new.raw_user_meta_data->'custom_claims'->>'username',
    new.raw_user_meta_data->>'user_name',
    split_part(coalesce(new.email, ''), '@', 1)
  )), '');

  if v_name is not null and char_length(v_name) > 24 then
    v_name := left(v_name, 24);
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, v_name)
  on conflict (id) do nothing;

  -- Only Starter Pack On by default (legacy essentials-pug slug). Meme / Advanced stay Off.
  insert into public.user_pack_subscriptions (user_id, pack_id, enabled)
  select
    new.id,
    p.id,
    (p.slug in ('starter-pack', 'essentials-pug'))
  from public.packs p
  where p.visibility = 'system'
  on conflict do nothing;

  return new;
end;
$$;
