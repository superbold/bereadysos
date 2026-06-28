-- Household invites: owner invites guests (member role) to collaborate on a plan.
-- Relaxes strict one-row-per-user so a user may own one household and guest on one other.

drop index if exists public.household_members_user_id_unique;

create unique index if not exists household_members_user_owner_unique
  on public.household_members (user_id)
  where role = 'owner';

create unique index if not exists household_members_user_member_unique
  on public.household_members (user_id)
  where role = 'member';

create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  status public.invite_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null
);

comment on table public.household_invites is 'Pending and historical invites to join a household as member (guest).';

create index household_invites_household_id_idx on public.household_invites (household_id);

create unique index household_invites_pending_email_per_household
  on public.household_invites (household_id, lower(invited_email))
  where status = 'pending';

alter table public.household_invites enable row level security;

create policy "household_invites_select_owner"
  on public.household_invites
  for select
  to authenticated
  using (public.is_household_owner(household_id));

create or replace function public.create_household_invite(p_email text)
returns public.household_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_household_id uuid;
  v_email text := lower(trim(p_email));
  v_invite public.household_invites;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address';
  end if;

  select hm.household_id
  into v_household_id
  from public.household_members hm
  where hm.user_id = v_user
    and hm.role = 'owner'
  limit 1;

  if v_household_id is null then
    raise exception 'Only the plan owner can send invites';
  end if;

  if exists (
    select 1
    from auth.users u
    join public.household_members hm
      on hm.user_id = u.id
     and hm.household_id = v_household_id
     and hm.role = 'member'
    where lower(u.email) = v_email
  ) then
    raise exception 'This person is already a guest on your plan';
  end if;

  update public.household_invites
  set status = 'revoked'
  where household_id = v_household_id
    and lower(invited_email) = v_email
    and status = 'pending';

  insert into public.household_invites (household_id, invited_email, invited_by)
  values (v_household_id, v_email, v_user)
  returning * into v_invite;

  return v_invite;
end;
$$;

create or replace function public.cancel_household_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  update public.household_invites hi
  set status = 'revoked'
  where hi.id = p_invite_id
    and hi.status = 'pending'
    and public.is_household_owner(hi.household_id);

  if not found then
    raise exception 'Invite not found or cannot be cancelled';
  end if;
end;
$$;

create or replace function public.revoke_household_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_household_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_user_id = v_user then
    raise exception 'You cannot remove yourself this way';
  end if;

  select hm.household_id
  into v_household_id
  from public.household_members hm
  where hm.user_id = v_user
    and hm.role = 'owner'
  limit 1;

  if v_household_id is null then
    raise exception 'Only the plan owner can remove guests';
  end if;

  delete from public.household_members hm
  where hm.household_id = v_household_id
    and hm.user_id = p_user_id
    and hm.role = 'member';

  if not found then
    raise exception 'Guest not found on this plan';
  end if;
end;
$$;

create or replace function public.preview_household_invite(p_token uuid)
returns table (
  household_name text,
  inviter_first_name text,
  invited_email text,
  expires_at timestamptz,
  is_valid boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    h.name,
    coalesce(nullif(trim(p.first_name), ''), 'Someone'),
    hi.invited_email,
    hi.expires_at,
    (hi.status = 'pending' and hi.expires_at > now())
  from public.household_invites hi
  join public.households h on h.id = hi.household_id
  left join public.profiles p on p.user_id = hi.invited_by
  where hi.token = p_token
  limit 1;
end;
$$;

create or replace function public.accept_household_invite(p_token uuid)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.household_invites;
  v_user_email text;
  v_owned_household_id uuid;
  v_item_count integer;
  v_household public.households;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_invite
  from public.household_invites hi
  where hi.token = p_token
  for update;

  if not found then
    raise exception 'Invite not found';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'This invite is no longer active';
  end if;

  if v_invite.expires_at <= now() then
    update public.household_invites set status = 'expired' where id = v_invite.id;
    raise exception 'This invite has expired';
  end if;

  select lower(u.email)
  into v_user_email
  from auth.users u
  where u.id = v_user;

  if v_user_email is distinct from lower(v_invite.invited_email) then
    raise exception 'Sign in with % to accept this invite', v_invite.invited_email;
  end if;

  if exists (
    select 1
    from public.household_members hm
    where hm.user_id = v_user
      and hm.household_id = v_invite.household_id
  ) then
    raise exception 'You are already on this plan';
  end if;

  if exists (
    select 1
    from public.household_members hm
    where hm.user_id = v_user
      and hm.role = 'member'
  ) then
    raise exception 'You are already helping on another plan. Leave that plan before accepting a new invite.';
  end if;

  select hm.household_id
  into v_owned_household_id
  from public.household_members hm
  where hm.user_id = v_user
    and hm.role = 'owner'
  limit 1;

  if v_owned_household_id is not null then
    select count(*)::integer
    into v_item_count
    from public.items i
    where i.household_id = v_owned_household_id;

    if v_item_count > 0 then
      raise exception 'You already have your own preparedness plan with inventory. Invites are for guests without an active plan.';
    end if;

    delete from public.households h
    where h.id = v_owned_household_id;
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (v_invite.household_id, v_user, 'member');

  update public.household_invites
  set
    status = 'accepted',
    accepted_at = now(),
    accepted_by = v_user
  where id = v_invite.id;

  select * into v_household from public.households where id = v_invite.household_id;
  return v_household;
end;
$$;

revoke all on function public.create_household_invite(text) from public;
grant execute on function public.create_household_invite(text) to authenticated;

revoke all on function public.cancel_household_invite(uuid) from public;
grant execute on function public.cancel_household_invite(uuid) to authenticated;

revoke all on function public.revoke_household_member(uuid) from public;
grant execute on function public.revoke_household_member(uuid) to authenticated;

revoke all on function public.preview_household_invite(uuid) from public;
grant execute on function public.preview_household_invite(uuid) to authenticated, anon;

revoke all on function public.accept_household_invite(uuid) from public;
grant execute on function public.accept_household_invite(uuid) to authenticated;
