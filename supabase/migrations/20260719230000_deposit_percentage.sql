-- Groomies · Percentage deposits
--
-- Deposits existed only as a fixed per-service amount (services.deposit_amount_cents),
-- which can't express "30% of whatever they booked" now that a booking is a
-- size tier plus any number of add-ons.
--
-- This adds business_settings.deposit_percent and makes book_slot compute the
-- deposit from the booking's own total, snapshotting it onto the booking.
--
-- Deliberately independent of Stripe. The two switches mean different things:
--   deposit_mode      — what is OWED  ('off' | 'deposit' | 'full')
--   payments_enabled  — whether we COLLECT it
-- So the owner can set the policy now, see the right numbers everywhere, and
-- flipping payments_enabled once Stripe is connected starts charging the
-- amount that was already being calculated. Nothing else has to change.

alter table public.business_settings
  add column if not exists deposit_percent integer not null default 30
    check (deposit_percent >= 0 and deposit_percent <= 100);

comment on column public.business_settings.deposit_percent is
  'Percent of the booking total taken as a deposit when deposit_mode = ''deposit''. Ignored otherwise.';

-- ---------------------------------------------------------------------------
-- book_slot — snapshot the deposit owed
-- ---------------------------------------------------------------------------
--
-- Same 13-argument signature as before: this only changes the body, so there
-- is no compatibility shim to manage and no caller needs updating.
--
-- deposit_cents is a snapshot like price_cents and total_cents: changing the
-- percentage later must never rewrite what an existing customer owed.

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
  v_total_cents     integer;
  v_deposit_cents   integer;
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

  -- Deposit owed. Independent of payments_enabled so the policy can be set up
  -- and verified before Stripe is connected. Rounded to the nearest penny.
  v_deposit_cents := case v_settings.deposit_mode
    when 'deposit' then round(v_total_cents * v_settings.deposit_percent / 100.0)::integer
    when 'full'    then v_total_cents
    else null
  end;

  if v_settings.payments_enabled then
    -- Hold the slot while the customer pays; the webhook flips it to confirmed.
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
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean, uuid[]
) from public;

grant execute on function public.book_slot(
  uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean, uuid[]
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- get_booking_by_token — expose the deposit
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
    'deposit_cents',     v_booking.deposit_cents,
    'deposit_mode',      v_settings.deposit_mode,
    'payments_enabled',  v_settings.payments_enabled,
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
-- Public settings projection — the booking form needs the deposit policy
-- ---------------------------------------------------------------------------
--
-- business_settings is not anon-readable (it holds owner email, billing
-- alerts, etc.). The existing public view is the safe projection, so the
-- deposit policy is added there rather than opening up the table.

-- Column list matches the existing view exactly, plus deposit_percent.
-- Dropped and recreated (not "create or replace") because adding a column to
-- a view is not a replace-compatible change.
drop view if exists public.public_business_settings;
create view public.public_business_settings as
select
  id,
  business_name,
  logo_url,
  contact_phone,
  contact_email,
  about_blurb,
  social_links,
  primary_brand_color,
  default_service_area_copy,
  payments_enabled,
  deposit_mode,
  deposit_percent,
  refund_cutoff_hours,
  show_slot_counts
from public.business_settings;

grant select on public.public_business_settings to anon, authenticated;

comment on view public.public_business_settings is
  'Public projection of business_settings. When adding sensitive fields to business_settings, do NOT add them here.';
