"use client";

import { useActionState } from "react";
import { addSlot, type ActionState } from "../../actions";

const initialState: ActionState = { ok: true };

export function AddSlot({
  locationId,
  dateId,
}: {
  locationId: string;
  dateId: string;
}) {
  const bound = addSlot.bind(null, locationId, dateId);
  const [state, formAction, pending] = useActionState(bound, initialState);

  return (
    <form
      action={formAction}
      className="grid grid-cols-2 sm:grid-cols-[8rem_8rem_6rem_auto] gap-2 items-end"
    >
      <div>
        <label className="block text-xs text-stone-500 mb-1">Start</label>
        <input
          type="time"
          name="start_time"
          required
          defaultValue="10:00"
          className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-xs text-stone-500 mb-1">End</label>
        <input
          type="time"
          name="end_time"
          required
          defaultValue="11:30"
          className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-xs text-stone-500 mb-1">Max</label>
        <input
          type="number"
          name="max_appointments"
          min="1"
          required
          defaultValue="1"
          className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium px-4 py-2"
      >
        {pending ? "Adding…" : "Add slot"}
      </button>
      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={
            "col-span-full text-xs " +
            (state.ok ? "text-emerald-700" : "text-red-700")
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
