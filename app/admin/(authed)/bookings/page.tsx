import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { formatDateLondon, formatTime, todayLondonISO } from "@/lib/format";
import { BookingsFilters } from "./_components/BookingsFilters";

export const dynamic = "force-dynamic";

type StatusFilter =
  | "active"
  | "confirmed"
  | "pending"
  | "cancelled"
  | "expired"
  | "all";
type RangeFilter = "today" | "week" | "month" | "all_future" | "past";

function computeRange(range: RangeFilter): {
  from?: string;
  to?: string;
  order: "asc" | "desc";
} {
  const today = todayLondonISO();
  if (range === "today") return { from: today, to: today, order: "asc" };
  if (range === "week") {
    const to = new Date(`${today}T12:00:00Z`);
    to.setUTCDate(to.getUTCDate() + 6);
    return { from: today, to: to.toISOString().slice(0, 10), order: "asc" };
  }
  if (range === "month") {
    const to = new Date(`${today}T12:00:00Z`);
    to.setUTCDate(to.getUTCDate() + 30);
    return { from: today, to: to.toISOString().slice(0, 10), order: "asc" };
  }
  if (range === "all_future") return { from: today, order: "asc" };
  if (range === "past") {
    const to = new Date(`${today}T12:00:00Z`);
    to.setUTCDate(to.getUTCDate() - 1);
    return { to: to.toISOString().slice(0, 10), order: "desc" };
  }
  return { order: "asc" };
}

type BookingRow = {
  id: string;
  booking_reference: string;
  status: string;
  source: string;
  customer_name: string;
  pet_name: string;
  created_at: string;
  service: { name: string } | null;
  time_slot: {
    start_time: string;
    end_time: string;
    location_date: {
      service_date: string;
      location: { id: string; name: string };
    };
  };
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: StatusFilter;
    location?: string;
    range?: RangeFilter;
  }>;
}) {
  const sp = await searchParams;
  const status = (sp.status ?? "active") as StatusFilter;
  const locationId = sp.location ?? "";
  const range = (sp.range ?? "week") as RangeFilter;

  const supabase = await getSupabaseServer();

  // Locations for the filter dropdown.
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name")
    .order("name");

  const { from, to, order } = computeRange(range);

  // Query: bookings joined to slot → date → location, and optional service.
  // We filter by service_date at the SQL level via the nested inner join.
  let query = supabase
    .from("bookings")
    .select(
      `
      id, booking_reference, status, source, customer_name, pet_name, created_at,
      service:services(name),
      time_slot:time_slots!inner(
        start_time, end_time,
        location_date:location_dates!inner(
          service_date,
          location:locations!inner(id, name)
        )
      )
    `
    )
    .limit(500);

  if (status === "active") query = query.in("status", ["pending", "confirmed"]);
  else if (status !== "all") query = query.eq("status", status);

  if (locationId) {
    query = query.eq("time_slot.location_date.location.id", locationId);
  }
  if (from) query = query.gte("time_slot.location_date.service_date", from);
  if (to) query = query.lte("time_slot.location_date.service_date", to);

  const { data: rawRows, error } = await query;

  if (error) {
    return (
      <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
        Failed to load bookings: {error.message}
      </div>
    );
  }

  // Sort in-memory by (service_date, start_time). Supabase order over deeply
  // nested tables is finicky, so it's cleaner to sort here.
  const rows = (rawRows ?? []) as unknown as BookingRow[];
  rows.sort((a, b) => {
    const da = a.time_slot.location_date.service_date;
    const db = b.time_slot.location_date.service_date;
    if (da !== db) return order === "asc" ? da.localeCompare(db) : db.localeCompare(da);
    return order === "asc"
      ? a.time_slot.start_time.localeCompare(b.time_slot.start_time)
      : b.time_slot.start_time.localeCompare(a.time_slot.start_time);
  });

  // Group by service_date for section headers.
  const groups = new Map<string, BookingRow[]>();
  for (const r of rows) {
    const key = r.time_slot.location_date.service_date;
    const existing = groups.get(key);
    if (existing) existing.push(r);
    else groups.set(key, [r]);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Bookings
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {rows.length} booking{rows.length === 1 ? "" : "s"} matching your filters.
          </p>
        </div>
      </div>

      <BookingsFilters locations={locations ?? []} />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
          <p className="text-lg font-medium text-stone-800">
            No bookings match those filters
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Try widening the date range or clearing the location filter.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([date, list]) => (
            <section key={date}>
              <h2 className="text-sm font-semibold text-stone-900 mb-2 tabular-nums">
                {formatDateLondon(date)}{" "}
                <span className="text-stone-400 font-normal">· {list.length}</span>
              </h2>
              <ul className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100 overflow-hidden">
                {list.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="grid grid-cols-[6rem_1fr_auto] sm:grid-cols-[6rem_1fr_1fr_auto] gap-3 sm:gap-5 items-center px-4 sm:px-5 py-3 hover:bg-stone-50"
                    >
                      <span className="text-sm text-stone-700 tabular-nums">
                        {formatTime(b.time_slot.start_time)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-stone-900 truncate">
                          {b.customer_name}
                          <span className="text-stone-400 font-normal">
                            {" · "}
                            {b.pet_name}
                          </span>
                        </p>
                        <p className="text-xs text-stone-500 truncate">
                          {b.time_slot.location_date.location.name}
                          {b.service ? ` · ${b.service.name}` : ""}
                        </p>
                      </div>
                      <span className="hidden sm:block text-xs text-stone-500 font-mono">
                        {b.booking_reference}
                      </span>
                      <StatusBadge status={b.status} source={b.source} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, source }: { status: string; source: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    confirmed: {
      label: "Confirmed",
      cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    pending: { label: "Pending", cls: "bg-amber-50 text-amber-800 border-amber-200" },
    cancelled: {
      label: "Cancelled",
      cls: "bg-stone-100 text-stone-600 border-stone-200",
    },
    expired: {
      label: "Expired",
      cls: "bg-stone-100 text-stone-500 border-stone-200",
    },
  };
  const c = cfg[status] ?? cfg.confirmed;
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-full border ${c.cls} text-xs font-medium px-2 py-0.5`}
      >
        {c.label}
      </span>
      {source === "manual" ? (
        <span className="hidden sm:inline-flex items-center rounded-full border border-stone-200 bg-stone-100 text-stone-600 text-[10px] font-medium px-1.5 py-0.5 uppercase tracking-wide">
          Phone
        </span>
      ) : null}
    </div>
  );
}
