-- Groomies · Booking add-ons
--
-- A booking held exactly one service. Customers want to add extras at booking
-- time (Nail Trim, Teeth Cleaning, De-Matting, …), so this adds a one-to-many.
--
-- Shape:
--   bookings.service_id / service_variant_id / price_cents  = the MAIN service
--   booking_addons                                          = the extras
--   bookings.total_cents                                    = main + extras
--
-- Every row snapshots its own price AND name, so a later rename, re-price or
-- deletion never rewrites what a customer actually booked and was quoted.

-- ---------------------------------------------------------------------------
-- booking_addons
-- ---------------------------------------------------------------------------

create table if not exists public.booking_addons (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  service_id  uuid references public.services(id) on delete set null,
  label       text not null,
  price_cents integer not null check (price_cents >= 0),
  created_at  timestamptz not null default now(),
  -- The same extra twice on one booking is a mistake, not a quantity.
  unique (booking_id, service_id)
);

create index if not exists booking_addons_booking_idx
  on public.booking_addons (booking_id);

comment on table public.booking_addons is
  'Extra services attached to a booking. label/price_cents are snapshots taken at booking time.';
comment on column public.booking_addons.label is
  'Service name at the time of booking — kept so history stays readable if the service is renamed or deleted.';

-- RLS mirrors public.bookings: staff only. Customers never read this table
-- directly; they see their add-ons through get_booking_by_token, which is
-- SECURITY DEFINER and gated on their unguessable manage token.
alter table public.booking_addons enable row level security;

drop policy if exists booking_addons_staff_read on public.booking_addons;
create policy booking_addons_staff_read on public.booking_addons
  for select to authenticated
  using (public.is_active_staff());

drop policy if exists booking_addons_staff_write on public.booking_addons;
create policy booking_addons_staff_write on public.booking_addons
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- ---------------------------------------------------------------------------
-- bookings.total_cents
-- ---------------------------------------------------------------------------

alter table public.bookings
  add column if not exists total_cents integer
    check (total_cents is null or total_cents >= 0);

comment on column public.bookings.total_cents is
  'Main service + add-ons at booking time. Snapshot: never recompute from current prices.';

-- Backfill existing bookings, which have no add-ons by definition.
update public.bookings
   set total_cents = price_cents
 where total_cents is null
   and price_cents is not null;

-- ---------------------------------------------------------------------------
-- book_slot — now accepts add-ons
-- ---------------------------------------------------------------------------
--
-- Adds p_addon_service_ids uuid[].
--
-- An add-on must be an active service with NO size tiers (a tiered service's
-- price depends on a size we never asked for), and must not duplicate the main
-- service. Anything else is rejected rather than silently dropped, so a
-- customer is never charged for something different from what they picked.
--
-- New error surface:
--   P0009 ADDON_INVALID - unknown/inactive add-on, a size-priced service, or
--                         the main service repeated as an add-on

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

  -- 4b. Resolve the size tier and the main price.
  --     Done BEFORE the capacity check so bad input never consumes a slot.
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

  -- 4c. Validate add-ons up front and total them. Deduplicated so the same
  --     extra submitted twice is one line, not a double charge.
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

    -- Size-priced services can't be add-ons: their price needs a size.
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

  -- 7. State machine: pending hold vs immediate confirm.
  select * into v_settings from public.business_settings where id = true;

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
    p_service_variant_id,
    v_price_cents,
    coalesce(v_price_cents, 0) + v_addon_total,
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
    'total_cents',       v_booking.total_cents
  );
end $$;

revoke execute on function public.book_slot(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean, uuid[]
) from public;

grant execute on function public.book_slot(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean, uuid[]
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Compatibility: the 12-arg signature the CURRENTLY DEPLOYED site calls
-- ---------------------------------------------------------------------------
--
-- Same reasoning as the tier migration: the live Worker keeps calling the
-- previous signature until the add-on build ships. Forward it with no add-ons.
-- Drop once the add-on build is live.

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
  p_consent_given      boolean
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
    '{}'::uuid[]
  );
$$;

revoke execute on function public.book_slot(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean
) from public;

grant execute on function public.book_slot(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean
) to anon, authenticated;

-- The original pre-tier 11-arg signature is now dead: the tier-aware build is
-- deployed and verified, so nothing calls it any more.
drop function if exists public.book_slot(
  uuid, uuid, text, text, text, text, text, text, text, text, boolean
);

-- ---------------------------------------------------------------------------
-- get_booking_by_token — return the add-ons and the total
-- ---------------------------------------------------------------------------

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
  v_variant       public.service_variants;
  v_settings      public.business_settings;
  v_slot_start    timestamptz;
  v_within_cutoff boolean;
  v_addons        json;
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

  if v_booking.service_variant_id is not null then
    select * into v_variant
      from public.service_variants where id = v_booking.service_variant_id;
  end if;

  select coalesce(
           json_agg(json_build_object('name', label, 'price_cents', price_cents)
                    order by label),
           '[]'::json)
    into v_addons
    from public.booking_addons
   where booking_id = v_booking.id;

  select * into v_settings from public.business_settings where id = true;

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
                              'size',             v_variant.label,
                              'price_cents',      coalesce(v_booking.price_cents,
                                                           v_service.price_cents)
                            )
                         end,
    'addons',            v_addons,
    'total_cents',       v_booking.total_cents,
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
