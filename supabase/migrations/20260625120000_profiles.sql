-- Owner / member display names (for header, invites later)

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Display names for household owners and invited members.';
comment on column public.profiles.first_name is 'Shown in the app shell, e.g. “Alex''s plan”.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_household_peers"
  on public.profiles
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.household_members hm_self
      join public.household_members hm_peer
        on hm_self.household_id = hm_peer.household_id
      where hm_self.user_id = auth.uid()
        and hm_peer.user_id = profiles.user_id
    )
  );

create policy "profiles_insert_self"
  on public.profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "profiles_update_self"
  on public.profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.ensure_profile(p_first_name text default '')
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (user_id, first_name)
  values (v_user, coalesce(nullif(trim(p_first_name), ''), ''))
  on conflict (user_id) do update
    set first_name = case
      when coalesce(nullif(trim(excluded.first_name), ''), '') <> ''
        then excluded.first_name
      else public.profiles.first_name
    end
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.ensure_profile(text) from public;
grant execute on function public.ensure_profile(text) to authenticated;

comment on function public.ensure_profile(text) is
  'Creates the caller profile if missing; updates first_name when a non-empty value is passed.';
