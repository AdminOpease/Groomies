-- Groomies · Migration 011
-- Expand bookings.status to include the admin outcomes 'completed' and
-- 'no_show'. Adjust cancel_booking_by_token so a customer can't accidentally
-- flip an already-completed appointment back to cancelled.

alter table public.bookings
  drop constraint bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
    check (status in (
      'pending', 'confirmed', 'cancelled', 'expired', 'completed', 'no_show'
    ));

-- Refine the cancel-by-token guard so any terminal state blocks re-cancellation.
create or replace function public.cancel_booking_by_token(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking       public.bookings;
  v_slot          public.time_slots;
  v_date          public.location_dates;
  v_settings      public.business_settings;
  v_slot_start    timestamptz;
  v_refund_ok     boolean;
begin
  select * into v_booking
    from public.bookings
   where manage_token = p_token
   for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0101';
  end if;

  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'BOOKING_NOT_CANCELLABLE' using errcode = 'P0102';
  end if;

  select * into v_slot     from public.time_slots     where id = v_booking.time_slot_id;
  select * into v_date     from public.location_dates where id = v_slot.location_date_id;
  select * into v_settings from public.business_settings where id = true;

  v_slot_start := (v_date.service_date + v_slot.start_time) at time zone 'Europe/London';

  v_refund_ok := (
    v_settings.payments_enabled
    and v_booking.payment_status = 'paid'
    and v_slot_start - now() > (v_settings.refund_cutoff_hours || ' hours')::interval
  );

  update public.bookings
     set status       = 'cancelled',
         cancelled_at = now()
   where id = v_booking.id;

  return json_build_object(
    'ok',              true,
    'new_status',      'cancelled',
    'refund_eligible', v_refund_ok
  );
end $$;
