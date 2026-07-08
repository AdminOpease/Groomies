import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { formatDateLondon, formatTime, todayLondonISO } from "@/lib/format";
import { AddSingleDate } from "./_components/AddSingleDate";
import { DeleteDateButton } from "./_components/DeleteDateButton";

export const dynamic = "force-dynamic";

type SlotRow = {
  id: string;
  start_time: string;
  end_time: string;
  max_appointments: number;
};

type DateRow = {
  id: string;
  service_date: string;
  max_per_day: number | null;
  time_slots: SlotRow[];
};

export default async function DatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { id: locationId } = await params;
  const { deleted } = await searchParams;
  const today = todayLondonISO();

  const supabase = await getSupabaseServer();

  const { data: location, error: locErr } = await supabase
    .from("locations")
    .select("id, name, type, is_active")
    .eq("id", locationId)
    .single();

  if (locErr || !location) notFound();

  const { data: rawDates, error: datesErr } = await supabase
    .from("location_dates")
    .select(
      `
      id,
      service_date,
      max_per_day,
      time_slots (
        id,
        start_time,
        end_time,
        max_appointments
      )
    `
    )
    .eq("location_id", locationId)
    .gte("service_date", today)
    .order("service_date", { ascending: true });

  if (datesErr) {
    return (
      <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
        Failed to load schedule: {datesErr.message}
      </div>
    );
  }

  const dates: DateRow[] = (rawDates ?? []).map((d) => ({
    ...d,
    time_slots: [...(d.time_slots ?? [])].sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    ),
  }));

  const allSlotIds = dates.flatMap((d) => d.time_slots.map((s) => s.id));

  // Fill-levels: count active (confirmed or unexpired-pending) bookings per slot.
  const bookedBySlot = new Map<string, number>();
  if (allSlotIds.length > 0) {
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("time_slot_id, status, hold_expires_at")
      .in("time_slot_id", allSlotIds)
      .in("status", ["pending", "confirmed"]);

    const nowIso = new Date().toISOString();
    for (const b of activeBookings ?? []) {
      const counts =
        b.status === "confirmed" ||
        (b.status === "pending" && b.hold_expires_at && b.hold_expires_at > nowIso);
      if (counts) {
        bookedBySlot.set(
          b.time_slot_id,
          (bookedBySlot.get(b.time_slot_id) ?? 0) + 1
        );
      }
    }
  }

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-stone-500">
        <Link
          href="/admin/locations"
          className="hover:text-stone-800 underline underline-offset-2"
        >
          Locations
        </Link>{" "}
        /{" "}
        <Link
          href={`/admin/locations/${locationId}`}
          className="hover:text-stone-800 underline underline-offset-2"
        >
          {location.name}
        </Link>{" "}
        / <span aria-current="page">Schedule</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Schedule
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Open up dates and slots on <strong>{location.name}</strong>.
            {!location.is_active && (
              <span className="ml-1 text-amber-700">
                (This location is hidden from customers — dates you add here
                won't appear on the public site until you re-enable it.)
              </span>
            )}
          </p>
        </div>
        <Link
          href={`/admin/locations/${locationId}/dates/generate`}
          className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          Generate recurring schedule
        </Link>
      </div>

      {deleted ? (
        <p
          role="status"
          className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
        >
          Date deleted.
        </p>
      ) : null}

      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 mb-8">
        <h2 className="text-sm font-semibold text-stone-900 mb-3">
          Add a single date
        </h2>
        <AddSingleDate locationId={locationId} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-stone-900 mb-3">
          Upcoming dates ({dates.length})
        </h2>

        {dates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 text-center">
            <p className="text-stone-700 font-medium">No dates opened yet</p>
            <p className="mt-1 text-sm text-stone-500">
              Add a single date above, or generate a recurring schedule to
              open weeks at a time.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {dates.map((d) => {
              const totalCap = d.time_slots.reduce(
                (acc, s) => acc + s.max_appointments,
                0
              );
              const totalBooked = d.time_slots.reduce(
                (acc, s) => acc + (bookedBySlot.get(s.id) ?? 0),
                0
              );
              return (
                <li
                  key={d.id}
                  className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
                >
                  <header className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3 border-b border-stone-100">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-semibold text-stone-900">
                          {formatDateLondon(d.service_date)}
                        </span>
                        <span className="text-sm text-stone-500 tabular-nums">
                          {totalBooked}/{totalCap} booked
                        </span>
                        {d.max_per_day !== null ? (
                          <span className="text-xs text-stone-500">
                            day cap {d.max_per_day}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/locations/${locationId}/dates/${d.id}`}
                        className="text-sm text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                      >
                        Manage slots
                      </Link>
                      <DeleteDateButton
                        locationId={locationId}
                        dateId={d.id}
                        formattedDate={formatDateLondon(d.service_date)}
                      />
                    </div>
                  </header>

                  {d.time_slots.length === 0 ? (
                    <div className="px-4 sm:px-5 py-4 text-sm text-stone-500">
                      No slots yet.{" "}
                      <Link
                        href={`/admin/locations/${locationId}/dates/${d.id}`}
                        className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                      >
                        Add some
                      </Link>
                      .
                    </div>
                  ) : (
                    <ul className="divide-y divide-stone-100">
                      {d.time_slots.map((s) => {
                        const booked = bookedBySlot.get(s.id) ?? 0;
                        const isFull = booked >= s.max_appointments;
                        return (
                          <li
                            key={s.id}
                            className="flex items-center justify-between px-4 sm:px-5 py-2.5"
                          >
                            <span className="text-sm text-stone-800 tabular-nums">
                              {formatTime(s.start_time)}–{formatTime(s.end_time)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-stone-600 tabular-nums">
                                {booked}/{s.max_appointments}
                              </span>
                              {isFull ? (
                                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                  full
                                </span>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
