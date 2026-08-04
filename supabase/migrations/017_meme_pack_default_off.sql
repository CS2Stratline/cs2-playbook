-- New guests were getting Meme (and Advanced) On because handle_new_user
-- subscribed to every system pack with enabled=true. Match should only
-- default Starter Pack On.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
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

-- Heal existing rows: Meme and Advanced Off for everyone (Starter unchanged).
update public.user_pack_subscriptions ups
set enabled = false
from public.packs p
where ups.pack_id = p.id
  and p.visibility = 'system'
  and p.slug in ('meme-strats', 'pro-structure')
  and ups.enabled = true;
