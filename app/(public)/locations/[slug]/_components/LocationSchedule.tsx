"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { formatDateLondon, formatTime } from "@/lib/format";

type Slot = {
  id: string;
  start_time: string;
  end_time: string;
  remaining: number;
  max_appointments: number;
};

type DateGroup = {
  id: string;
  service_date: string;
  slots: Slot[];
};

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; dates: DateGroup[] };

export function LocationSchedule({ locationId }: { locationId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const reduce = useReducedMotion();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = getSupabaseBrowser();
      try {
        const [datesRes, availRes] = await Promise.all([
          supabase
            .from("location_dates")
            .select(
              `
                id,
                service_date,
                time_slots (
                  id, start_time, end_time, max_appointments
                )
              `
            )
            .eq("location_id", locationId)
            .order("service_date", { ascending: true }),
          supabase
            .from("slot_availability")
            .select("slot_id, remaining"),
        ]);
        if (datesRes.error) throw datesRes.error;
        if (availRes.error) throw availRes.error;
        if (cancelled) return;

        const remainingBySlot = new Map<string, number>();
        for (const a of availRes.data ?? []) {
          remainingBySlot.set(a.slot_id, a.remaining);
        }

        type RawDate = {
          id: string;
          service_date: string;
          time_slots: Array<{
            id: string;
            start_time: string;
            end_time: string;
            max_appointments: number;
          }> | null;
        };
        const rawDates = (datesRes.data ?? []) as RawDate[];
        const dates: DateGroup[] = rawDates
          .map((d) => {
            const slots: Slot[] = (d.time_slots ?? [])
              .map((s) => ({
                id: s.id,
                start_time: s.start_time,
                end_time: s.end_time,
                max_appointments: s.max_appointments,
                remaining: remainingBySlot.get(s.id) ?? 0,
              }))
              .sort((a, b) => a.start_time.localeCompare(b.start_time));
            return { id: d.id, service_date: d.service_date, slots };
          })
          // Only show dates that have slot_availability rows (view filters past/inactive out).
          .filter((d) =>
            d.slots.some((s) => remainingBySlot.has(s.id))
          )
          .map((d) => ({
            ...d,
            slots: d.slots.filter((s) => remainingBySlot.has(s.id)),
          }));

        setState({ status: "ready", dates });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  if (state.status === "loading") {
    return (
      <div className="text-stone-500 text-sm py-8">
        Loading available dates…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 p-5 text-sm">
        We couldn't reach the availability service just now. Please try again in
        a moment — your slot is safe until you book it.
      </div>
    );
  }
  if (state.dates.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
        <p className="text-lg font-medium text-stone-800">
          No open dates just yet
        </p>
        <p className="mt-2 text-sm text-stone-500">
          New dates are added regularly. Check back in a few days.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-6">
      {state.dates.map((d, i) => (
        <motion.li
          key={d.id}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: Math.min(i, 6) * 0.04,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden"
        >
          <header className="border-b border-stone-100 px-5 py-3 flex items-baseline justify-between flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-stone-900">
              {formatDateLondon(d.service_date)}
            </h3>
            <span className="text-sm text-stone-500 tabular-nums">
              {d.slots.reduce((n, s) => n + s.remaining, 0)} slot
              {d.slots.reduce((n, s) => n + s.remaining, 0) === 1 ? "" : "s"} left
            </span>
          </header>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 sm:p-4">
            {d.slots.map((s) => {
              const isFull = s.remaining <= 0;
              return (
                <li key={s.id}>
                  {isFull ? (
                    <div
                      aria-disabled
                      className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-400 text-sm py-3 px-2"
                    >
                      <span className="tabular-nums">
                        {formatTime(s.start_time)}
                      </span>
                      <span className="mt-0.5 text-xs">Fully booked</span>
                    </div>
                  ) : (
                    <Link
                      href={`/book/${s.id}`}
                      className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 hover:border-emerald-500 text-stone-800 text-sm py-3 px-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    >
                      <span className="tabular-nums font-medium">
                        {formatTime(s.start_time)}
                      </span>
                      <span className="mt-0.5 text-xs text-emerald-700">
                        {s.remaining} left
                      </span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </motion.li>
      ))}
    </ul>
  );
}
