"use client";

import { useActionState } from "react";
import { updateDate, type ActionState } from "../../actions";

const initialState: ActionState = { ok: true };

export function EditMaxPerDay({
  locationId,
  dateId,
  current,
}: {
  locationId: string;
  dateId: string;
  current: number | null;
}) {
  const bound = updateDate.bind(null, locationId, dateId);
  const [state, formAction, pending] = useActionState(bound, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
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
          inputMode="numeric"
          placeholder="none"
          defaultValue={current ?? ""}
          className="block w-40 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center rounded-lg bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
      >
        {pending ? "Saving…" : "Save cap"}
      </button>
      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={
            "text-xs " +
            (state.ok ? "text-emerald-700" : "text-red-700")
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
