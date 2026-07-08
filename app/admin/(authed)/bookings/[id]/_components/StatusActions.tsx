"use client";

import { useState, useTransition } from "react";
import {
  adminCancelBooking,
  markBookingCompleted,
  markBookingNoShow,
  type AdminBookingState,
} from "../actions";

type Action = "complete" | "no_show" | "cancel";

const CONFIG: Record<Action, { label: string; color: string; run: (id: string) => Promise<AdminBookingState> }> = {
  complete: {
    label: "Mark completed",
    color: "border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700",
    run: markBookingCompleted,
  },
  no_show: {
    label: "Mark no-show",
    color: "border-amber-300 bg-white hover:bg-amber-50 text-amber-800",
    run: markBookingNoShow,
  },
  cancel: {
    label: "Cancel booking",
    color: "border-red-300 bg-white hover:bg-red-50 text-red-700",
    run: adminCancelBooking,
  },
};

export function StatusActions({
  bookingId,
  currentStatus,
}: {
  bookingId: string;
  currentStatus: string;
}) {
  const isFinal =
    currentStatus === "cancelled" ||
    currentStatus === "expired" ||
    currentStatus === "completed" ||
    currentStatus === "no_show";

  const [confirming, setConfirming] = useState<Action | null>(null);
  const [state, setState] = useState<AdminBookingState | null>(null);
  const [pending, startTransition] = useTransition();

  if (isFinal) return null;

  const onConfirm = (action: Action) => {
    startTransition(async () => {
      const r = await CONFIG[action].run(bookingId);
      setState(r);
      setConfirming(null);
    });
  };

  return (
    <div className="mt-6 rounded-2xl bg-white border border-stone-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-stone-900">
        Update this booking
      </h2>
      <p className="mt-1 text-xs text-stone-500">
        Cancelling frees the slot back to available. Completing and no-show
        keep the slot marked as used.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(CONFIG) as Action[]).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setConfirming(a)}
            disabled={pending}
            className={`inline-flex items-center rounded-lg border ${CONFIG[a].color} text-sm font-medium px-3 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`}
          >
            {CONFIG[a].label}
          </button>
        ))}
      </div>

      {confirming ? (
        <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-stone-800">
            Confirm: <strong>{CONFIG[confirming].label}</strong>?
          </span>
          <button
            type="button"
            onClick={() => onConfirm(confirming)}
            disabled={pending}
            className="inline-flex items-center rounded bg-stone-900 hover:bg-stone-800 disabled:bg-stone-500 text-white text-xs font-medium px-3 py-1"
          >
            {pending ? "…" : "Yes"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(null)}
            className="text-xs text-stone-600 hover:text-stone-900"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {state?.message ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
