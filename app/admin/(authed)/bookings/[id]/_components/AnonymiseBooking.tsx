"use client";

import { useState, useTransition } from "react";
import { anonymiseBooking, type AdminBookingState } from "../actions";

export function AnonymiseBooking({
  bookingId,
  alreadyErased,
}: {
  bookingId: string;
  alreadyErased: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<AdminBookingState | null>(null);
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const r = await anonymiseBooking(bookingId);
      setState(r);
      setConfirming(false);
    });
  };

  if (alreadyErased) {
    return (
      <div className="mt-6 rounded-2xl bg-white border border-stone-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-stone-900">GDPR erasure</h2>
        <p className="mt-1 text-sm text-stone-500">
          This customer's data has already been anonymised.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl bg-white border border-stone-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-stone-900">
        Right to erasure (GDPR)
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        If the customer asks you to delete their data, use this. Name, email,
        phone, pet details, address, and notes are wiped — the booking record
        itself is kept for reporting but no longer identifies them.
      </p>

      {state?.message ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
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
            Anonymise this customer's data
          </button>
        ) : (
          <>
            <span className="text-sm text-stone-800">
              Really erase this customer's identifying data? This can't be
              undone.
            </span>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="inline-flex items-center rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium px-4 py-2"
            >
              {pending ? "Erasing…" : "Yes, erase"}
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
