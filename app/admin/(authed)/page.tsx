import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await getSupabaseServer();

  const [{ count: locationCount }, { count: bookingCount }] = await Promise.all([
    supabase.from("locations").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-1 text-stone-500">
          Your admin dashboard. The daily bookings view and calendar arrive in
          Phase 6 — for now, get your stops and dates set up.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Locations" value={locationCount ?? 0} />
        <StatCard label="Total bookings" value={bookingCount ?? 0} />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-900 mb-3">
          Getting started
        </h2>
        <ol className="space-y-2 text-stone-700">
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium flex items-center justify-center">
              1
            </span>
            <div>
              <Link href="/admin/locations/new" className="font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2">
                Add your first stop or service area
              </Link>
              <p className="text-sm text-stone-500">
                Pick "area" for door-to-door bookings; "stop" for a fixed
                meeting point.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium flex items-center justify-center">
              2
            </span>
            <div>
              <Link
                href="/admin/locations"
                className="font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
              >
                Open up dates and time slots
              </Link>
              <p className="text-sm text-stone-500">
                From any location, click <strong>Manage schedule</strong> to add
                dates one by one or generate weeks in bulk.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-stone-100 text-stone-500 text-sm font-medium flex items-center justify-center">
              3
            </span>
            <div>
              <span className="font-medium text-stone-400">
                Publish the public site
              </span>
              <p className="text-sm text-stone-500">Coming in Phase 5.</p>
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
      <div className="text-sm text-stone-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
