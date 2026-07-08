-- Groomies · Migration 012
-- Phase 8 — right-to-erasure, usage counters, keep-alive.

-- ---------------------------------------------------------------------------
-- Right-to-erasure — one-shot anonymise a single booking
-- ---------------------------------------------------------------------------
--
-- Same shape as enforce_retention() but takes a specific booking id.
-- Staff-callable. Idempotent — running twice is safe.

create or replace function public.anonymise_booking(p_booking_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  if not public.is_active_staff() then
    raise exception 'STAFF_ONLY' using errcode = 'P0301';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0101';
  end if;

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
   where id = p_booking_id;

  return json_build_object(
    'ok', true,
    'booking_reference', v_booking.booking_reference
  );
end $$;

revoke execute on function public.anonymise_booking(uuid) from public;
grant  execute on function public.anonymise_booking(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Email counter — how many emails we've sent this month
-- ---------------------------------------------------------------------------
--
-- Resend's free tier is 3,000/month and 100/day. Owner alerts fire when
-- either meter approaches 80%. Counter is bumped from lib/email.ts on
-- every successful send.

create table if not exists public.email_sent_counter (
  month_key   text primary key,          -- YYYY-MM
  day_key     text not null,             -- YYYY-MM-DD of last increment
  count_month integer not null default 0,
  count_day   integer not null default 0,
  updated_at  timestamptz not null default now()
);

create or replace function public.increment_email_count()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month text := to_char(now() at time zone 'Europe/London', 'YYYY-MM');
  v_day   text := to_char(now() at time zone 'Europe/London', 'YYYY-MM-DD');
begin
  insert into public.email_sent_counter (month_key, day_key, count_month, count_day)
  values (v_month, v_day, 1, 1)
  on conflict (month_key) do update
    set count_month = public.email_sent_counter.count_month + 1,
        count_day = case
          when public.email_sent_counter.day_key = excluded.day_key
            then public.email_sent_counter.count_day + 1
          else 1
        end,
        day_key = excluded.day_key,
        updated_at = now();
end $$;

revoke execute on function public.increment_email_count() from public;
grant  execute on function public.increment_email_count() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Usage snapshot — for the admin dashboard widget
-- ---------------------------------------------------------------------------
--
-- Returns current usage numbers and a warning flag when any meter is at
-- ~80% of its free-tier limit. Cheap to call — one row from each table.

create or replace function public.get_usage_stats()
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_db_bytes     bigint;
  v_month_key    text := to_char(now() at time zone 'Europe/London', 'YYYY-MM');
  v_day_key      text := to_char(now() at time zone 'Europe/London', 'YYYY-MM-DD');
  v_month_count  integer;
  v_day_count    integer;
  v_bookings     integer;
begin
  if not public.is_active_staff() then
    raise exception 'STAFF_ONLY' using errcode = 'P0301';
  end if;

  select pg_database_size(current_database()) into v_db_bytes;
  select count_month, case when day_key = v_day_key then count_day else 0 end
    into v_month_count, v_day_count
    from public.email_sent_counter where month_key = v_month_key;
  select count(*)::integer into v_bookings from public.bookings;

  return json_build_object(
    'db_size_bytes',       v_db_bytes,
    'db_size_mb',          round(v_db_bytes / 1024.0 / 1024.0, 1),
    'db_free_limit_mb',    500,
    'emails_month',        coalesce(v_month_count, 0),
    'emails_month_limit',  3000,
    'emails_day',          coalesce(v_day_count, 0),
    'emails_day_limit',    100,
    'bookings_total',      v_bookings
  );
end $$;

revoke execute on function public.get_usage_stats() from public;
grant  execute on function public.get_usage_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- Keep-alive — pings the DB every hour so Supabase free tier doesn't pause
-- ---------------------------------------------------------------------------
--
-- Supabase pauses projects idle for 7 days on the free tier. A simple hourly
-- SELECT keeps activity metrics ticking so the project stays warm.

-- Re-schedulable: unschedule any prior copy, then schedule fresh.
do $$
begin
  perform cron.unschedule('groomies-keep-alive');
exception when others then null;
end $$;

select cron.schedule(
  'groomies-keep-alive',
  '17 * * * *',           -- 17 minutes past every hour, off the usual 00
  $$ select 1; $$
);
