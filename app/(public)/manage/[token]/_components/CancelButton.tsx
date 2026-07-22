"use client";

import { useState, useTransition } from "react";
import { cancelBooking, type CancelResult } from "../actions";

/**
 * ⚠️ Refunds are processed BY HAND. Nothing in this codebase issues one.
 *
 * The Stripe checkout route and webhook are both stubs returning 501, and
 * while `bookings.payment_status` can hold 'refunded', no code path ever sets
 * it. Any copy here that promises an automatic refund is a false promise to a
 * paying customer — the kind that produces chargebacks.
 *
 * If automatic refunds are ever implemented, update the wording here in the
 * same change. Until then this must describe a manual process, because that
 * is what actually happens: the owner refunds from the Stripe dashboard.
 */
export function CancelButton({
  token,
  refundCutoffHours,
  eligibleForRefund,
  paymentTaken,
  contactEmail,
}: {
  token: string;
  refundCutoffHours: number;
  eligibleForRefund: boolean;
  paymentTaken: boolean;
  contactEmail: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<CancelResult | null>(null);
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const r = await cancelBooking(token, state);
      setState(r);
      setConfirming(false);
    });
  };

  if (state?.ok) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-700"
      >
        <p className="font-medium text-stone-900">Booking cancelled.</p>
        {paymentTaken ? (
          <p className="mt-2">
            {state.refundEligible ? (
              <>
                You cancelled in good time, so your deposit is refundable. We
                process refunds by hand back to the card you paid with, usually
                within one working day — allow a few more for it to appear on
                your statement.{" "}
                {contactEmail ? (
                  <>
                    If it hasn't arrived within a week, email{" "}
                    <a
                      href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                        "Refund query"
                      )}`}
                      className="text-emerald-700 underline underline-offset-2"
                    >
                      {contactEmail}
                    </a>{" "}
                    and we'll chase it.
                  </>
                ) : null}
              </>
            ) : (
              <>
                You cancelled within {refundCutoffHours} hours of the
                appointment, so the deposit isn't refundable.{" "}
                {contactEmail ? (
                  <>
                    If there were circumstances we should know about, email{" "}
                    <a
                      href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                        "Cancelled booking"
                      )}`}
                      className="text-emerald-700 underline underline-offset-2"
                    >
                      {contactEmail}
                    </a>{" "}
                    — we'd rather hear from you than not.
                  </>
                ) : (
                  "If there were circumstances we should know about, please get in touch."
                )}
              </>
            )}
          </p>
        ) : null}
      </div>
    );
  }

  if (!confirming) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900">
          Need to cancel?
        </h2>
        {paymentTaken ? (
          <p className="mt-2 text-sm text-stone-600">
            Deposits are refundable if you cancel <strong>more than {refundCutoffHours}h</strong>{" "}
            before your appointment — otherwise they're non-refundable.{" "}
            {eligibleForRefund ? (
              <span className="text-emerald-700 font-medium">
                You're inside the refundable window.
              </span>
            ) : (
              <span className="text-amber-700 font-medium">
                You're inside the non-refundable window.
              </span>
            )}
          </p>
        ) : (
          <p className="mt-2 text-sm text-stone-600">
            No payment has been taken. Cancelling frees your slot immediately.
          </p>
        )}
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-4 inline-flex items-center rounded-full border border-red-300 bg-white hover:bg-red-50 text-red-700 text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        >
          Cancel this booking
        </button>
        {state?.message ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {state.message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <p className="text-sm text-stone-900 font-medium">
        Are you sure? This can't be undone from this page.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="inline-flex items-center rounded-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium px-4 py-2"
        >
          {pending ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-sm text-stone-600 hover:text-stone-900"
        >
          Keep booking
        </button>
      </div>
    </div>
  );
}
