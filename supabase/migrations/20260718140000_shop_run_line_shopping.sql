-- Ticket 3: allow check-off / qty tweaks while a run is in `shopping` status.
-- Progress carries into intake so put-away starts closer to done.

create or replace function public.update_shop_run_line_shopping(
  p_line_id uuid,
  p_line_status public.shop_run_line_status,
  p_quantity_reported numeric default null
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

  if p_line_status not in ('pending', 'bought', 'skipped') then
    raise exception 'While shopping, mark items as bought, skipped, or still needed';
  end if;

  select srl.*
  into v_line
  from public.shop_run_lines srl
  join public.shop_runs sr on sr.id = srl.shop_run_id
  where srl.id = p_line_id
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
    );

  if not found then
    raise exception 'Shopping list item not found or shopping is not in progress';
  end if;

  if p_line_status = 'bought' and p_quantity_reported is null then
    raise exception 'Quantity is required when marking an item bought';
  end if;

  if p_quantity_reported is not null and p_quantity_reported < 0 then
    raise exception 'Quantity cannot be negative';
  end if;

  update public.shop_run_lines
  set
    line_status = p_line_status,
    quantity_reported = case
      when p_line_status = 'pending' then null
      when p_line_status = 'skipped' then coalesce(p_quantity_reported, 0)
      else p_quantity_reported
    end
  where id = p_line_id
  returning * into v_line;

  return v_line;
end;
$$;

revoke all on function public.update_shop_run_line_shopping(uuid, public.shop_run_line_status, numeric) from public;
grant execute on function public.update_shop_run_line_shopping(uuid, public.shop_run_line_status, numeric) to authenticated;
