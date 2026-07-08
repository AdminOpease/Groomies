-- Groomies · Migration 010
-- Admin RPCs — manual booking + reschedule with the same atomic guarantees
-- as book_slot.
--
-- Both are SECURITY DEFINER but explicitly check is_active_staff() inside;
-- anon calls fail with STAFF_ONLY. Staff callers hit the same
-- SELECT ... FOR UPDATE serialisation as book_slot, so admin and customer
-- flows share one source of truth and cannot race each other.

-- ---------------------------------------------------------------------------
-- admin_create_booking — the "phone booking" flow
-- ---------------------------------------------------------------------------
--
-- Behaviour differences vs. book_slot:
--   * source = 'manual'
--   * confirmed immediately (no hold — the staff already agreed on the phone)
--   * consent_given_at = now() implicitly (owner records the consent verbally
--     and captures a phoned booking into the system)
--   * skip the area-location address requirement — staff often collect the
--     address separately for phone bookings and can edit it later

create or replace function public.admin_create_booking(
  p_time_slot_id     uuid,
  p_service_id       uuid,
  p_customer_name    text,
  p_customer_email   text,
  p_customer_phone   text,
  p_pet_name         text,
  p_pet_species      text,
  p_pet_breed        text,
  p_service_address  text,
  p_notes            text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot        public.time_slots;
  v_date        public.location_dates;
  v_location    public.locations;
  v_booked      integer;
  v_day_booked  integer;
  v_booking     public.bookings;
begin
  if not public.is_active_staff() then
    raise exception 'STAFF_ONLY'
      using errcode = 'P0301';
  end if;

  select * into v_slot
    from public.time_slots
   where id = p_time_slot_id
   for update;
  if not found then
    raise exception 'SLOT_NOT_FOUND'
      using errcode = 'P0001';
  end if;

  select * into v_date
    from public.location_dates where id = v_slot.location_date_id;
  select * into v_location
    from public.locations where id = v_date.location_id;

  if v_date.service_date < public.today_london() then
    raise exception 'SLOT_NOT_BOOKABLE'
      using errcode = 'P0002';
  end if;

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
    'confirmed',
    null,
    now(),
    'manual'
  )
  returning * into v_booking;

  return json_build_object(
    'booking_id',        v_booking.id,
    'booking_reference', v_booking.booking_reference,
    'status',            v_booking.status
  );
end $$;

revoke execute on function public.admin_create_booking(
  uuid, uuid, text, text, text, text, text, text, text, text
) from public;
grant  execute on function public.admin_create_booking(
  uuid, uuid, text, text, text, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_move_booking — reschedule to a different slot with capacity guard
-- ---------------------------------------------------------------------------

create or replace function public.admin_move_booking(
  p_booking_id     uuid,
  p_new_slot_id    uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking      public.bookings;
  v_new_slot     public.time_slots;
  v_new_date     public.location_dates;
  v_new_location public.locations;
  v_booked       integer;
  v_day_booked   integer;
begin
  if not public.is_active_staff() then
    raise exception 'STAFF_ONLY'
      using errcode = 'P0301';
  end if;

  select * into v_booking
    from public.bookings
   where id = p_booking_id
   for update;
  if not found then
    raise exception 'BOOKING_NOT_FOUND'
      using errcode = 'P0101';
  end if;

  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'BOOKING_NOT_MOVABLE'
      using errcode = 'P0302';
  end if;

  if v_booking.time_slot_id = p_new_slot_id then
    -- Nothing to do.
    return json_build_object('ok', true, 'unchanged', true);
  end if;

  select * into v_new_slot
    from public.time_slots
   where id = p_new_slot_id
   for update;
  if not found then
    raise exception 'SLOT_NOT_FOUND'
      using errcode = 'P0001';
  end if;

  select * into v_new_date
    from public.location_dates where id = v_new_slot.location_date_id;
  select * into v_new_location
    from public.locations where id = v_new_date.location_id;

  if v_new_date.service_date < public.today_london()
     or v_new_location.is_active = false then
    raise exception 'SLOT_NOT_BOOKABLE'
      using errcode = 'P0002';
  end if;

  select count(*)::integer into v_booked
    from public.bookings
   where time_slot_id = v_new_slot.id
     and id <> v_booking.id
     and (
       status = 'confirmed'
       or (status = 'pending' and hold_expires_at > now())
     );

  if v_booked >= v_new_slot.max_appointments then
    raise exception 'SLOT_FULL'
      using errcode = 'P0003';
  end if;

  if v_new_date.max_per_day is not null then
    select count(*)::integer into v_day_booked
      from public.bookings b
      join public.time_slots s on s.id = b.time_slot_id
     where s.location_date_id = v_new_date.id
       and b.id <> v_booking.id
       and (
         b.status = 'confirmed'
         or (b.status = 'pending' and b.hold_expires_at > now())
       );
    if v_day_booked >= v_new_date.max_per_day then
      raise exception 'PER_DAY_CAP_REACHED'
        using errcode = 'P0004';
    end if;
  end if;

  update public.bookings
     set time_slot_id = v_new_slot.id
   where id = v_booking.id;

  return json_build_object('ok', true, 'new_slot_id', v_new_slot.id);
end $$;

revoke execute on function public.admin_move_booking(uuid, uuid) from public;
grant  execute on function public.admin_move_booking(uuid, uuid) to authenticated;
