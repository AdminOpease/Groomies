"use client";

import { useEffect, useState, useTransition } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { formatDateLondon, formatTime } from "@/lib/format";
import { moveBooking, type AdminBookingState } from "../actions";

type Option = {
  slot_id: string;
  service_date: string;
  start_time: string;
  end_time: string;
  remaining: number;
  location_name: string;
};

export function MoveBooking({
  bookingId,
  currentSlotId,
  currentStatus,
}: {
  bookingId: string;
  currentSlotId: string;
  currentStatus: string;
}) {
  const [options, setOptions] = useState<Option[] | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [state, setState] = useState<AdminBookingState | null>(null);
  const [pending, startTransition] = useTransition();

  const isMovable = currentStatus === "pending" || currentStatus === "confirmed";

  useEffect(() => {
    if (!isMovable) return;
    let cancelled = false;

    async function load() {
      const supabase = getSupabaseBrowser();
      const [avail, meta] = await Promise.all([
        supabase.from("slot_availability").select("slot_id, remaining"),
        supabase
          .from("time_slots")
          .select(
            `id, start_time, end_time,
             location_date:location_dates!inner(
               service_date,
               location:locations!inner(name)
             )`
          ),
      ]);
      if (cancelled) return;

      const remainingById = new Map<string, number>();
      for (const a of avail.data ?? []) {
        remainingById.set(a.slot_id, a.remaining);
      }
      type Row = {
        id: string;
        start_time: string;
        end_time: string;
        location_date: {
          service_date: string;
          location: { name: string };
        };
      };
      const rows = (meta.data ?? []) as unknown as Row[];
      const list: Option[] = rows
        .map((row) => {
          const remaining = remainingById.get(row.id) ?? 0;
          return {
            slot_id: row.id,
            service_date: row.location_date.service_date,
            start_time: row.start_time,
            end_time: row.end_time,
            remaining,
            location_name: row.location_date.location.name,
          };
        })
        .filter((o) => o.slot_id !== currentSlotId && o.remaining > 0)
        .sort((a, b) => {
          if (a.service_date !== b.service_date)
            return a.service_date.localeCompare(b.service_date);
          return a.start_time.localeCompare(b.start_time);
        });

      setOptions(list);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isMovable, currentSlotId]);

  if (!isMovable) return null;

  const onMove = () => {
    if (!selected) return;
    startTransition(async () => {
      const r = await moveBooking(bookingId, selected);
      setState(r);
      if (r.ok) setSelected("");
    });
  };

  return (
    <div className="mt-6 rounded-2xl bg-white border border-stone-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-stone-900">
        Move to another slot
      </h2>
      <p className="mt-1 text-xs text-stone-500">
        Only slots with remaining capacity are listed. The customer's booking
        keeps its reference; they'll see the new time next time they open their
        manage link.
      </p>

      {options === null ? (
        <p className="mt-4 text-sm text-stone-500">Loading available slots…</p>
      ) : options.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">
          No other slots with capacity right now.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="move-select">
            Target slot
          </label>
          <select
            id="move-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[18rem]"
          >
            <option value="">Pick a slot…</option>
            {options.map((o) => (
              <option key={o.slot_id} value={o.slot_id}>
                {o.location_name} · {formatDateLondon(o.service_date)} ·{" "}
                {formatTime(o.start_time)}–{formatTime(o.end_time)} · {o.remaining} left
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onMove}
            disabled={pending || !selected}
            className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium px-4 py-2"
          >
            {pending ? "Moving…" : "Move booking"}
          </button>
        </div>
      )}

      {state?.message ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
