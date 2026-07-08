-- Phase B: inventory keeper intake — log what came in from shopping (no inventory apply yet; Phase C owner review)

alter table public.shop_runs
  add column if not exists intake_submitted_at timestamptz;

comment on column public.shop_runs.intake_submitted_at is
  'When the inventory keeper submitted intake for owner review (Phase C).';

alter table public.shop_run_lines
  add column if not exists intake_note text;

comment on column public.shop_run_lines.intake_note is
  'Inventory keeper note during intake (substitutions, partial qty, etc.).';

-- ---------------------------------------------------------------------------
-- start_shop_run_intake — shopping_complete → intake_pending
-- ---------------------------------------------------------------------------

create or replace function public.start_shop_run_intake(p_run_id uuid)
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
  set status = 'intake_pending'
  where sr.id = p_run_id
    and sr.status = 'shopping_complete'
    and sr.intake_submitted_at is null
    and public.can_edit_inventory(sr.household_id)
  returning * into v_run;

  if not found then
    raise exception 'Restock run not found or intake cannot be started';
  end if;

  return v_run;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_shop_run_line_intake — inventory keeper logs a line
-- ---------------------------------------------------------------------------

create or replace function public.update_shop_run_line_intake(
  p_line_id uuid,
  p_line_status public.shop_run_line_status,
  p_quantity_reported numeric default null,
  p_intake_note text default null
)
returns public.shop_run_lines
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line public.shop_run_lines;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_line_status = 'pending' then
    raise exception 'Line status must be bought, skipped, or substituted during intake';
  end if;

  select srl.*
  into v_line
  from public.shop_run_lines srl
  join public.shop_runs sr on sr.id = srl.shop_run_id
  where srl.id = p_line_id
    and sr.status = 'intake_pending'
    and sr.intake_submitted_at is null
    and public.can_edit_inventory(sr.household_id);

  if not found then
    raise exception 'Shopping list item not found or intake is not in progress';
  end if;

  if p_line_status in ('bought', 'substituted') and p_quantity_reported is null then
    raise exception 'Reported quantity is required for bought or substituted items';
  end if;

  if p_quantity_reported is not null and p_quantity_reported < 0 then
    raise exception 'Reported quantity cannot be negative';
  end if;

  update public.shop_run_lines
  set
    line_status = p_line_status,
    quantity_reported = case
      when p_line_status = 'skipped' then coalesce(p_quantity_reported, 0)
      else p_quantity_reported
    end,
    intake_note = nullif(trim(p_intake_note), '')
  where id = p_line_id
  returning * into v_line;

  return v_line;
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_shop_run_intake — inventory keeper hands off to owner (Phase C)
-- ---------------------------------------------------------------------------

create or replace function public.submit_shop_run_intake(p_run_id uuid)
returns public.shop_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.shop_runs;
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
    and sr.intake_submitted_at is null
    and public.can_edit_inventory(sr.household_id);

  if not found then
    raise exception 'Restock run not found or intake cannot be submitted';
  end if;

  select count(*)
  into v_unresolved
  from public.shop_run_lines srl
  where srl.shop_run_id = p_run_id
    and srl.line_status = 'pending';

  if v_unresolved > 0 then
    raise exception 'Log every item before submitting intake';
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

  update public.shop_runs
  set intake_submitted_at = now()
  where id = p_run_id
  returning * into v_run;

  return v_run;
end;
$$;

revoke all on function public.start_shop_run_intake(uuid) from public;
grant execute on function public.start_shop_run_intake(uuid) to authenticated;

revoke all on function public.update_shop_run_line_intake(uuid, public.shop_run_line_status, numeric, text) from public;
grant execute on function public.update_shop_run_line_intake(uuid, public.shop_run_line_status, numeric, text) to authenticated;

revoke all on function public.submit_shop_run_intake(uuid) from public;
grant execute on function public.submit_shop_run_intake(uuid) to authenticated;
