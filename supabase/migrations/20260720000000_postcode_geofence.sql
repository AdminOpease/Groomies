-- Groomies · Postcode geo-fencing
--
-- The van covers one postcode area at a time. If today is an LU day, every
-- booking taken for it has to be in LU — otherwise the round is unroutable.
--
-- Fencing is at AREA level (the letters: LU, MK, AL), never district level.
-- That was a deliberate choice: a town does not map to one postcode. Dunstable
-- is LU5 AND LU6, and LU6 itself spills into Buckinghamshire and Dacorum. Area
-- level is the granularity that matches how the van actually works.
--
-- It also sidesteps a real trap: with district rules, naive prefix matching
-- makes 'MK4' match 'MK46' too — a booking 20 miles away, silently accepted.
-- Comparing only the letters cannot go wrong that way.
--
-- Rules live on the LOCATION and every date under it inherits them, because
-- "this area is LU" is stable while re-entering it per day is repetitive.
--
-- An EMPTY list means no restriction, so existing locations are unaffected
-- until the owner opts in.

alter table public.locations
  add column if not exists postcode_areas text[] not null default '{}';

comment on column public.locations.postcode_areas is
  'Allowed postcode AREAS (letters only, e.g. {LU,MK}). Empty = no restriction. Bookings must have a postcode in one of these.';

-- Store the customer's postcode separately from the free-text address. You
-- cannot reliably fence on an address blob, and this is the field the address
-- lookup will populate when it is added.
alter table public.bookings
  add column if not exists postcode text;

comment on column public.bookings.postcode is
  'Normalised UK postcode (uppercase, no spaces) captured at booking. Separate from service_address so the area can be checked reliably.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Uppercase, strip all whitespace. 'lu5 4ab' -> 'LU54AB'
create or replace function public.normalise_postcode(p text)
returns text
language sql
immutable
as $$
  select nullif(upper(regexp_replace(coalesce(p, ''), '\s', '', 'g')), '');
$$;

-- Basic UK postcode shape. Deliberately permissive about the inward part; the
-- point is to reject junk, not to validate deliverability (that's the address
-- lookup's job once it's added).
create or replace function public.is_valid_postcode(p text)
returns boolean
language sql
immutable
as $$
  select public.normalise_postcode(p) ~ '^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$';
$$;

-- The AREA is the leading letters. 'LU54AB' -> 'LU', 'EC1A1BB' -> 'EC'.
-- [A-Z]{1,2} stops at the first digit, so this is unambiguous.
create or replace function public.postcode_area(p text)
returns text
language sql
immutable
as $$
  select substring(public.normalise_postcode(p) from '^[A-Z]{1,2}');
$$;

comment on function public.postcode_area(text) is
  'Postcode area (letters only). Area-level matching avoids the MK4/MK46 prefix trap that district-level matching has.';

-- ---------------------------------------------------------------------------
-- book_slot — enforce the fence
-- ---------------------------------------------------------------------------
--
-- Adds p_postcode. When the location has postcode_areas configured, a valid
-- postcode inside one of those areas is required. When the list is empty the
-- postcode is still stored if supplied, but never blocks a booking.
--
-- New error surface:
--   P0010 POSTCODE_REQUIRED     - location is fenced, no postcode given
--   P0011 POSTCODE_INVALID      - not a recognisable UK postcode
--   P0012 POSTCODE_OUT_OF_AREA  - valid, but outside the areas covered

create or replace function public.book_slot(
  p_time_slot_id       uuid,
  p_service_id         uuid,
  p_service_variant_id uuid,
  p_customer_name      text,
  p_customer_email     text,
  p_customer_phone     text,
  p_pet_name           text,
  p_pet_species        text,
  p_pet_breed          text,
  p_service_address    text,
  p_notes              text,
  p_consent_given      boolean,
  p_addon_service_ids  uuid[],
  p_postcode           text
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
  v_variant         public.service_variants;
  v_variant_count   integer;
  v_price_cents     integer;
  v_addon_ids       uuid[];
  v_addon           public.services;
  v_addon_id        uuid;
  v_addon_total     integer := 0;
  v_total_cents     integer;
  v_deposit_cents   integer;
  v_postcode        text;
  v_area            text;
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

  -- 4a. Geo-fence. Checked early so a rejection never consumes a slot.
  v_postcode := public.normalise_postcode(p_postcode);

  if array_length(v_location.postcode_areas, 1) is not null then
    if v_postcode is null then
      raise exception 'POSTCODE_REQUIRED'
        using errcode = 'P0010';
    end if;

    if not public.is_valid_postcode(v_postcode) then
      raise exception 'POSTCODE_INVALID'
        using errcode = 'P0011';
    end if;

    v_area := public.postcode_area(v_postcode);

    -- Compare letters to letters. Case is already normalised on both sides.
    if not (upper(v_area) = any (
              select upper(trim(a)) from unnest(v_location.postcode_areas) as a
            )) then
      raise exception 'POSTCODE_OUT_OF_AREA'
        using errcode = 'P0012';
    end if;
  elsif v_postcode is not null and not public.is_valid_postcode(v_postcode) then
    -- Unfenced location: still refuse to store obvious junk.
    raise exception 'POSTCODE_INVALID'
      using errcode = 'P0011';
  end if;

  -- 4b. Resolve the size tier and the main price.
  if p_service_id is not null then
    select count(*)::integer into v_variant_count
      from public.service_variants
     where service_id = p_service_id
       and is_active = true;

    if v_variant_count > 0 then
      if p_service_variant_id is null then
        raise exception 'VARIANT_REQUIRED'
          using errcode = 'P0007';
      end if;

      select * into v_variant
        from public.service_variants
       where id = p_service_variant_id
         and service_id = p_service_id
         and is_active = true;

      if not found then
        raise exception 'VARIANT_INVALID'
          using errcode = 'P0008';
      end if;

      v_price_cents := v_variant.price_cents;
    else
      if p_service_variant_id is not null then
        raise exception 'VARIANT_INVALID'
          using errcode = 'P0008';
      end if;

      select price_cents into v_price_cents
        from public.services where id = p_service_id;
    end if;
  elsif p_service_variant_id is not null then
    raise exception 'VARIANT_INVALID'
      using errcode = 'P0008';
  end if;

  -- 4c. Validate add-ons up front and total them.
  select coalesce(array_agg(distinct a), '{}')
    into v_addon_ids
    from unnest(coalesce(p_addon_service_ids, '{}'::uuid[])) as a
   where a is not null;

  foreach v_addon_id in array v_addon_ids loop
    if v_addon_id = p_service_id then
      raise exception 'ADDON_INVALID'
        using errcode = 'P0009';
    end if;

    select * into v_addon
      from public.services
     where id = v_addon_id
       and is_active = true;

    if not found then
      raise exception 'ADDON_INVALID'
        using errcode = 'P0009';
    end if;

    if exists (
      select 1 from public.service_variants
       where service_id = v_addon_id and is_active = true
    ) then
      raise exception 'ADDON_INVALID'
        using errcode = 'P0009';
    end if;

    v_addon_total := v_addon_total + v_addon.price_cents;
  end loop;

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

  -- 7. Totals, deposit, and the pending/confirmed state machine.
  select * into v_settings from public.business_settings where id = true;

  v_total_cents := coalesce(v_price_cents, 0) + v_addon_total;

  v_deposit_cents := case v_settings.deposit_mode
    when 'deposit' then round(v_total_cents * v_settings.deposit_percent / 100.0)::integer
    when 'full'    then v_total_cents
    else null
  end;

  if v_settings.payments_enabled then
    v_status       := 'pending';
    v_hold_expires := now() + (v_settings.hold_duration_minutes || ' minutes')::interval;
  else
    v_status       := 'confirmed';
    v_hold_expires := null;
  end if;

  -- 8. Insert the booking.
  insert into public.bookings (
    time_slot_id,
    service_id,
    service_variant_id,
    price_cents,
    total_cents,
    deposit_cents,
    customer_name,
    customer_email,
    customer_phone,
    pet_name,
    pet_species,
    pet_breed,
    service_address,
    postcode,
    notes,
    status,
    hold_expires_at,
    consent_given_at,
    source
  ) values (
    v_slot.id,
    p_service_id,
    p_service_variant_id,
    v_price_cents,
    v_total_cents,
    v_deposit_cents,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_pet_name,
    p_pet_species,
    p_pet_breed,
    p_service_address,
    v_postcode,
    p_notes,
    v_status,
    v_hold_expires,
    now(),
    'online'
  )
  returning * into v_booking;

  -- 9. Snapshot the add-ons onto the booking.
  if array_length(v_addon_ids, 1) is not null then
    insert into public.booking_addons (booking_id, service_id, label, price_cents)
    select v_booking.id, s.id, s.name, s.price_cents
      from public.services s
     where s.id = any(v_addon_ids);
  end if;

  return json_build_object(
    'booking_id',        v_booking.id,
    'booking_reference', v_booking.booking_reference,
    'manage_token',      v_booking.manage_token,
    'status',            v_booking.status,
    'hold_expires_at',   v_booking.hold_expires_at,
    'total_cents',       v_booking.total_cents,
    'deposit_cents',     v_booking.deposit_cents
  );
end $$;

revoke execute on function public.book_slot(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean, uuid[], text
) from public;

grant execute on function public.book_slot(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean, uuid[], text
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Compatibility: the 13-arg signature the CURRENTLY DEPLOYED site calls
-- ---------------------------------------------------------------------------
--
-- Forwards with no postcode. On a fenced location that now fails with
-- POSTCODE_REQUIRED rather than silently skipping the fence — the safe
-- direction. Drop once the geo-fence build is deployed.

create or replace function public.book_slot(
  p_time_slot_id       uuid,
  p_service_id         uuid,
  p_service_variant_id uuid,
  p_customer_name      text,
  p_customer_email     text,
  p_customer_phone     text,
  p_pet_name           text,
  p_pet_species        text,
  p_pet_breed          text,
  p_service_address    text,
  p_notes              text,
  p_consent_given      boolean,
  p_addon_service_ids  uuid[]
)
returns json
language sql
security definer
set search_path = public
as $$
  select public.book_slot(
    p_time_slot_id, p_service_id, p_service_variant_id,
    p_customer_name, p_customer_email, p_customer_phone,
    p_pet_name, p_pet_species, p_pet_breed,
    p_service_address, p_notes, p_consent_given,
    p_addon_service_ids, null::text
  );
$$;

revoke execute on function public.book_slot(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean, uuid[]
) from public;

grant execute on function public.book_slot(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean, uuid[]
) to anon, authenticated;
