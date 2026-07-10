import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  const supabase = await getSupabaseServer();
  const { data: services, error } = await supabase
    .from("services")
    .select(
      "id, name, description, duration_minutes, price_cents, deposit_amount_cents, is_active, price_from, sort_order"
    )
    .order("is_active", { ascending: false })
    .order("sort_order")
    .order("name");

  if (error) {
    return (
      <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
        Failed to load services: {error.message}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Services
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Groom types and prices shown on the public Services page and in the
            booking form.
          </p>
        </div>
        <Link
          href="/admin/services/new"
          className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          Add service
        </Link>
      </div>

      {deleted ? (
        <p
          role="status"
          className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
        >
          Service deleted.
        </p>
      ) : null}

      {!services || services.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-10 text-center">
          <h2 className="text-lg font-semibold text-stone-900">
            No services yet
          </h2>
          <p className="mt-2 text-sm text-stone-500 max-w-sm mx-auto">
            Add your first service to appear on the public Services page and in
            the booking form.
          </p>
          <Link
            href="/admin/services/new"
            className="mt-5 inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2"
          >
            Add service
          </Link>
        </div>
      ) : (
        <ul className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100 overflow-hidden">
          {services.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/services/${s.id}`}
                className="flex items-center justify-between gap-4 px-4 sm:px-5 py-4 hover:bg-stone-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-stone-900 truncate">
                      {s.name}
                    </span>
                    {!s.is_active ? (
                      <span className="text-xs text-stone-500 bg-stone-100 border border-stone-200 rounded px-1.5 py-0.5">
                        hidden
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500 truncate">
                    {s.duration_minutes} min ·{" "}
                    {s.deposit_amount_cents !== null
                      ? `deposit ${formatMoney(s.deposit_amount_cents)}`
                      : "no deposit"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-700 font-semibold tabular-nums">
                    {s.price_from ? (
                      <span className="text-xs font-normal text-stone-400">
                        from{" "}
                      </span>
                    ) : null}
                    {formatMoney(s.price_cents)}
                  </span>
                  <span aria-hidden className="text-stone-300">
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
