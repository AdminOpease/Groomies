import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { formatDateLondon } from "@/lib/format";
import { EditMaxPerDay } from "./_components/EditMaxPerDay";
import { SlotRow } from "./_components/SlotRow";
import { AddSlot } from "./_components/AddSlot";
import { DeleteDateButton } from "../_components/DeleteDateButton";

export const dynamic = "force-dynamic";

export default async function EditDatePage({
  params,
}: {
  params: Promise<{ id: string; dateId: string }>;
}) {
  const { id: locationId, dateId } = await params;
  const supabase = await getSupabaseServer();

  const { data: locDate, error: dateErr } = await supabase
    .from("location_dates")
    .select(
      `
      id,
      service_date,
      max_per_day,
      location:locations(id, name),
      time_slots (
        id,
        start_time,
        end_time,
        max_appointments
      )
    `
    )
    .eq("id", dateId)
    .eq("location_id", locationId)
    .single();

  if (dateErr || !locDate) notFound();

  type LocationRef = { id: string; name: string };
  const rawLocation = (locDate as { location: LocationRef | LocationRef[] | null })
    .location;
  const location: LocationRef | null = Array.isArray(rawLocation)
    ? rawLocation[0] ?? null
    : rawLocation;
  if (!location) notFound();

  const slots = [...(locDate.time_slots ?? [])].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  // Booked counts per slot.
  const slotIds = slots.map((s) => s.id);
  const bookedBySlot = new Map<string, number>();
  if (slotIds.length > 0) {
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("time_slot_id, status, hold_expires_at")
      .in("time_slot_id", slotIds)
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
        /{" "}
        <Link
          href={`/admin/locations/${locationId}/dates`}
          className="hover:text-stone-800 underline underline-offset-2"
        >
          Schedule
        </Link>{" "}
        / <span aria-current="page">{formatDateLondon(locDate.service_date)}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {formatDateLondon(locDate.service_date)}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {location.name} — edit slots and per-day cap.
          </p>
        </div>
        <DeleteDateButton
          locationId={locationId}
          dateId={dateId}
          formattedDate={formatDateLondon(locDate.service_date)}
        />
      </div>

      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 mb-8">
        <h2 className="text-sm font-semibold text-stone-900 mb-3">Per-day cap</h2>
        <p className="text-xs text-stone-500 mb-3">
          Optional. Limits total bookings across all slots on this date.
        </p>
        <EditMaxPerDay
          locationId={locationId}
          dateId={dateId}
          current={locDate.max_per_day}
        />
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-stone-900 mb-3">
          Slots ({slots.length})
        </h2>
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm">
          {slots.length === 0 ? (
            <p className="px-4 sm:px-5 py-6 text-sm text-stone-500 text-center">
              No slots yet. Add one below.
            </p>
          ) : (
            <ul>
              {slots.map((s) => (
                <SlotRow
                  key={s.id}
                  locationId={locationId}
                  dateId={dateId}
                  slot={s}
                  booked={bookedBySlot.get(s.id) ?? 0}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-stone-900 mb-3">
          Add a slot
        </h2>
        <AddSlot locationId={locationId} dateId={dateId} />
      </section>
    </div>
  );
}
