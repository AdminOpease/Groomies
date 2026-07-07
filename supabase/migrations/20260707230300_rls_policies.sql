-- Groomies · Migration 004
-- Row Level Security — the actual security boundary.
--
-- The public site talks to Postgres directly with the anon key. What each
-- visitor can read or write is decided entirely by the policies below.
--
-- Rules (from the build spec):
--   * anon:     read active/future availability + call the book_slot RPC.
--               NO direct booking writes (cancel-by-token RPC handles that).
--   * staff:    read bookings; write to stops/dates/slots/services.
--   * owner:    all of the above + business_settings + payments + profiles.
--
-- The RLS helpers current_user_role() / is_active_staff() / is_owner() were
-- defined in migration 001; they are SECURITY DEFINER so they can query the
-- profiles table from within a policy without recursion.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

-- Anyone active can read their own profile row.
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- Owner can read all profiles (for the staff management screen).
create policy profiles_select_owner on public.profiles
  for select to authenticated
  using (public.is_owner());

-- Owner can insert/update/delete any profile.
create policy profiles_write_owner on public.profiles
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- Any active user can update their OWN row (name change etc).
-- The role/is_active columns are locked down by a trigger below so they
-- cannot self-promote.
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Trigger: prevent non-owners from changing role or is_active on any row
-- (including their own).
create or replace function public.guard_profile_role_and_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role
      or new.is_active is distinct from old.is_active)
     and not public.is_owner() then
    raise exception 'Only the owner can change role or is_active on a profile'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_guard_role_change
before update on public.profiles
for each row execute function public.guard_profile_role_and_status();

-- ---------------------------------------------------------------------------
-- business_settings
-- ---------------------------------------------------------------------------
--
-- Table: owner-only read/write.
-- Public view (public_business_settings) below projects safe columns for
-- anon consumption.

alter table public.business_settings enable row level security;

create policy business_settings_owner_all on public.business_settings
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- Public view — runs as owner (bypasses RLS on business_settings) and
-- projects only public-safe columns. Sensitive fields
-- (owner_notification_email, technical_billing_alert_email) are excluded.
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
  refund_cutoff_hours
from public.business_settings;

grant select on public.public_business_settings to anon, authenticated;

comment on view public.public_business_settings is
  'Public projection of business_settings. When adding sensitive fields to business_settings, do NOT add them here.';

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------

alter table public.services enable row level security;

-- Anon: read active services only (for the public Services page).
create policy services_anon_read_active on public.services
  for select to anon
  using (is_active = true);

-- Staff: read all services (including inactive, for admin views).
create policy services_staff_read_all on public.services
  for select to authenticated
  using (public.is_active_staff());

-- Staff: full write.
create policy services_staff_write on public.services
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- ---------------------------------------------------------------------------
-- locations
-- ---------------------------------------------------------------------------

alter table public.locations enable row level security;

create policy locations_anon_read_active on public.locations
  for select to anon
  using (is_active = true);

create policy locations_staff_read_all on public.locations
  for select to authenticated
  using (public.is_active_staff());

create policy locations_staff_write on public.locations
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- ---------------------------------------------------------------------------
-- location_dates
-- ---------------------------------------------------------------------------

alter table public.location_dates enable row level security;

-- Anon: read future dates whose parent location is active.
create policy location_dates_anon_read on public.location_dates
  for select to anon
  using (
    service_date >= public.today_london()
    and exists (
      select 1 from public.locations l
       where l.id = location_dates.location_id
         and l.is_active = true
    )
  );

create policy location_dates_staff_read on public.location_dates
  for select to authenticated
  using (public.is_active_staff());

create policy location_dates_staff_write on public.location_dates
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- ---------------------------------------------------------------------------
-- time_slots
-- ---------------------------------------------------------------------------

alter table public.time_slots enable row level security;

-- Anon: read slots whose parent date is future+active. Fullness filtering
-- happens via slot_availability, not RLS.
create policy time_slots_anon_read on public.time_slots
  for select to anon
  using (
    exists (
      select 1
        from public.location_dates d
        join public.locations l on l.id = d.location_id
       where d.id = time_slots.location_date_id
         and d.service_date >= public.today_london()
         and l.is_active = true
    )
  );

create policy time_slots_staff_read on public.time_slots
  for select to authenticated
  using (public.is_active_staff());

create policy time_slots_staff_write on public.time_slots
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
--
-- CRITICAL: anon must NEVER be able to read bookings directly. This is the
-- security tests' most important assertion.
-- All customer flows (create, cancel-by-token, view-by-token) go through
-- SECURITY DEFINER RPCs so anon has no direct table access.

alter table public.bookings enable row level security;

-- No anon policies at all. anon cannot select/insert/update/delete.

-- Staff can read + write all bookings.
create policy bookings_staff_read on public.bookings
  for select to authenticated
  using (public.is_active_staff());

create policy bookings_staff_write on public.bookings
  for all to authenticated
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- ---------------------------------------------------------------------------
-- Grant slot_availability to anon
-- ---------------------------------------------------------------------------

grant select on public.slot_availability to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Belt-and-braces: revoke default table privileges from anon
-- ---------------------------------------------------------------------------
-- Supabase grants SELECT to anon on new tables by default (via the
-- `postgrest` role hierarchy). RLS blocks it, but let's be explicit.

revoke all on public.bookings from anon;
revoke all on public.business_settings from anon;
revoke all on public.profiles from anon;

-- Anon still needs SELECT on the readable tables (guarded by RLS above).
grant select on public.locations, public.location_dates,
                 public.time_slots, public.services to anon;
