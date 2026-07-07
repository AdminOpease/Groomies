-- Groomies · Migration 003
-- Bookings — with hold/confirm/expired state machine, human-readable
-- reference, guest manage_token, GDPR consent, source, and dormant
-- payment fields.

-- ---------------------------------------------------------------------------
-- Booking reference generator
-- ---------------------------------------------------------------------------
-- 5-char code from a base32-ish alphabet (no ambiguous 0/O, 1/I/L).
-- ~33M combinations before collision + retry — plenty for a small biz.
-- Format: GR-XXXXX (e.g. GR-7K3QX)

create or replace function public.generate_booking_reference()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  ref text := 'GR-';
  n integer;
begin
  for i in 1..5 loop
    n := 1 + floor(random() * length(alphabet))::integer;
    ref := ref || substr(alphabet, n, 1);
  end loop;
  return ref;
end $$;

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
--
-- Lifecycle:
--   pending  → created by book_slot RPC, holds slot until hold_expires_at
--   confirmed → payment succeeded, or payments off and RPC confirmed inline
--   cancelled → customer or owner cancelled (frees slot)
--   expired  → pending hold timed out (frees slot)
--
-- Only `confirmed` and `pending`-with-unexpired-hold count against slot
-- capacity. See slot_availability view below and book_slot RPC in a later
-- migration.
--
-- FK deletion policy:
--   time_slot_id → RESTRICT (deleting a slot with bookings must go through
--                             the admin flow that cancels + notifies first)
--   service_id   → SET NULL (deleted service leaves bookings intact for
--                             history/reporting)
--   location_id  → SET NULL (denormalised for reporting; time_slot_id links
--                             upstream to the actual slot)

create table public.bookings (
  id                     uuid primary key default gen_random_uuid(),

  -- what was booked
  time_slot_id           uuid not null references public.time_slots(id) on delete restrict,
  service_id             uuid references public.services(id) on delete set null,

  -- customer (guest booking; no auth account required)
  customer_name          text not null,
  customer_email         text not null,
  customer_phone         text not null,

  -- pet
  pet_name               text not null,
  pet_species            text,
  pet_breed              text,

  -- notes + free-form
  notes                  text,

  -- required for hybrid "area" locations: the address the van goes to.
  -- Required-vs-null enforcement is done in the book_slot RPC based on
  -- the parent location's type.
  service_address        text,

  -- state
  status                 text not null default 'pending'
                           check (status in ('pending', 'confirmed', 'cancelled', 'expired')),
  hold_expires_at        timestamptz,

  -- customer-facing identifiers
  booking_reference      text not null unique
                           default public.generate_booking_reference(),
  manage_token           uuid not null unique default gen_random_uuid(),

  -- GDPR
  consent_given_at       timestamptz not null,
  source                 text not null default 'online'
                           check (source in ('online', 'manual')),

  -- payments (nullable until payments_enabled)
  payment_status         text check (payment_status in
                           ('unpaid', 'paid', 'refunded', 'partial_refund')),
  payment_provider_ref   text,
  amount_paid_cents      integer check (amount_paid_cents is null or amount_paid_cents >= 0),
  deposit_cents          integer check (deposit_cents is null or deposit_cents >= 0),

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  cancelled_at           timestamptz
);

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

-- Indexes that will actually be used
create index bookings_status_idx           on public.bookings (status);
create index bookings_time_slot_id_idx     on public.bookings (time_slot_id);
create index bookings_hold_expires_at_idx
  on public.bookings (hold_expires_at) where status = 'pending';
create index bookings_customer_email_idx   on public.bookings (customer_email);

comment on column public.bookings.status is
  'pending → holds slot until hold_expires_at. confirmed → active. cancelled/expired → frees slot.';
comment on column public.bookings.manage_token is
  '128-bit unguessable token powering the "manage my booking" link without login.';
comment on column public.bookings.service_address is
  'Required when the parent location.type = ''area'' (customer''s driveway). Ignored for stops. Enforced in book_slot RPC.';

-- ---------------------------------------------------------------------------
-- slot_availability — the "how many spaces left" view
-- ---------------------------------------------------------------------------
--
-- Live computation, NOT a stored counter. Counts pending (with unexpired
-- hold) + confirmed bookings against max_appointments.
--
-- Runs as the view OWNER (no `security_invoker`) — this is intentional so
-- the view can count bookings without exposing anon to the bookings table
-- via RLS. Only counts and metadata are projected, never booking details.
--
-- Only returns rows for public-visible slots (parent location active,
-- date >= today in London). Admin views should query the raw tables.

create view public.slot_availability as
select
  s.id                as slot_id,
  s.location_date_id,
  s.start_time,
  s.end_time,
  s.max_appointments,
  s.max_appointments - coalesce(x.booked, 0) as remaining
from public.time_slots s
join public.location_dates d on d.id = s.location_date_id
join public.locations l on l.id = d.location_id
left join lateral (
  select count(*)::integer as booked
    from public.bookings b
   where b.time_slot_id = s.id
     and (
       b.status = 'confirmed'
       or (b.status = 'pending' and b.hold_expires_at > now())
     )
) x on true
where l.is_active = true
  and d.service_date >= public.today_london();

comment on view public.slot_availability is
  'Live remaining capacity per public-visible slot. Runs as view owner (bypasses RLS on bookings so counts are accurate); only counts and slot metadata are exposed. The book_slot RPC is the source of truth for booking success/failure.';
