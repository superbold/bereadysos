-- Restock shopping-list story:
-- - explicit list type (Plan Gap, Supplementary Shopping, or Both)
-- - owner-created supplementary items with notes
-- - cancellation for abandoned draft lists

alter table public.shop_runs
  add column list_type text;

update public.shop_runs
set list_type = case
  when lower(title) in ('plan gap', 'restock from plan gaps') then 'plan_gap'
  when lower(title) like '%both%' then 'both'
  else 'supplementary'
end
where list_type is null;

update public.shop_runs
set title = 'Supplementary Shopping'
where lower(title) = 'restock run';

update public.shop_runs
set title = 'Plan Gap'
where lower(title) = 'restock from plan gaps';

alter table public.shop_runs
  alter column list_type set default 'supplementary',
  alter column list_type set not null,
  add constraint shop_runs_list_type_check
    check (list_type in ('plan_gap', 'supplementary', 'both'));

comment on column public.shop_runs.list_type is
  'Owner-facing shopping-list intent: plan_gap, supplementary, or both.';

create or replace function public.create_shopping_list(
  p_household_id uuid,
  p_list_type text
)
returns public.shop_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_title text;
  v_list public.shop_runs;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_list_type not in ('plan_gap', 'supplementary', 'both') then
    raise exception 'Shopping-list type must be plan_gap, supplementary, or both';
  end if;

  if not public.is_household_owner(p_household_id) then
    raise exception 'Only the plan owner can start a shopping list';
  end if;

  if exists (
    select 1
    from public.shop_runs sr
    where sr.household_id = p_household_id
      and sr.status <> 'closed'
  ) then
    raise exception 'Finish or cancel the active shopping list before starting another';
  end if;

  v_title := case p_list_type
    when 'plan_gap' then 'Plan Gap'
    when 'supplementary' then 'Supplementary Shopping'
    else 'Plan Gap + Supplementary Shopping'
  end;

  insert into public.shop_runs (household_id, created_by, title, list_type)
  values (p_household_id, v_user, v_title, p_list_type)
  returning * into v_list;

  return v_list;
end;
$$;

create or replace function public.add_shopping_list_item(
  p_run_id uuid,
  p_name text,
  p_category_id uuid,
  p_quantity numeric,
  p_unit text default null,
  p_note text default null
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

  if nullif(trim(p_name), '') is null then
    raise exception 'Item name is required';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  if not exists (
    select 1
    from public.shop_runs sr
    where sr.id = p_run_id
      and sr.status = 'draft'
      and sr.list_type in ('supplementary', 'both')
      and public.is_household_owner(sr.household_id)
  ) then
    raise exception 'Shopping list not found or items cannot be added';
  end if;

  if not exists (select 1 from public.categories c where c.id = p_category_id) then
    raise exception 'Select a valid category';
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
    shopper_note,
    sort_order
  )
  values (
    p_run_id,
    trim(p_name),
    p_category_id,
    p_quantity,
    nullif(trim(p_unit), ''),
    nullif(trim(p_note), ''),
    v_sort
  )
  returning * into v_line;

  return v_line;
end;
$$;

create or replace function public.remove_shopping_list_item(p_line_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.shop_run_lines srl
  using public.shop_runs sr
  where srl.id = p_line_id
    and sr.id = srl.shop_run_id
    and sr.status = 'draft'
    and public.is_household_owner(sr.household_id);

  if not found then
    raise exception 'Shopping-list item not found or cannot be removed';
  end if;
end;
$$;

create or replace function public.cancel_shopping_list(p_run_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.shop_runs sr
  where sr.id = p_run_id
    and sr.status = 'draft'
    and public.is_household_owner(sr.household_id);

  if not found then
    raise exception 'Draft shopping list not found or cannot be cancelled';
  end if;
end;
$$;

revoke all on function public.create_shopping_list(uuid, text) from public;
grant execute on function public.create_shopping_list(uuid, text) to authenticated;

revoke all on function public.add_shopping_list_item(uuid, text, uuid, numeric, text, text) from public;
grant execute on function public.add_shopping_list_item(uuid, text, uuid, numeric, text, text) to authenticated;

revoke all on function public.remove_shopping_list_item(uuid) from public;
grant execute on function public.remove_shopping_list_item(uuid) to authenticated;

revoke all on function public.cancel_shopping_list(uuid) from public;
grant execute on function public.cancel_shopping_list(uuid) to authenticated;
