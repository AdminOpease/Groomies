import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { formatDateLondon, formatTime, todayLondonISO } from "@/lib/format";

export const dynamic = "force-dynamic";

type UpcomingBooking = {
  id: string;
  booking_reference: string;
  status: string;
  customer_name: string;
  pet_name: string;
  time_slot: {
    start_time: string;
    location_date: {
      service_date: string;
      location: { name: string };
    };
  };
};

export default async function AdminDashboard() {
  const supabase = await getSupabaseServer();
  const today = todayLondonISO();
  const weekEnd = new Date(`${today}T12:00:00Z`);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const weekEndIso = weekEnd.toISOString().slice(0, 10);

  const [
    { data: todayBookings },
    { data: weekBookings },
    { data: upcomingDates },
    { data: upcoming },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, time_slot:time_slots!inner(location_date:location_dates!inner(service_date))")
      .in("status", ["pending", "confirmed"])
      .eq("time_slot.location_date.service_date", today)
      .limit(200),
    supabase
      .from("bookings")
      .select("id, time_slot:time_slots!inner(location_date:location_dates!inner(service_date))")
      .in("status", ["pending", "confirmed"])
      .gte("time_slot.location_date.service_date", today)
      .lte("time_slot.location_date.service_date", weekEndIso)
      .limit(500),
    supabase
      .from("location_dates")
      .select("id")
      .gte("service_date", today)
      .lte("service_date", weekEndIso),
    supabase
      .from("bookings")
      .select(
        `
        id, booking_reference, status, customer_name, pet_name,
        time_slot:time_slots!inner(
          start_time,
          location_date:location_dates!inner(
            service_date,
            location:locations!inner(name)
          )
        )
      `
      )
      .in("status", ["pending", "confirmed"])
      .gte("time_slot.location_date.service_date", today)
      .limit(500),
  ]);

  // upcoming already filtered server-side; slice to next 5 by earliest slot.
  const upcomingSorted = ((upcoming ?? []) as unknown as UpcomingBooking[])
    .sort((a, b) => {
      const da = a.time_slot.location_date.service_date;
      const db = b.time_slot.location_date.service_date;
      if (da !== db) return da.localeCompare(db);
      return a.time_slot.start_time.localeCompare(b.time_slot.start_time);
    })
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-stone-500">
          Today at a glance. Full lists in{" "}
          <Link
            href="/admin/bookings"
            className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
          >
            Bookings
          </Link>
          .
        </p>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Today" value={todayBookings?.length ?? 0} sub="Active bookings" />
        <StatCard label="This week" value={weekBookings?.length ?? 0} sub="Active bookings" />
        <StatCard label="Days out" value={upcomingDates?.length ?? 0} sub="Next 7 days" />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-stone-900">
            Next up
          </h2>
          <Link
            href="/admin/bookings"
            className="text-sm text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
          >
            All bookings →
          </Link>
        </div>

        {upcomingSorted.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
            <p className="text-stone-700 font-medium">Nothing upcoming yet</p>
            <p className="mt-1 text-sm text-stone-500">
              Bookings will appear here as they come in.
            </p>
          </div>
        ) : (
          <ul className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100 overflow-hidden">
            {upcomingSorted.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/admin/bookings/${b.id}`}
                  className="grid grid-cols-[7rem_1fr_auto] gap-3 sm:gap-5 items-center px-4 sm:px-5 py-3 hover:bg-stone-50"
                >
                  <div className="text-sm">
                    <p className="text-stone-800 tabular-nums">
                      {formatTime(b.time_slot.start_time)}
                    </p>
                    <p className="text-xs text-stone-500 tabular-nums">
                      {formatDateLondon(b.time_slot.location_date.service_date)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900 truncate">
                      {b.customer_name}
                      <span className="text-stone-400 font-normal"> · {b.pet_name}</span>
                    </p>
                    <p className="text-xs text-stone-500 truncate">
                      {b.time_slot.location_date.location.name}
                    </p>
                  </div>
                  <span aria-hidden className="text-stone-300">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5">
      <div className="text-xs text-stone-500 uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums text-stone-900">
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-xs text-stone-500">{sub}</div> : null}
    </div>
  );
}
