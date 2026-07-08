import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;

  const supabase = await getSupabaseServer();
  const { data: locations, error } = await supabase
    .from("locations")
    .select("id, name, type, address, description, is_active, created_at")
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
        Failed to load locations: {error.message}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Locations
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Fixed stops or service areas where you accept bookings.
          </p>
        </div>
        <Link
          href="/admin/locations/new"
          className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          Add location
        </Link>
      </div>

      {deleted ? (
        <p
          role="status"
          className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
        >
          Location deleted.
        </p>
      ) : null}

      {!locations || locations.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-stone-100">
            {locations.map((loc) => (
              <li key={loc.id}>
                <Link
                  href={`/admin/locations/${loc.id}`}
                  className="flex items-center justify-between gap-4 px-4 sm:px-5 py-4 hover:bg-stone-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-900 truncate">
                        {loc.name}
                      </span>
                      <TypeBadge type={loc.type} />
                      {!loc.is_active ? (
                        <span className="text-xs text-stone-500 bg-stone-100 border border-stone-200 rounded px-1.5 py-0.5">
                          hidden
                        </span>
                      ) : null}
                    </div>
                    {loc.address ? (
                      <p className="mt-0.5 text-sm text-stone-500 truncate">
                        {loc.address}
                      </p>
                    ) : null}
                  </div>
                  <span aria-hidden className="text-stone-300">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  if (type === "stop") {
    return (
      <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
        stop
      </span>
    );
  }
  return (
    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
      area
    </span>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-10 text-center">
      <h2 className="text-lg font-semibold text-stone-900">No locations yet</h2>
      <p className="mt-2 text-sm text-stone-500 max-w-sm mx-auto">
        Add your first stop or service area. You'll open up dates and time
        slots on each location once it's created.
      </p>
      <Link
        href="/admin/locations/new"
        className="mt-5 inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        Add location
      </Link>
    </div>
  );
}
