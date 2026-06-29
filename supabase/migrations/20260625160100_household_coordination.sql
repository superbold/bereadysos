-- Household coordination (Phase A): roles, shop runs, read-only shopper RLS.
-- UI: Restock nav; Inventory keeper / Shopper / Watcher labels.
--
-- Requires 20260625160000_household_coordination_enum.sql applied first
-- (enum values must commit in a separate transaction).

-- ---------------------------------------------------------------------------
-- Roles: legacy member → maintainer (inventory keeper)
-- ---------------------------------------------------------------------------

update public.household_members
set role = 'maintainer'
where role = 'member';

drop index if exists public.household_members_user_member_unique;

create unique index if not exists household_members_user_maintainer_unique
  on public.household_members (user_id)
  where role = 'maintainer';

create unique index if not exists household_members_user_shopper_unique
  on public.household_members (user_id)
  where role = 'shopper';

create unique index if not exists household_members_user_watcher_unique
  on public.household_members (user_id)
  where role = 'watcher';

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_edit_inventory(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = hid
      and user_id = auth.uid()
      and role in ('owner', 'maintainer', 'member')
  );
$$;

create or replace function public.is_household_collaborator(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = hid
      and user_id = auth.uid()
      and role in ('maintainer', 'member', 'shopper', 'watcher')
  );
$$;

-- ---------------------------------------------------------------------------
-- Items: shoppers and watchers read only
-- ---------------------------------------------------------------------------

drop policy if exists "items_insert_member" on public.items;
drop policy if exists "items_update_member" on public.items;
drop policy if exists "items_delete_member" on public.items;

create policy "items_insert_editor"
  on public.items
  for insert
  to authenticated
  with check (public.can_edit_inventory(household_id));

create policy "items_update_editor"
  on public.items
  for update
  to authenticated
  using (public.can_edit_inventory(household_id))
  with check (public.can_edit_inventory(household_id));

create policy "items_delete_editor"
  on public.items
  for delete
  to authenticated
  using (public.can_edit_inventory(household_id));

-- ---------------------------------------------------------------------------
-- Invites: role on invite (maintainer | shopper | watcher)
-- ---------------------------------------------------------------------------

drop function if exists public.create_household_invite(text);

alter table public.household_invites
  add column if not exists invited_role public.member_role not null default 'maintainer';

comment on column public.household_invites.invited_role is
  'Role granted on accept: maintainer (inventory keeper), shopper (read-only), watcher (read-only, keeps own plan).';

create or replace function public.create_household_invite(
  p_email text,
  p_role public.member_role default 'maintainer'
)
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

  if p_role not in ('maintainer', 'shopper', 'watcher') then
    raise exception 'Invalid invite role';
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
     and hm.role = p_role
    where lower(u.email) = v_email
  ) then
    raise exception 'This person already has this role on your plan';
  end if;

  update public.household_invites
  set status = 'revoked'
  where household_id = v_household_id
    and lower(invited_email) = v_email
    and status = 'pending';

  insert into public.household_invites (household_id, invited_email, invited_by, invited_role)
  values (v_household_id, v_email, v_user, p_role)
  returning * into v_invite;

  return v_invite;
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
    raise exception 'Only the plan owner can remove people from this plan';
  end if;

  delete from public.household_members hm
  where hm.household_id = v_household_id
    and hm.user_id = p_user_id
    and hm.role <> 'owner';

  if not found then
    raise exception 'Person not found on this plan';
  end if;
end;
$$;

drop function if exists public.preview_household_invite(uuid);

create or replace function public.preview_household_invite(p_token uuid)
returns table (
  household_name text,
  inviter_first_name text,
  invited_email text,
  invited_role public.member_role,
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
    hi.invited_role,
    hi.expires_at,
    (hi.status = 'pending' and hi.expires_at > now())
  from public.household_invites hi
  join public.households h on h.id = hi.household_id
  left join public.profiles p on p.user_id = hi.invited_by
  where hi.token = p_token
  limit 1;
end;
$$;

revoke all on function public.preview_household_invite(uuid) from public;
grant execute on function public.preview_household_invite(uuid) to authenticated, anon;

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
  v_role public.member_role;
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

  v_role := v_invite.invited_role;

  if v_role not in ('maintainer', 'shopper', 'watcher') then
    raise exception 'Invalid invite role';
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

  if v_role in ('maintainer', 'shopper') and exists (
    select 1
    from public.household_members hm
    where hm.user_id = v_user
      and hm.role in ('maintainer', 'member', 'shopper')
  ) then
    raise exception 'You are already helping on another plan. Leave that plan before accepting a new invite.';
  end if;

  if v_role = 'watcher' and exists (
    select 1
    from public.household_members hm
    where hm.user_id = v_user
      and hm.role = 'watcher'
  ) then
    raise exception 'You are already watching another plan. Leave that plan before accepting a new invite.';
  end if;

  if v_role in ('maintainer', 'shopper') then
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
        raise exception 'You already have your own preparedness plan with inventory. Use a Watcher invite to help on another plan without leaving yours.';
      end if;

      delete from public.households h
      where h.id = v_owned_household_id;
    end if;
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (v_invite.household_id, v_user, v_role);

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

revoke all on function public.create_household_invite(text, public.member_role) from public;
grant execute on function public.create_household_invite(text, public.member_role) to authenticated;

-- ---------------------------------------------------------------------------
-- Shop runs (Restock workflow — Phase A)
-- ---------------------------------------------------------------------------

create type public.shop_run_status as enum (
  'draft',
  'shopping',
  'shopping_complete',
  'intake_pending',
  'closed'
);

create type public.shop_run_line_status as enum (
  'pending',
  'bought',
  'skipped',
  'substituted'
);

create table public.shop_runs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  shopper_user_id uuid references auth.users (id) on delete set null,
  status public.shop_run_status not null default 'draft',
  title text not null default 'Restock run',
  shopping_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shop_runs is 'Household coordination: owner creates, shopper completes, maintainer logs intake (later phases).';

create table public.shop_run_lines (
  id uuid primary key default gen_random_uuid(),
  shop_run_id uuid not null references public.shop_runs (id) on delete cascade,
  name text not null,
  category_id uuid references public.categories (id) on delete set null,
  quantity_planned numeric check (quantity_planned is null or quantity_planned >= 0),
  quantity_reported numeric check (quantity_reported is null or quantity_reported >= 0),
  unit text,
  line_status public.shop_run_line_status not null default 'pending',
  shopper_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index shop_runs_household_id_idx on public.shop_runs (household_id);
create index shop_run_lines_shop_run_id_idx on public.shop_run_lines (shop_run_id);

create trigger shop_runs_set_updated_at
  before update on public.shop_runs
  for each row
  execute function public.set_updated_at();

alter table public.shop_runs enable row level security;
alter table public.shop_run_lines enable row level security;

create policy "shop_runs_select_member"
  on public.shop_runs
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "shop_runs_insert_owner"
  on public.shop_runs
  for insert
  to authenticated
  with check (public.is_household_owner(household_id));

create policy "shop_runs_update_coordination"
  on public.shop_runs
  for update
  to authenticated
  using (
    public.is_household_owner(household_id)
    or (
      shopper_user_id = auth.uid()
      and status in ('shopping', 'draft')
    )
    or public.can_edit_inventory(household_id)
  )
  with check (public.is_household_member(household_id));

create policy "shop_run_lines_select_member"
  on public.shop_run_lines
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.shop_runs sr
      where sr.id = shop_run_id
        and public.is_household_member(sr.household_id)
    )
  );

create policy "shop_run_lines_insert_owner"
  on public.shop_run_lines
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.shop_runs sr
      where sr.id = shop_run_id
        and public.is_household_owner(sr.household_id)
        and sr.status = 'draft'
    )
  );

create policy "shop_run_lines_update_coordination"
  on public.shop_run_lines
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.shop_runs sr
      where sr.id = shop_run_id
        and (
          public.is_household_owner(sr.household_id)
          or (
            sr.shopper_user_id = auth.uid()
            and sr.status = 'shopping'
          )
        )
    )
  );

create or replace function public.create_shop_run(p_title text default 'Restock run')
returns public.shop_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_household_id uuid;
  v_run public.shop_runs;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select hm.household_id
  into v_household_id
  from public.household_members hm
  where hm.user_id = v_user
    and hm.role = 'owner'
  limit 1;

  if v_household_id is null then
    raise exception 'Only the plan owner can start a restock run';
  end if;

  insert into public.shop_runs (household_id, created_by, title)
  values (v_household_id, v_user, coalesce(nullif(trim(p_title), ''), 'Restock run'))
  returning * into v_run;

  return v_run;
end;
$$;

create or replace function public.add_shop_run_line(
  p_run_id uuid,
  p_name text,
  p_category_id uuid default null,
  p_quantity numeric default null,
  p_unit text default null
)
returns public.shop_run_lines
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line public.shop_run_lines;
  v_sort integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.shop_runs sr
    where sr.id = p_run_id
      and public.is_household_owner(sr.household_id)
      and sr.status = 'draft'
  ) then
    raise exception 'Restock run not found or cannot be edited';
  end if;

  select coalesce(max(sort_order), 0) + 1
  into v_sort
  from public.shop_run_lines
  where shop_run_id = p_run_id;

  insert into public.shop_run_lines (
    shop_run_id,
    name,
    category_id,
    quantity_planned,
    unit,
    sort_order
  )
  values (
    p_run_id,
    trim(p_name),
    p_category_id,
    p_quantity,
    nullif(trim(p_unit), ''),
    v_sort
  )
  returning * into v_line;

  return v_line;
end;
$$;

create or replace function public.start_shop_run(
  p_run_id uuid,
  p_shopper_user_id uuid default null
)
returns public.shop_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.shop_runs;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.shop_runs sr
  set
    status = 'shopping',
    shopper_user_id = coalesce(p_shopper_user_id, sr.shopper_user_id)
  where sr.id = p_run_id
    and public.is_household_owner(sr.household_id)
    and sr.status = 'draft'
  returning * into v_run;

  if not found then
    raise exception 'Restock run not found or already started';
  end if;

  return v_run;
end;
$$;

create or replace function public.complete_shop_run_shopping(
  p_run_id uuid,
  p_note text default null
)
returns public.shop_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.shop_runs;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.shop_runs sr
  set
    status = 'shopping_complete',
    shopping_note = nullif(trim(p_note), '')
  where sr.id = p_run_id
    and sr.status = 'shopping'
    and (
      public.is_household_owner(sr.household_id)
      or sr.shopper_user_id = auth.uid()
      or exists (
        select 1
        from public.household_members hm
        where hm.household_id = sr.household_id
          and hm.user_id = auth.uid()
          and hm.role = 'shopper'
      )
    )
  returning * into v_run;

  if not found then
    raise exception 'Restock run not found or shopping is not in progress';
  end if;

  return v_run;
end;
$$;

revoke all on function public.create_shop_run(text) from public;
grant execute on function public.create_shop_run(text) to authenticated;

revoke all on function public.add_shop_run_line(uuid, text, uuid, numeric, text) from public;
grant execute on function public.add_shop_run_line(uuid, text, uuid, numeric, text) to authenticated;

revoke all on function public.start_shop_run(uuid, uuid) from public;
grant execute on function public.start_shop_run(uuid, uuid) to authenticated;

revoke all on function public.complete_shop_run_shopping(uuid, text) from public;
grant execute on function public.complete_shop_run_shopping(uuid, text) to authenticated;
