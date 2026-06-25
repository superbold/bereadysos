-- BeReady SOS — initial schema (Phase 1)
-- households, household_members, categories, items + RLS

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.member_role as enum ('owner', 'member');
create type public.calc_type as enum ('consumable', 'checklist');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Household',
  headcount integer not null default 1 check (headcount >= 1),
  target_days integer not null default 7 check (target_days >= 1 and target_days <= 365),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.households is 'One preparedness plan per household; members share inventory.';

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

comment on table public.household_members is 'Links auth.users to households.';

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  calc_type public.calc_type not null,
  default_daily_per_person numeric check (default_daily_per_person is null or default_daily_per_person > 0),
  default_unit text,
  recommended_qty integer check (recommended_qty is null or recommended_qty >= 0),
  icon text,
  sort_order integer not null default 0
);

comment on table public.categories is 'Reference data: consumable (days math) or checklist (have / need).';

create table public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  name text not null,
  quantity numeric not null default 0 check (quantity >= 0),
  unit text,
  expiration_date date,
  servings_per_unit numeric check (servings_per_unit is null or servings_per_unit > 0),
  volume_per_unit numeric check (volume_per_unit is null or volume_per_unit > 0),
  daily_override numeric check (daily_override is null or daily_override > 0),
  location text,
  notes text,
  min_quantity numeric check (min_quantity is null or min_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.items is 'Household inventory line items.';
comment on column public.items.servings_per_unit is 'Food: servings per package (can, box, etc.).';
comment on column public.items.volume_per_unit is 'Water: gallons (or liters) per container.';
comment on column public.items.location is 'Simple location label; containers/scenarios planned later.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index household_members_user_id_idx on public.household_members (user_id);
create index items_household_id_idx on public.items (household_id);
create index items_category_id_idx on public.items (category_id);
create index items_expiration_date_idx on public.items (expiration_date);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger households_set_updated_at
  before update on public.households
  for each row
  execute function public.set_updated_at();

create trigger items_set_updated_at
  before update on public.items
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_household_member(hid uuid)
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
  );
$$;

create or replace function public.is_household_owner(hid uuid)
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
      and role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;

-- categories: read-only for authenticated users
create policy "categories_select_authenticated"
  on public.categories
  for select
  to authenticated
  using (true);

-- households
create policy "households_select_member"
  on public.households
  for select
  to authenticated
  using (public.is_household_member(id));

create policy "households_insert_authenticated"
  on public.households
  for insert
  to authenticated
  with check (true);

create policy "households_update_owner"
  on public.households
  for update
  to authenticated
  using (public.is_household_owner(id))
  with check (public.is_household_owner(id));

create policy "households_delete_owner"
  on public.households
  for delete
  to authenticated
  using (public.is_household_owner(id));

-- household_members
create policy "household_members_select_member"
  on public.household_members
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "household_members_insert_self"
  on public.household_members
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "household_members_delete_owner"
  on public.household_members
  for delete
  to authenticated
  using (public.is_household_owner(household_id));

-- items
create policy "items_select_member"
  on public.items
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "items_insert_member"
  on public.items
  for insert
  to authenticated
  with check (public.is_household_member(household_id));

create policy "items_update_member"
  on public.items
  for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "items_delete_member"
  on public.items
  for delete
  to authenticated
  using (public.is_household_member(household_id));

-- ---------------------------------------------------------------------------
-- Seed categories (FEMA-inspired defaults; editable per item later)
-- ---------------------------------------------------------------------------

insert into public.categories (
  slug,
  name,
  calc_type,
  default_daily_per_person,
  default_unit,
  recommended_qty,
  icon,
  sort_order
)
values
  ('water', 'Water', 'consumable', 1, 'gallons', null, 'i-lucide-droplets', 10),
  ('food', 'Food', 'consumable', 3, 'servings', null, 'i-lucide-utensils', 20),
  ('medical', 'Medical', 'checklist', null, 'each', 1, 'i-lucide-cross', 30),
  ('hygiene', 'Hygiene', 'checklist', null, 'each', 1, 'i-lucide-sparkles', 40),
  ('power', 'Power & light', 'checklist', null, 'each', 1, 'i-lucide-zap', 50),
  ('tools', 'Tools & shelter', 'checklist', null, 'each', 1, 'i-lucide-wrench', 60),
  ('documents', 'Documents & comms', 'checklist', null, 'each', 1, 'i-lucide-file-text', 70);
