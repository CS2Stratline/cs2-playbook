-- Expose usernames for Community strat attribution without opening full profiles.

create or replace function public.author_display_names(p_ids uuid[])
returns table (
  id uuid,
  display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, nullif(trim(both from p.display_name), '') as display_name
  from public.profiles p
  where p.id = any (p_ids)
    and (
      p.id = auth.uid()
      or exists (
        select 1
        from public.strats s
        where s.owner_user_id = p.id
          and s.is_private = false
      )
    );
$$;

revoke all on function public.author_display_names(uuid[]) from public;
grant execute on function public.author_display_names(uuid[]) to authenticated;
-- Anonymous guests can browse Community and should see author names too.
grant execute on function public.author_display_names(uuid[]) to anon;
