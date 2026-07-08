"use client";

import { useState, useTransition } from "react";
import { deleteDate, type ActionState } from "../actions";

export function DeleteDateButton({
  locationId,
  dateId,
  formattedDate,
}: {
  locationId: string;
  dateId: string;
  formattedDate: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const result = await deleteDate(
        locationId,
        dateId,
        { ok: true },
        new FormData()
      );
      // If successful, server action redirects — this only shows on failure.
      setState(result);
    });
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-red-600 hover:text-red-800 underline underline-offset-2"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-600">Delete {formattedDate}?</span>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="inline-flex items-center rounded bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-medium px-2.5 py-1 transition-colors"
        >
          {pending ? "…" : "Yes"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setState(null);
          }}
          className="text-xs text-stone-600 hover:text-stone-900"
        >
          Cancel
        </button>
      </div>
      {state?.message ? (
        <p role="alert" className="text-xs text-red-700 max-w-[16rem] text-right">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
