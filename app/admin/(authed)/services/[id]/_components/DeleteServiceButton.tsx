"use client";

import { useState, useTransition } from "react";
import { deleteService, type ServiceState } from "../../actions";

export function DeleteServiceButton({
  id,
  serviceName,
}: {
  id: string;
  serviceName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<ServiceState | null>(null);
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const r = await deleteService(id, { ok: true }, new FormData());
      setState(r);
    });
  };

  return (
    <div className="mt-10 pt-6 border-t border-stone-200">
      <h2 className="text-sm font-semibold text-stone-900">Danger zone</h2>
      <p className="mt-1 text-sm text-stone-500">
        Deleting removes the service permanently. Bookings that referenced it
        stay intact but lose the service link.
      </p>
      {state?.message ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-700 text-sm font-medium px-4 py-2"
          >
            Delete service
          </button>
        ) : (
          <>
            <span className="text-sm text-stone-700">
              Really delete <strong>{serviceName}</strong>?
            </span>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="inline-flex items-center rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium px-4 py-2"
            >
              {pending ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setState(null);
              }}
              className="text-sm text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
