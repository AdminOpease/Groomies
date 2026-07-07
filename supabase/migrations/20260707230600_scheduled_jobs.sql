-- Groomies · Migration 007
-- Scheduled jobs — pg_cron
--   1. expire_abandoned_holds: marks pending bookings 'expired' after their
--      hold window closes, freeing the slot for other customers.
--   2. enforce_retention: anonymises bookings past business_settings.retention_months.

create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------------------------
-- expire_abandoned_holds
-- ---------------------------------------------------------------------------

create or replace function public.expire_abandoned_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.bookings
     set status = 'expired'
   where status = 'pending'
     and hold_expires_at is not null
     and hold_expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

comment on function public.expire_abandoned_holds() is
  'Marks pending bookings whose hold window has closed as expired, freeing the slot. Run every minute via pg_cron.';

-- ---------------------------------------------------------------------------
-- enforce_retention (GDPR — anonymise old bookings)
-- ---------------------------------------------------------------------------
--
-- Anonymise, don't delete: keeps aggregate reporting intact while wiping PII.
-- Idempotent — bookings already anonymised are skipped by the marker email.

create or replace function public.enforce_retention()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_months integer;
  v_cutoff timestamptz;
  v_count  integer;
begin
  select retention_months into v_months
    from public.business_settings where id = true;

  v_cutoff := now() - (v_months || ' months')::interval;

  update public.bookings
     set customer_name   = 'ANONYMISED',
         customer_email  = 'anonymised@removed.local',
         customer_phone  = 'ANONYMISED',
         pet_name        = 'ANONYMISED',
         pet_species     = null,
         pet_breed       = null,
         notes           = null,
         service_address = null,
         payment_provider_ref = null
   where created_at < v_cutoff
     and customer_email <> 'anonymised@removed.local';

  get diagnostics v_count = row_count;
  return v_count;
end $$;

comment on function public.enforce_retention() is
  'Anonymises bookings older than business_settings.retention_months. Idempotent. Run daily via pg_cron.';

-- ---------------------------------------------------------------------------
-- Cron schedules
-- ---------------------------------------------------------------------------

-- Every minute: expire abandoned pending holds.
select cron.schedule(
  'groomies-expire-holds',
  '* * * * *',
  $$ select public.expire_abandoned_holds(); $$
);

-- Every day at 04:00 UTC: enforce retention.
select cron.schedule(
  'groomies-enforce-retention',
  '0 4 * * *',
  $$ select public.enforce_retention(); $$
);
