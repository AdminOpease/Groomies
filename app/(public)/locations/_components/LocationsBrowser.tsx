"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { formatDateLondon } from "@/lib/format";

type Location = {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  address: string | null;
};

type Availability = {
  nextDate: string;
  totalRemaining: number;
} | null;

type AvailabilityState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; byLocation: Map<string, Availability> };

export function LocationsBrowser({
  locations,
  showSlotCounts,
}: {
  locations: Location[];
  showSlotCounts: boolean;
}) {
  const [state, setState] = useState<AvailabilityState>({ status: "loading" });
  const reduce = useReducedMotion();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = getSupabaseBrowser();
      try {
        const [datesRes, availRes] = await Promise.all([
          supabase
            .from("location_dates")
            .select("id, location_id, service_date"),
          supabase
            .from("slot_availability")
            .select("location_date_id, remaining"),
        ]);
        if (datesRes.error) throw datesRes.error;
        if (availRes.error) throw availRes.error;
        if (cancelled) return;

        // Group remaining by (location_id, service_date).
        const byLocDate = new Map<string, Map<string, number>>();
        const dateById = new Map<
          string,
          { locationId: string; serviceDate: string }
        >();
        for (const d of datesRes.data ?? []) {
          dateById.set(d.id, {
            locationId: d.location_id,
            serviceDate: d.service_date,
          });
        }
        for (const a of availRes.data ?? []) {
          const dInfo = dateById.get(a.location_date_id);
          if (!dInfo) continue;
          let byDate = byLocDate.get(dInfo.locationId);
          if (!byDate) {
            byDate = new Map();
            byLocDate.set(dInfo.locationId, byDate);
          }
          byDate.set(
            dInfo.serviceDate,
            (byDate.get(dInfo.serviceDate) ?? 0) + a.remaining
          );
        }

        // Compute first date with remaining > 0 per location.
        const byLocation = new Map<string, Availability>();
        for (const loc of locations) {
          const byDate = byLocDate.get(loc.id);
          if (!byDate || byDate.size === 0) {
            byLocation.set(loc.id, null);
            continue;
          }
          const sortedDates = [...byDate.keys()].sort();
          const nextAvailable = sortedDates.find(
            (d) => (byDate.get(d) ?? 0) > 0
          );
          if (nextAvailable) {
            byLocation.set(loc.id, {
              nextDate: nextAvailable,
              totalRemaining: byDate.get(nextAvailable) ?? 0,
            });
          } else {
            byLocation.set(loc.id, null);
          }
        }

        setState({ status: "ready", byLocation });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [locations]);

  if (locations.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-medium text-stone-800">
          New routes launching soon
        </p>
        <p className="mt-2 text-sm text-stone-500">
          Check back — we're adding areas each month.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
      {locations.map((loc, i) => {
        const availability =
          state.status === "ready" ? state.byLocation.get(loc.id) : undefined;
        return (
          <motion.li
            key={loc.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.45,
              delay: Math.min(i, 6) * 0.04,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Link
              href={`/locations/${loc.slug}`}
              className="group block rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-emerald-300 hover:shadow-md p-6 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-stone-900 group-hover:text-emerald-800 transition-colors">
                    {loc.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-stone-500 capitalize">
                    {loc.type === "area"
                      ? "Door-to-door area"
                      : "Fixed meeting point"}
                    {loc.address ? ` · ${loc.address}` : ""}
                  </p>
                </div>
                <span className="text-stone-300 group-hover:text-emerald-500 transition-colors">
                  →
                </span>
              </div>

              {loc.description ? (
                <p className="mt-3 text-sm text-stone-600 line-clamp-2">
                  {loc.description}
                </p>
              ) : null}

              <div className="mt-4">
                <AvailabilityBadge
                  state={state}
                  availability={availability}
                  showSlotCounts={showSlotCounts}
                />
              </div>
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}

function AvailabilityBadge({
  state,
  availability,
  showSlotCounts,
}: {
  state: AvailabilityState;
  availability: Availability | undefined;
  showSlotCounts: boolean;
}) {
  if (state.status === "loading") {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-stone-500">
        <span className="h-1.5 w-1.5 rounded-full bg-stone-300 animate-pulse" />
        Checking availability…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-stone-500">
        <span className="h-1.5 w-1.5 rounded-full bg-stone-300" />
        Tap for availability
      </div>
    );
  }
  if (!availability) {
    return (
      <span className="inline-flex items-center rounded-full bg-stone-100 text-stone-600 text-xs font-medium px-2.5 py-1">
        No open dates
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium px-2.5 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Next: {formatDateLondon(availability.nextDate)}
      {showSlotCounts
        ? ` · ${availability.totalRemaining} slot${
            availability.totalRemaining === 1 ? "" : "s"
          } left`
        : ""}
    </span>
  );
}
