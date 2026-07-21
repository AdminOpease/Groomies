-- SECURITY FIX: anon could write to business_settings through the public view.
--
-- Found by testing the RLS boundary directly with the anon key: a PATCH to
-- /rest/v1/public_business_settings returned 200 and changed the underlying
-- row. An anonymous visitor could rename the business, redirect enquiries by
-- changing contact_email, flip payments_enabled or deposit_percent, and
-- re-open bookings that had been deliberately closed.
--
-- Two things combined to cause it:
--
--   1. Supabase's default privileges grant ALL on new objects in `public` to
--      anon and authenticated. Our migrations only ever said
--      `grant select on public.public_business_settings`, which ADDS to those
--      defaults — it does not replace them. So UPDATE was live the whole time.
--
--   2. The view is a simple single-table select, which Postgres makes
--      automatically updatable, and it runs with its owner's privileges
--      (security_invoker is off by default). So writes through the view
--      bypassed the RLS on business_settings entirely.
--
-- RLS on the base table was never the problem — it was correct, and reading
-- business_settings directly as anon is still denied. The view was a hole
-- straight past it.
--
-- slot_availability was not exploitable because it aggregates, so Postgres
-- refuses to auto-update it. That is luck, not design, so it gets the same
-- treatment.

-- ---------------------------------------------------------------------------
-- Revoke everything, then grant back only what the public site needs.
-- ---------------------------------------------------------------------------
-- `revoke all` then `grant select` is deliberate: it is idempotent and it
-- overrides the inherited defaults, whereas `grant select` alone only ever
-- adds. Any future migration that drops and recreates one of these views MUST
-- repeat this pattern — a bare `grant select` silently reopens the hole,
-- because the default ALL grant is reapplied to the newly created object.

revoke all on public.public_business_settings from anon, authenticated;
grant select on public.public_business_settings to anon, authenticated;

revoke all on public.slot_availability from anon, authenticated;
grant select on public.slot_availability to anon, authenticated;

comment on view public.public_business_settings is
  'Public projection of business_settings. SELECT-only for anon/authenticated — see 20260721210000. When adding sensitive fields to business_settings, do NOT add them here. If you drop and recreate this view, you MUST re-run the revoke-all/grant-select pair or anon regains write access via Supabase default privileges.';

comment on view public.slot_availability is
  'Public slot availability. SELECT-only for anon/authenticated — see 20260721210000.';
