"use client";

import { useActionState } from "react";
import { addSingleDate, type ActionState } from "../actions";

const initialState: ActionState = { ok: true };

export function AddSingleDate({ locationId }: { locationId: string }) {
  const boundAction = addSingleDate.bind(null, locationId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="grow min-w-[10rem]">
        <label
          htmlFor="service_date"
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Date
        </label>
        <input
          id="service_date"
          name="service_date"
          type="date"
          required
          className="block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
      <div className="grow min-w-[8rem] max-w-[10rem]">
        <label
          htmlFor="max_per_day"
          className="block text-sm font-medium text-stone-700 mb-1"
        >
          Cap / day
        </label>
        <input
          id="max_per_day"
          name="max_per_day"
          type="number"
          min="1"
          inputMode="numeric"
          placeholder="none"
          className="block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {pending ? "Adding…" : "Add date"}
      </button>
      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={
            "basis-full text-sm rounded-lg px-3 py-2 " +
            (state.ok
              ? "text-emerald-800 bg-emerald-50 border border-emerald-200"
              : "text-red-700 bg-red-50 border border-red-200")
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
