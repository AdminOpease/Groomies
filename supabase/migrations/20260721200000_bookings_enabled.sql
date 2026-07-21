-- Pre-launch holding state: a switch that stops the public taking bookings.
--
-- The site is live on groomies.uk before it is ready to trade. Without this,
-- a stray visitor can book a slot that notifies nobody (Resend is not yet
-- configured) and turn up expecting a groom.
--
-- Two distinct switches, deliberately separate:
--   payments_enabled  — whether we COLLECT money
--   bookings_enabled  — whether the public can BOOK AT ALL
--
-- Staff are never blocked. The owner still needs to enter a booking taken over
-- the phone while the public flow is closed, so the guard exempts anyone with
-- an active profile row.

-- ---------------------------------------------------------------------------
-- 1. The flag
-- ---------------------------------------------------------------------------

alter table public.business_settings
  add column if not exists bookings_enabled boolean not null default true;

comment on column public.business_settings.bookings_enabled is
  'When false, public booking is refused (BOOKINGS_DISABLED / P0013). Staff-created bookings are unaffected. Independent of payments_enabled.';

-- ---------------------------------------------------------------------------
-- 2. Expose it publicly
-- ---------------------------------------------------------------------------
-- The public site has to know, so it can render "bookings open soon" instead
-- of a dead button. Not sensitive.
--
-- Dropped and recreated because adding a column to a view is not a
-- replace-compatible change.

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
  show_slot_counts,
  bookings_enabled
from public.business_settings;

grant select on public.public_business_settings to anon, authenticated;

comment on view public.public_business_settings is
  'Public projection of business_settings. When adding sensitive fields to business_settings, do NOT add them here.';

-- ---------------------------------------------------------------------------
-- 3. Enforce it in the database, not just the UI
-- ---------------------------------------------------------------------------
-- A UI-only guard is not enough here. `/` and `/services` are ISR pages with
-- revalidate = 3600, so a page rendered while bookings were open can keep
-- serving live booking links for up to an hour after the switch is flipped.
-- Anyone on that stale page would otherwise book successfully.
--
-- Implemented as a trigger on bookings rather than inside book_slot: it covers
-- every current and future insert path, and it avoids reissuing the whole
-- 300-line book_slot body just to add four lines to the top.
--
-- The exception aborts the transaction, so a refused attempt never consumes
-- slot capacity — same guarantee the postcode and variant checks give.

create or replace function public.enforce_bookings_enabled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Staff bypass. auth.uid() is still the caller's inside a security-definer
  -- function, so this correctly identifies a logged-in admin even though
  -- book_slot itself runs as the definer.
  if exists (
    select 1 from public.profiles
     where id = auth.uid()
       and is_active = true
  ) then
    return new;
  end if;

  if not (select bookings_enabled from public.business_settings where id = true) then
    raise exception 'BOOKINGS_DISABLED'
      using errcode = 'P0013';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_enforce_enabled on public.bookings;
create trigger bookings_enforce_enabled
before insert on public.bookings
for each row execute function public.enforce_bookings_enabled();

comment on function public.enforce_bookings_enabled() is
  'Blocks public booking inserts while business_settings.bookings_enabled is false. Staff are exempt so phone bookings still work.';

-- ---------------------------------------------------------------------------
-- 4. Close the door
-- ---------------------------------------------------------------------------
-- Default is true so existing installs are unaffected, but this specific
-- deployment is pre-launch. Flip it back on in /admin/settings when Resend is
-- live and a booking actually notifies someone.

update public.business_settings set bookings_enabled = false where id = true;
