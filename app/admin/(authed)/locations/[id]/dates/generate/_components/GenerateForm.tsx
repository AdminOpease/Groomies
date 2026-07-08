"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { generateRecurring, type GenerateState } from "../../actions";

const WEEKDAYS = [
  { value: 1, short: "Mon" },
  { value: 2, short: "Tue" },
  { value: 3, short: "Wed" },
  { value: 4, short: "Thu" },
  { value: 5, short: "Fri" },
  { value: 6, short: "Sat" },
  { value: 0, short: "Sun" },
];

type Slot = { start: string; end: string; max: string };

const DEFAULT_TEMPLATE: Slot[] = [
  { start: "09:00", end: "10:30", max: "1" },
  { start: "10:45", end: "12:15", max: "1" },
  { start: "13:15", end: "14:45", max: "1" },
  { start: "15:00", end: "16:30", max: "1" },
];

const initialState: GenerateState = { ok: true };

export function GenerateForm({
  locationId,
  defaultStartDate,
}: {
  locationId: string;
  defaultStartDate: string;
}) {
  const router = useRouter();
  const [weekdays, setWeekdays] = useState<number[]>([2]); // Tuesday
  const [weeks, setWeeks] = useState<string>("4");
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [slots, setSlots] = useState<Slot[]>(DEFAULT_TEMPLATE);
  const [maxPerDay, setMaxPerDay] = useState<string>("");

  const boundAction = generateRecurring.bind(null, locationId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  // Live preview counts.
  const preview = useMemo(() => {
    const weeksNum = Math.max(0, parseInt(weeks, 10) || 0);
    if (weekdays.length === 0 || weeksNum <= 0 || !startDate) {
      return { dates: 0, slots: 0 };
    }
    const start = new Date(`${startDate}T00:00:00Z`);
    if (Number.isNaN(start.getTime())) return { dates: 0, slots: 0 };
    let dates = 0;
    for (let i = 0; i < weeksNum * 7; i++) {
      const d = new Date(start.getTime() + i * 86_400_000);
      if (weekdays.includes(d.getUTCDay())) dates++;
    }
    return { dates, slots: dates * slots.length };
  }, [weekdays, weeks, startDate, slots.length]);

  const toggleDay = (v: number) =>
    setWeekdays((cur) => (cur.includes(v) ? cur.filter((n) => n !== v) : [...cur, v]));

  const addSlot = () =>
    setSlots((s) => [...s, { start: "09:00", end: "10:30", max: "1" }]);

  const removeSlot = (idx: number) =>
    setSlots((s) => s.filter((_, i) => i !== idx));

  const updateSlot = (idx: number, patch: Partial<Slot>) =>
    setSlots((s) => s.map((sl, i) => (i === idx ? { ...sl, ...patch } : sl)));

  return (
    <form
      action={(fd) => {
        // Only include current slot template values (state, not stale form defaults).
        // React 19 useActionState replays the FormData, so we build it fresh here.
        formAction(fd);
      }}
      className="space-y-8 max-w-2xl"
    >
      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-stone-700">
          Days of the week
        </legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => {
            const on = weekdays.includes(d.value);
            return (
              <label
                key={d.value}
                className={
                  "cursor-pointer select-none rounded-lg border px-3 py-1.5 text-sm transition-colors " +
                  (on
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50")
                }
              >
                <input
                  type="checkbox"
                  name="weekday"
                  value={d.value}
                  checked={on}
                  onChange={() => toggleDay(d.value)}
                  className="sr-only"
                />
                {d.short}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="start_date"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Start date
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label
            htmlFor="weeks"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Number of weeks
          </label>
          <input
            id="weeks"
            name="weeks"
            type="number"
            min="1"
            max="52"
            required
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            className="block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label
            htmlFor="max_per_day"
            className="block text-sm font-medium text-stone-700 mb-1"
          >
            Cap per day
          </label>
          <input
            id="max_per_day"
            name="max_per_day"
            type="number"
            min="1"
            placeholder="none"
            value={maxPerDay}
            onChange={(e) => setMaxPerDay(e.target.value)}
            className="block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-stone-500">Optional.</p>
        </div>
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-stone-700 mb-2">
          Time slots (repeats each day)
        </legend>
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-3 sm:p-4 space-y-2">
          {slots.map((s, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_5rem_2rem] gap-2 items-center"
            >
              <input
                type="time"
                name="slot_start"
                required
                value={s.start}
                onChange={(e) => updateSlot(i, { start: e.target.value })}
                aria-label={`Slot ${i + 1} start`}
                className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="time"
                name="slot_end"
                required
                value={s.end}
                onChange={(e) => updateSlot(i, { end: e.target.value })}
                aria-label={`Slot ${i + 1} end`}
                className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="number"
                name="slot_max"
                min="1"
                required
                value={s.max}
                onChange={(e) => updateSlot(i, { max: e.target.value })}
                aria-label={`Slot ${i + 1} max appointments`}
                className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
              />
              <button
                type="button"
                onClick={() => removeSlot(i)}
                disabled={slots.length === 1}
                aria-label={`Remove slot ${i + 1}`}
                className="text-stone-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed text-xl leading-none"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSlot}
            className="text-sm text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
          >
            + Add another slot
          </button>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Max is how many pets can be booked into that slot. Durations are
          just for context — they don't drive scheduling.
        </p>
      </fieldset>

      <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
        <p className="text-sm text-stone-700">
          <span className="font-medium">Preview:</span>{" "}
          {preview.dates > 0 ? (
            <>
              <span className="font-semibold text-stone-900">{preview.dates}</span>{" "}
              dates ×{" "}
              <span className="font-semibold text-stone-900">{slots.length}</span>{" "}
              slots ={" "}
              <span className="font-semibold text-stone-900">{preview.slots}</span>{" "}
              total.
            </>
          ) : (
            <span className="text-stone-500">
              Pick days, a start date, and at least one week.
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-stone-500">
          Any dates or slots that already exist will be skipped, not
          overwritten.
        </p>
      </div>

      {state.message ? (
        <p
          role="alert"
          className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          {state.message}
        </p>
      ) : null}

      {state.ok && state.datesCreated !== undefined ? (
        <div
          role="status"
          className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 space-y-1"
        >
          <p className="font-medium">Generated.</p>
          <p>
            {state.datesCreated} new date{state.datesCreated === 1 ? "" : "s"}
            {state.datesExisting ? `, ${state.datesExisting} already existed,` : ","}{" "}
            {state.slotsCreated} slot{state.slotsCreated === 1 ? "" : "s"} added
            {state.slotsSkipped
              ? `, ${state.slotsSkipped} skipped (already existed).`
              : "."}
          </p>
          <button
            type="button"
            onClick={() => router.push(`/admin/locations/${locationId}/dates`)}
            className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
          >
            View schedule →
          </button>
        </div>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={pending || preview.dates === 0}
          className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {pending ? "Generating…" : `Generate ${preview.slots || 0} slots`}
        </button>
      </div>
    </form>
  );
}
