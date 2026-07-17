-- Solo owner restock (Ticket 2 slice 1): apply logged intake lines to inventory and close the run.

-- ---------------------------------------------------------------------------
-- complete_solo_restock_run — owner applies intake → inventory, status → closed
-- ---------------------------------------------------------------------------

create or replace function public.complete_solo_restock_run(p_run_id uuid)
returns public.shop_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.shop_runs;
  v_line record;
  v_item_id uuid;
  v_category_count integer;
  v_category_slug text;
  v_unresolved integer;
  v_invalid integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select sr.*
  into v_run
  from public.shop_runs sr
  where sr.id = p_run_id
    and sr.status = 'intake_pending'
    and public.is_household_owner(sr.household_id);

  if not found then
    raise exception 'Restock run not found or cannot be completed';
  end if;

  select count(*)
  into v_unresolved
  from public.shop_run_lines srl
  where srl.shop_run_id = p_run_id
    and srl.line_status = 'pending';

  if v_unresolved > 0 then
    raise exception 'Log every item before updating inventory';
  end if;

  select count(*)
  into v_invalid
  from public.shop_run_lines srl
  where srl.shop_run_id = p_run_id
    and srl.line_status in ('bought', 'substituted')
    and srl.quantity_reported is null;

  if v_invalid > 0 then
    raise exception 'Bought and substituted items need a reported quantity';
  end if;

  for v_line in
    select srl.*
    from public.shop_run_lines srl
    where srl.shop_run_id = p_run_id
    order by srl.sort_order, srl.created_at
  loop
    if v_line.line_status not in ('bought', 'substituted') then
      continue;
    end if;

    if v_line.quantity_reported is null or v_line.quantity_reported <= 0 then
      continue;
    end if;

    if v_line.category_id is null then
      raise exception 'Cannot apply inventory for “%” without a category', v_line.name;
    end if;

    v_item_id := null;

    select i.id
    into v_item_id
    from public.items i
    where i.household_id = v_run.household_id
      and i.category_id = v_line.category_id
      and lower(trim(i.name)) = lower(trim(v_line.name))
    order by i.updated_at desc
    limit 1;

    if v_item_id is null then
      select count(*)
      into v_category_count
      from public.items i
      where i.household_id = v_run.household_id
        and i.category_id = v_line.category_id;

      if v_category_count = 1 then
        select i.id
        into v_item_id
        from public.items i
        where i.household_id = v_run.household_id
          and i.category_id = v_line.category_id
        limit 1;
      end if;
    end if;

    if v_item_id is not null then
      update public.items
      set quantity = quantity + v_line.quantity_reported
      where id = v_item_id;
    else
      select c.slug
      into v_category_slug
      from public.categories c
      where c.id = v_line.category_id;

      insert into public.items (
        household_id,
        category_id,
        name,
        quantity,
        unit,
        volume_per_unit,
        servings_per_unit,
        notes
      )
      values (
        v_run.household_id,
        v_line.category_id,
        v_line.name,
        v_line.quantity_reported,
        nullif(trim(v_line.unit), ''),
        case when v_category_slug = 'water' then 1 else null end,
        case when v_category_slug = 'food' then 1 else null end,
        case
          when nullif(trim(v_line.intake_note), '') is not null
            then 'Restock: ' || trim(v_line.intake_note)
          else null
        end
      );
    end if;
  end loop;

  update public.shop_runs
  set
    status = 'closed',
    intake_submitted_at = coalesce(intake_submitted_at, now())
  where id = p_run_id
  returning * into v_run;

  return v_run;
end;
$$;

comment on function public.complete_solo_restock_run(uuid) is
  'Solo owner path: apply logged restock lines to household inventory and close the run.';

revoke all on function public.complete_solo_restock_run(uuid) from public;
grant execute on function public.complete_solo_restock_run(uuid) to authenticated;
