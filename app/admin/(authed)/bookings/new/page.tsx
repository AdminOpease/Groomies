import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { formatDateLondon, formatTime } from "@/lib/format";
import { ManualBookingForm } from "./_components/ManualBookingForm";

export const dynamic = "force-dynamic";

export default async function NewManualBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string }>;
}) {
  const { slot: slotId } = await searchParams;

  if (!slotId) {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Add a manual booking
        </h1>
        <p className="mt-2 text-sm text-stone-500 max-w-lg">
          Pick a slot from the schedule to add a phone booking into.
        </p>
        <Link
          href="/admin/locations"
          className="mt-6 inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2"
        >
          Go to locations →
        </Link>
      </div>
    );
  }

  const supabase = await getSupabaseServer();

  const { data: slot } = await supabase
    .from("time_slots")
    .select(
      `
      id, start_time, end_time, max_appointments,
      location_date:location_dates!inner(
        service_date,
        location:locations!inner(id, name, type)
      )
    `
    )
    .eq("id", slotId)
    .single();

  if (!slot) redirect("/admin/bookings/new");
  type Row = {
    id: string;
    start_time: string;
    end_time: string;
    max_appointments: number;
    location_date: {
      service_date: string;
      location: { id: string; name: string; type: string };
    };
  };
  const s = slot as unknown as Row;

  const { data: services } = await supabase
    .from("services")
    .select("id, name, price_cents")
    .eq("is_active", true)
    .order("sort_order");

  const requiresAddress = s.location_date.location.type === "area";

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-stone-500">
        <Link href="/admin/bookings" className="hover:text-stone-800 underline underline-offset-2">
          Bookings
        </Link>{" "}
        / <span aria-current="page">New</span>
      </nav>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        Add a manual booking
      </h1>
      <p className="mt-1 text-sm text-stone-500 mb-6">
        Enters as a confirmed booking straight away — no hold, no payment step.
      </p>

      <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
        <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
          Slot
        </p>
        <p className="mt-2 text-lg font-semibold text-stone-900">
          {s.location_date.location.name} ·{" "}
          {formatDateLondon(s.location_date.service_date)} ·{" "}
          {formatTime(s.start_time)}–{formatTime(s.end_time)}
        </p>
      </section>

      <ManualBookingForm
        slotId={slotId}
        services={services ?? []}
        requiresAddress={requiresAddress}
      />
    </div>
  );
}
