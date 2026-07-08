"use client";

import { useActionState, useState, useTransition } from "react";
import { updateSlot, deleteSlot, type ActionState } from "../../actions";

const initialState: ActionState = { ok: true };

export function SlotRow({
  locationId,
  dateId,
  slot,
  booked,
}: {
  locationId: string;
  dateId: string;
  slot: {
    id: string;
    start_time: string;
    end_time: string;
    max_appointments: number;
  };
  booked: number;
}) {
  const boundUpdate = updateSlot.bind(null, locationId, dateId, slot.id);
  const [state, formAction, pending] = useActionState(boundUpdate, initialState);

  const [confirming, setConfirming] = useState(false);
  const [deleteState, setDeleteState] = useState<ActionState | null>(null);
  const [deleting, startDelete] = useTransition();

  const onDelete = () => {
    startDelete(async () => {
      const r = await deleteSlot(locationId, dateId, slot.id, initialState, new FormData());
      setDeleteState(r);
    });
  };

  return (
    <li className="px-4 sm:px-5 py-3 border-b border-stone-100 last:border-b-0">
      <form
        action={formAction}
        className="grid grid-cols-2 sm:grid-cols-[8rem_8rem_6rem_1fr_auto] gap-2 items-end"
      >
        <div>
          <label className="block text-xs text-stone-500 mb-1">Start</label>
          <input
            type="time"
            name="start_time"
            defaultValue={slot.start_time.slice(0, 5)}
            required
            className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">End</label>
          <input
            type="time"
            name="end_time"
            defaultValue={slot.end_time.slice(0, 5)}
            required
            className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Max</label>
          <input
            type="number"
            name="max_appointments"
            min="1"
            defaultValue={slot.max_appointments}
            required
            className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
          />
        </div>
        <div className="col-span-2 sm:col-span-1 text-sm text-stone-500 tabular-nums self-center pl-1">
          {booked}/{slot.max_appointments} booked
        </div>
        <div className="col-span-2 sm:col-span-1 flex items-center gap-2 justify-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium px-3 py-1.5"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="inline-flex items-center rounded bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-medium px-2 py-1"
              >
                {deleting ? "…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setDeleteState(null);
                }}
                className="text-xs text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </form>
      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={
            "mt-2 text-xs " +
            (state.ok ? "text-emerald-700" : "text-red-700")
          }
        >
          {state.message}
        </p>
      ) : null}
      {deleteState?.message ? (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {deleteState.message}
        </p>
      ) : null}
    </li>
  );
}
