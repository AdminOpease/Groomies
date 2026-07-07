-- Groomies · Migration 002
-- Locations (hybrid stop/area model), location_dates, time_slots.
--
-- Hybrid location model:
--   * type = 'stop' → the van parks at `address`; customer shows up there.
--   * type = 'area' → `address` is descriptive ("NW London"); the customer
--                     enters their own address at booking time (stored on
--                     bookings.service_address).
-- Admin picks the type per-location.

-- ---------------------------------------------------------------------------
-- locations
-- ---------------------------------------------------------------------------

create table public.locations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text not null default 'area'
                 check (type in ('stop', 'area')),
  address      text,
  description  text,
  latitude     numeric(9, 6),
  longitude    numeric(9, 6),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger locations_set_updated_at
before update on public.locations
for each row execute function public.set_updated_at();

create index locations_active_idx on public.locations (is_active);

comment on column public.locations.type is
  '"stop" = fixed meeting point at locations.address. "area" = coverage zone; customer supplies their own address at booking (bookings.service_address).';
comment on column public.locations.address is
  'For stops: the exact address. For areas: a descriptive area (e.g. "NW London") shown to the customer as context.';

-- ---------------------------------------------------------------------------
-- location_dates — which days the van is at a location
-- ---------------------------------------------------------------------------
--
-- `service_date` is a date (not timestamptz) — we combine it with slot times
-- in Europe/London to derive concrete UTC instants when we need them.
--
-- max_per_day: optional cap on total bookings that day across all slots at
-- this location. Null = no per-day cap; only slot capacity applies.
--
-- ON DELETE CASCADE: deleting a location wipes its dates (admin flow warns
-- and notifies affected customers first at the app layer).

create table public.location_dates (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references public.locations(id) on delete cascade,
  service_date date not null,
  max_per_day  integer check (max_per_day is null or max_per_day > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (location_id, service_date)
);

create trigger location_dates_set_updated_at
before update on public.location_dates
for each row execute function public.set_updated_at();

create index location_dates_service_date_idx
  on public.location_dates (service_date);
create index location_dates_location_date_idx
  on public.location_dates (location_id, service_date);

-- ---------------------------------------------------------------------------
-- time_slots — bookable windows within a location_date
-- ---------------------------------------------------------------------------
--
-- start_time / end_time are `time` (not timestamptz) — see the notes on
-- location_dates. Combined with the parent date + Europe/London tz when
-- comparing to now().
--
-- max_appointments is the per-slot capacity. The booking RPC (a later
-- migration) does the atomic capacity check that guarantees no overbooking.

create table public.time_slots (
  id                uuid primary key default gen_random_uuid(),
  location_date_id  uuid not null references public.location_dates(id) on delete cascade,
  start_time        time not null,
  end_time          time not null,
  max_appointments  integer not null check (max_appointments > 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  check (end_time > start_time),
  unique (location_date_id, start_time)
);

create trigger time_slots_set_updated_at
before update on public.time_slots
for each row execute function public.set_updated_at();

create index time_slots_location_date_idx
  on public.time_slots (location_date_id);

comment on column public.time_slots.max_appointments is
  'Per-slot capacity. Availability = max_appointments − (count of pending-not-expired + confirmed bookings). Truth lives in the book_slot RPC.';
