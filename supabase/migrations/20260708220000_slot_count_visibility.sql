-- Groomies · Migration 013
-- business_settings.show_slot_counts — owner-controlled toggle for whether
-- the public site tells customers exactly how many slots are left.
--
-- When on (default), the location list shows "Next: Tue 15 Jul · 3 slots
-- left" and each slot shows "3 left" until it fills up. When off, only
-- dates surface (customers see the day + times, and a "Fully booked" tag
-- once nothing's available).

alter table public.business_settings
  add column if not exists show_slot_counts boolean not null default true;

-- Recreate the anon-safe view so the new column flows through.
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
  refund_cutoff_hours,
  show_slot_counts
from public.business_settings;

grant select on public.public_business_settings to anon, authenticated;
