-- Groomies · Migration 005
-- book_slot RPC — the atomic no-overbooking guarantee.
--
-- Called by the public booking form via the anon key. It:
--   1. Locks the slot row (SELECT ... FOR UPDATE serializes concurrent
--      bookings for the same slot).
--   2. Re-checks the LIVE availability count (confirmed + unexpired pending).
--   3. Enforces the per-day cap if the parent location_date has one.
--   4. Enforces service_address presence for hybrid "area" locations.
--   5. Inserts a pending booking (holding the slot) or a confirmed booking
--      (payments off).
--
-- Two concurrent requests on the last slot: the second waits at FOR UPDATE,
-- sees the first's inserted row when it runs, and SLOT_FULL fires.
--
-- Error surface (via SQLSTATE):
--   P0001 SLOT_NOT_FOUND        - slot missing
--   P0002 SLOT_NOT_BOOKABLE     - past date, inactive location
--   P0003 SLOT_FULL             - no capacity remaining
--   P0004 PER_DAY_CAP_REACHED   - location's max_per_day exceeded
--   P0005 ADDRESS_REQUIRED      - area location, no service_address supplied
--   P0006 CONSENT_REQUIRED      - GDPR consent not given
--
-- Return value: json with { booking_id, booking_reference, manage_token,
--                           status, hold_expires_at }.

create or replace function public.book_slot(
  p_time_slot_id     uuid,
  p_service_id       uuid,
  p_customer_name    text,
  p_customer_email   text,
  p_customer_phone   text,
  p_pet_name         text,
  p_pet_species      text,
  p_pet_breed        text,
  p_service_address  text,
  p_notes            text,
  p_consent_given    boolean
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot            public.time_slots;
  v_date            public.location_dates;
  v_location        public.locations;
  v_settings        public.business_settings;
  v_booked          integer;
  v_day_booked      integer;
  v_hold_expires    timestamptz;
  v_status          text;
  v_booking         public.bookings;
begin
  -- 0. Consent is non-negotiable.
  if not p_consent_given then
    raise exception 'CONSENT_REQUIRED'
      using errcode = 'P0006';
  end if;

  -- 1. Lock the slot row (serializes concurrent bookings for THIS slot).
  select * into v_slot
    from public.time_slots
   where id = p_time_slot_id
   for update;

  if not found then
    raise exception 'SLOT_NOT_FOUND'
      using errcode = 'P0001';
  end if;

  -- 2. Parent date + location.
  select * into v_date
    from public.location_dates where id = v_slot.location_date_id;
  select * into v_location
    from public.locations where id = v_date.location_id;

  -- 3. Bookable-window check: date in future (London), location active.
  if v_date.service_date < public.today_london()
     or v_location.is_active = false then
    raise exception 'SLOT_NOT_BOOKABLE'
      using errcode = 'P0002';
  end if;

  -- 4. Hybrid model: "area" locations require the customer's own address.
  if v_location.type = 'area'
     and (p_service_address is null or length(trim(p_service_address)) = 0) then
    raise exception 'ADDRESS_REQUIRED'
      using errcode = 'P0005';
  end if;

  -- 5. LIVE capacity re-check for THIS slot.
  select count(*)::integer into v_booked
    from public.bookings
   where time_slot_id = v_slot.id
     and (
       status = 'confirmed'
       or (status = 'pending' and hold_expires_at > now())
     );

  if v_booked >= v_slot.max_appointments then
    raise exception 'SLOT_FULL'
      using errcode = 'P0003';
  end if;

  -- 6. Per-day cap (optional).
  if v_date.max_per_day is not null then
    select count(*)::integer into v_day_booked
      from public.bookings b
      join public.time_slots s on s.id = b.time_slot_id
     where s.location_date_id = v_date.id
       and (
         b.status = 'confirmed'
         or (b.status = 'pending' and b.hold_expires_at > now())
       );

    if v_day_booked >= v_date.max_per_day then
      raise exception 'PER_DAY_CAP_REACHED'
        using errcode = 'P0004';
    end if;
  end if;

  -- 7. State machine: pending hold vs immediate confirm.
  select * into v_settings from public.business_settings where id = true;

  if v_settings.payments_enabled then
    -- Real payment flow adds Stripe checkout in a later phase; for now, we
    -- still create a hold — the payment webhook will flip to 'confirmed'.
    v_status       := 'pending';
    v_hold_expires := now() + (v_settings.hold_duration_minutes || ' minutes')::interval;
  else
    -- Payments off: confirm immediately (spec: "if payments_enabled is off,
    -- the flow simply confirms immediately and skips Stripe").
    v_status       := 'confirmed';
    v_hold_expires := null;
  end if;

  -- 8. Insert.
  insert into public.bookings (
    time_slot_id,
    service_id,
    customer_name,
    customer_email,
    customer_phone,
    pet_name,
    pet_species,
    pet_breed,
    service_address,
    notes,
    status,
    hold_expires_at,
    consent_given_at,
    source
  ) values (
    v_slot.id,
    p_service_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_pet_name,
    p_pet_species,
    p_pet_breed,
    p_service_address,
    p_notes,
    v_status,
    v_hold_expires,
    now(),
    'online'
  )
  returning * into v_booking;

  return json_build_object(
    'booking_id',        v_booking.id,
    'booking_reference', v_booking.booking_reference,
    'manage_token',      v_booking.manage_token,
    'status',            v_booking.status,
    'hold_expires_at',   v_booking.hold_expires_at
  );
end $$;

-- The RPC is anon-callable (it IS the public booking mechanism).
revoke execute on function public.book_slot(
  uuid, uuid, text, text, text, text, text, text, text, text, boolean
) from public;

grant execute on function public.book_slot(
  uuid, uuid, text, text, text, text, text, text, text, text, boolean
) to anon, authenticated;
