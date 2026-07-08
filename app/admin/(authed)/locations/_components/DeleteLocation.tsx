"use client";

import { useState, useTransition } from "react";
import type { LocationFormState } from "../actions";

export function DeleteLocation({
  locationName,
  isActive,
  deleteAction,
  deactivateAction,
}: {
  locationName: string;
  isActive: boolean;
  deleteAction: (
    prev: LocationFormState,
    formData: FormData
  ) => Promise<LocationFormState>;
  deactivateAction: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<LocationFormState | null>(null);
  const [pending, startTransition] = useTransition();
  const [deactivating, startDeactivate] = useTransition();

  const onConfirmDelete = () => {
    startTransition(async () => {
      const result = await deleteAction(
        { ok: true } satisfies LocationFormState,
        new FormData()
      );
      setState(result);
      // If ok, the server action already redirected — this only runs on failure.
    });
  };

  const onDeactivate = () => {
    startDeactivate(async () => {
      await deactivateAction();
      setState(null);
      setConfirming(false);
    });
  };

  const affectedBookings = state?.affectedBookings ?? 0;

  return (
    <div className="mt-10 pt-6 border-t border-stone-200">
      <h2 className="text-sm font-semibold text-stone-900">Danger zone</h2>
      <p className="mt-1 text-sm text-stone-500">
        Deleting the location removes it permanently. If there are active
        bookings, you'll be asked to deactivate instead.
      </p>

      {state?.message ? (
        <p
          role="alert"
          className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          {state.message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-700 text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            Delete location
          </button>
        ) : (
          <>
            <span className="text-sm text-stone-700">
              Really delete <strong>{locationName}</strong>?
            </span>
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={pending}
              className="inline-flex items-center rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              {pending ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setState(null);
              }}
              className="inline-flex items-center rounded-lg text-sm text-stone-600 hover:text-stone-900 px-3 py-2"
            >
              Cancel
            </button>
          </>
        )}

        {affectedBookings > 0 && isActive ? (
          <button
            type="button"
            onClick={onDeactivate}
            disabled={deactivating}
            className="inline-flex items-center rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-900 text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
          >
            {deactivating ? "Deactivating…" : "Deactivate instead"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
