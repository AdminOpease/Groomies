-- Groomies · Migration 006
-- Customer manage-my-booking RPCs — token-authenticated, no login required.
--
-- Each booking has an unguessable manage_token (128-bit UUID) issued at
-- creation. The customer's confirmation email includes a "manage" link
-- containing that token. These RPCs let them view and cancel their own
-- booking without ever creating an account.
--
-- Both run as SECURITY DEFINER (bypass RLS on bookings) but require a valid
-- token as the authorisation key. A token cannot be guessed to reach
-- another customer's booking.

-- ---------------------------------------------------------------------------
-- get_booking_by_token — read a single booking's public-safe fields
-- ---------------------------------------------------------------------------
--
-- Returns metadata the customer needs on their manage page: what/when/where,
-- status, and (later, with payments on) whether they're inside the refund
-- cutoff window.

create or replace function public.get_booking_by_token(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_booking       public.bookings;
  v_slot          public.time_slots;
  v_date          public.location_dates;
  v_location      public.locations;
  v_service       public.services;
  v_settings      public.business_settings;
  v_slot_start    timestamptz;
  v_within_cutoff boolean;
begin
  select * into v_booking
    from public.bookings
   where manage_token = p_token
   limit 1;

  if not found then
    return null;
  end if;

  select * into v_slot     from public.time_slots     where id = v_booking.time_slot_id;
  select * into v_date     from public.location_dates where id = v_slot.location_date_id;
  select * into v_location from public.locations      where id = v_date.location_id;

  if v_booking.service_id is not null then
    select * into v_service from public.services where id = v_booking.service_id;
  end if;

  select * into v_settings from public.business_settings where id = true;

  -- Compute the UTC instant of the slot start (date + time in London tz).
  v_slot_start := (v_date.service_date + v_slot.start_time) at time zone 'Europe/London';

  v_within_cutoff := (
    v_settings.payments_enabled
    and v_booking.payment_status = 'paid'
    and v_booking.amount_paid_cents > 0
    and v_slot_start - now() > (v_settings.refund_cutoff_hours || ' hours')::interval
  );

  return json_build_object(
    'booking_reference', v_booking.booking_reference,
    'status',            v_booking.status,
    'customer_name',     v_booking.customer_name,
    'customer_email',    v_booking.customer_email,
    'customer_phone',    v_booking.customer_phone,
    'pet_name',          v_booking.pet_name,
    'pet_species',       v_booking.pet_species,
    'pet_breed',         v_booking.pet_breed,
    'notes',             v_booking.notes,
    'service_address',   v_booking.service_address,
    'service',           case when v_service.id is not null then
                            json_build_object(
                              'name',             v_service.name,
                              'duration_minutes', v_service.duration_minutes,
                              'price_cents',      v_service.price_cents
                            )
                         end,
    'location',          json_build_object(
                            'name',        v_location.name,
                            'type',        v_location.type,
                            'address',     v_location.address,
                            'description', v_location.description
                         ),
    'slot',              json_build_object(
                            'service_date', v_date.service_date,
                            'start_time',   v_slot.start_time,
                            'end_time',     v_slot.end_time,
                            'starts_at',    v_slot_start
                         ),
    'payment_status',       v_booking.payment_status,
    'amount_paid_cents',    v_booking.amount_paid_cents,
    'eligible_for_refund',  v_within_cutoff,
    'refund_cutoff_hours',  v_settings.refund_cutoff_hours
  );
end $$;

revoke execute on function public.get_booking_by_token(uuid) from public;
grant  execute on function public.get_booking_by_token(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- cancel_booking_by_token — customer cancels their own booking
-- ---------------------------------------------------------------------------
--
-- Sets status='cancelled', cancelled_at=now(), which frees the slot for
-- other customers (slot_availability re-counts on next query).
--
-- Return: json with { ok, refund_eligible, new_status }.
-- Errors: NOT_FOUND if token doesn't resolve, ALREADY_CANCELLED,
--         ALREADY_COMPLETED (past appointment).

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
    raise exception 'BOOKING_NOT_FOUND'
      using errcode = 'P0101';
  end if;

  if v_booking.status = 'cancelled' then
    raise exception 'ALREADY_CANCELLED'
      using errcode = 'P0102';
  end if;

  if v_booking.status = 'expired' then
    raise exception 'ALREADY_EXPIRED'
      using errcode = 'P0103';
  end if;

  select * into v_slot     from public.time_slots     where id = v_booking.time_slot_id;
  select * into v_date     from public.location_dates where id = v_slot.location_date_id;
  select * into v_settings from public.business_settings where id = true;

  v_slot_start := (v_date.service_date + v_slot.start_time) at time zone 'Europe/London';

  -- Refund eligibility (only meaningful when payments on and a payment
  -- landed). Cancellation is allowed either way; the app tells the customer
  -- whether they'll be refunded.
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

revoke execute on function public.cancel_booking_by_token(uuid) from public;
grant  execute on function public.cancel_booking_by_token(uuid) to anon, authenticated;
