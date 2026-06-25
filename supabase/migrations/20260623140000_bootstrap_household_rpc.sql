-- Fix household bootstrap: client INSERT + RETURNING failed SELECT RLS
-- because the user is not a household_member until after both rows exist.

create or replace function public.bootstrap_household(p_name text default 'My Household')
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_household public.households;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select h.*
  into v_household
  from public.household_members hm
  join public.households h on h.id = hm.household_id
  where hm.user_id = v_user
  limit 1;

  if found then
    return v_household;
  end if;

  insert into public.households (name)
  values (coalesce(nullif(trim(p_name), ''), 'My Household'))
  returning * into v_household;

  insert into public.household_members (household_id, user_id, role)
  values (v_household.id, v_user, 'owner');

  return v_household;
end;
$$;

revoke all on function public.bootstrap_household(text) from public;
grant execute on function public.bootstrap_household(text) to authenticated;

comment on function public.bootstrap_household(text) is
  'Creates household + owner membership atomically, or returns existing household.';
