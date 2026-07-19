-- Groomies · Service size tiers
--
-- Grooming is priced by dog size (Small / Medium / Large / Extra large), so a
-- single services.price_cents cannot represent the real price list. This adds
-- service_variants: one row per size for services that are size-priced.
--
-- A service with NO active variants keeps being priced by services.price_cents
-- (that's every add-on, plus Puppy Introduction). So this is additive — nothing
-- that exists today changes behaviour until tiers are added to a service.

-- ---------------------------------------------------------------------------
-- service_variants
-- ---------------------------------------------------------------------------

create table if not exists public.service_variants (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid not null references public.services(id) on delete cascade,
  label        text not null,
  price_cents  integer not null check (price_cents >= 0),
  price_from   boolean not null default false,
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists service_variants_service_sort_idx
  on public.service_variants (service_id, sort_order);

drop trigger if exists service_variants_set_updated_at on public.service_variants;
create trigger service_variants_set_updated_at
before update on public.service_variants
for each row execute function public.set_updated_at();

comment on table public.service_variants is
  'Size tiers for size-priced services. A service with no active rows here is priced by services.price_cents.';
comment on column public.service_variants.price_from is
  'When true, this tier displays as a starting price ("From £45").';

-- RLS mirrors public.services exactly.
alter table public.service_variants enable row level security;

drop policy if exists service_variants_anon_read_active on public.service_variants;
create policy service_variants_anon_read_active on public.service_variants
  for select to anon
  using (is_active = true);

drop policy if exists service_variants_staff_read_all on public.service_variants;
create policy service_variants_staff_read_all on public.service_variants
  for select to authenticated
  using (public.is_active_staff());

drop policy if exists service_variants_staff_write on public.service_variants;
create policy service_variants_staff_write on public.service_variants
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

grant select on public.service_variants to anon;

-- ---------------------------------------------------------------------------
-- services.category — which section of the price list a service belongs to
-- ---------------------------------------------------------------------------
--
-- Free-form label so the owner can rename/reorder sections without a code
-- change. The public price list groups by this, ordering sections by the
-- lowest sort_order within each. Services with no category fall into a
-- trailing "More services" group rather than disappearing.

alter table public.services
  add column if not exists category text;

comment on column public.services.category is
  'Price-list section heading, e.g. "Full Groom Packages". Groups services on the public Services page.';

-- ---------------------------------------------------------------------------
-- bookings: which tier was chosen, and the price at the time of booking
-- ---------------------------------------------------------------------------

alter table public.bookings
  add column if not exists service_variant_id uuid
    references public.service_variants(id) on delete set null,
  add column if not exists price_cents integer
    check (price_cents is null or price_cents >= 0);

comment on column public.bookings.price_cents is
  'Price snapshot taken at booking time so later price changes never rewrite history.';

-- ---------------------------------------------------------------------------
-- book_slot — now tier-aware
-- ---------------------------------------------------------------------------
--
-- Adds to the existing contract:
--   * p_service_variant_id — the chosen size tier.
--   * If the service HAS active tiers, one must be supplied and must belong to
--     that service (customers cannot book a Large groom at the Small price).
--   * If the service has NO tiers, a tier must NOT be supplied.
--   * The resolved price is snapshotted onto bookings.price_cents.
--
-- New error surface:
--   P0007 VARIANT_REQUIRED - service is size-priced but no size was chosen
--   P0008 VARIANT_INVALID  - size doesn't belong to the service / is inactive

-- NOTE: the old 11-argument signature is deliberately NOT dropped here — the
-- currently-deployed site still calls it. A compatibility shim is defined at
-- the bottom of this file so live bookings keep working until the tier-aware
-- build ships. Drop it once that deploy is live.

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

  -- 4b. Resolve the size tier and the price to record.
  --     Done BEFORE the capacity check so a bad tier fails fast and never
  --     consumes a slot.
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
      -- Service isn't size-priced: a tier must not be smuggled in.
      if p_service_variant_id is not null then
        raise exception 'VARIANT_INVALID'
          using errcode = 'P0008';
      end if;

      select price_cents into v_price_cents
        from public.services where id = p_service_id;
    end if;
  elsif p_service_variant_id is not null then
    -- A tier without a service is incoherent.
    raise exception 'VARIANT_INVALID'
      using errcode = 'P0008';
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
    v_status       := 'pending';
    v_hold_expires := now() + (v_settings.hold_duration_minutes || ' minutes')::interval;
  else
    v_status       := 'confirmed';
    v_hold_expires := null;
  end if;

  -- 8. Insert.
  insert into public.bookings (
    time_slot_id,
    service_id,
    service_variant_id,
    price_cents,
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
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean
) from public;

grant execute on function public.book_slot(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- get_booking_by_token — surface the booked tier + the price actually quoted
-- ---------------------------------------------------------------------------
--
-- Previously returned services.price_cents (the CURRENT base price). With size
-- tiers that's the wrong number: a customer who booked a Large groom would be
-- shown the Small price, and any later price change would rewrite what they
-- think they owe. Now returns the booking's snapshot, plus the size label.

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
-- Backwards-compatibility shim for the 11-argument book_slot
-- ---------------------------------------------------------------------------
--
-- The deployed site calls book_slot without a size tier. Rather than break
-- live bookings the moment this migration runs, keep that signature working —
-- it forwards to the tier-aware version with no tier selected.
--
-- PostgREST resolves overloads by the argument names in the request body, so
-- the 11-arg and 12-arg versions coexist cleanly.
--
-- Safe to drop once the tier-aware build is deployed:
--   drop function public.book_slot(
--     uuid, uuid, text, text, text, text, text, text, text, text, boolean);

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
language sql
security definer
set search_path = public
as $$
  select public.book_slot(
    p_time_slot_id,
    p_service_id,
    null::uuid,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_pet_name,
    p_pet_species,
    p_pet_breed,
    p_service_address,
    p_notes,
    p_consent_given
  );
$$;

revoke execute on function public.book_slot(
  uuid, uuid, text, text, text, text, text, text, text, text, boolean
) from public;

grant execute on function public.book_slot(
  uuid, uuid, text, text, text, text, text, text, text, text, boolean
) to anon, authenticated;
