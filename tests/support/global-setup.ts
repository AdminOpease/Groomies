import { createClient } from "@supabase/supabase-js";

/**
 * Vitest global setup: open public bookings for the duration of the run, then
 * put the flag back exactly as it was.
 *
 * Why this is needed: `business_settings.bookings_enabled` gates every public
 * booking via a trigger on `bookings` (migration 20260721200000). Most of this
 * suite exercises `book_slot` as anon, so with the flag off — which is the
 * pre-launch default — 11 tests fail with BOOKINGS_DISABLED before they can
 * assert anything.
 *
 * ⚠️ These tests run against the REAL Supabase project (see clients.ts), so
 * this genuinely opens public booking for the few seconds a run takes. The
 * window is small and the site's own pages are ISR-cached, but it is not zero
 * risk. The proper fix is a separate test project — already the recommended
 * post-handover setup in docs/HANDOVER.md §6. Until then, don't run the suite
 * during trading hours.
 *
 * The original value is captured and restored in teardown, including when the
 * run fails, so a crashed test cannot leave the business open by accident.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function setup() {
  if (!url || !serviceKey) return;
  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data } = await service
    .from("business_settings")
    .select("bookings_enabled")
    .eq("id", true)
    .single();

  // Stash on globalThis so teardown sees it even across worker boundaries.
  (globalThis as Record<string, unknown>).__bookingsEnabledBefore =
    data?.bookings_enabled ?? false;

  await service
    .from("business_settings")
    .update({ bookings_enabled: true })
    .eq("id", true);
}

export async function teardown() {
  if (!url || !serviceKey) return;
  const service = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const before = (globalThis as Record<string, unknown>)
    .__bookingsEnabledBefore;

  // Default to CLOSED if we somehow lost the original value. Leaving the
  // business open is the worse failure.
  await service
    .from("business_settings")
    .update({ bookings_enabled: before === true })
    .eq("id", true);
}
