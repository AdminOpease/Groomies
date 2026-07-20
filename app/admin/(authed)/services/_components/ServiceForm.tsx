"use client";

import { useActionState } from "react";
import type { ServiceState } from "../actions";

type Service = {
  id?: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  deposit_amount_cents: number | null;
  is_active: boolean;
  price_from: boolean;
  category: string | null;
  sort_order: number;
};

const initial: ServiceState = { ok: true };

export function ServiceForm({
  service,
  action,
  submitLabel,
}: {
  service?: Service;
  action: (prev: ServiceState, formData: FormData) => Promise<ServiceState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      <Field label="Name" htmlFor="name" required>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={service?.name ?? ""}
          className={input}
        />
      </Field>
      <Field
        label="Description"
        htmlFor="description"
        hint="Shown on the Services page."
      >
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={service?.description ?? ""}
          className={input}
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field
          label="Duration"
          htmlFor="duration_minutes"
          hint="Minutes. Informational only — doesn't block scheduling."
          required
        >
          <input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            min="1"
            required
            defaultValue={service?.duration_minutes ?? 60}
            className={input}
          />
        </Field>
        <Field label="Price (pence)" htmlFor="price_pence" required hint="6500 = £65.00">
          <input
            id="price_pence"
            name="price_pence"
            type="number"
            min="1"
            required
            defaultValue={service?.price_cents ?? ""}
            className={input}
          />
        </Field>
        <Field
          label="Deposit (pence)"
          htmlFor="deposit_pence"
          hint="Optional. Only used when payments are on."
        >
          <input
            id="deposit_pence"
            name="deposit_pence"
            type="number"
            min="0"
            defaultValue={service?.deposit_amount_cents ?? ""}
            className={input}
          />
        </Field>
      </div>
      <label className="flex items-start gap-3 select-none cursor-pointer">
        <input
          type="checkbox"
          name="price_from"
          defaultChecked={service?.price_from ?? false}
          className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span>
          <span className="block text-sm font-medium text-stone-900">
            Show price as a starting price
          </span>
          <span className="block text-sm text-stone-500">
            Displays “From £X” on the public site — use when the price depends
            on the dog’s size, coat, or condition.
          </span>
        </span>
      </label>

      <Field
        label="Price-list section"
        htmlFor="category"
        hint='Heading this appears under on the Services page, e.g. "Full Groom Packages" or "Spa & Add-On Services". Services sharing a section are grouped together.'
      >
        <input
          id="category"
          name="category"
          type="text"
          defaultValue={service?.category ?? ""}
          className={input}
        />
      </Field>

      <Field
        label="Sort order"
        htmlFor="sort_order"
        hint="Lower shows first on the Services page. IMPORTANT: under 100 = a bookable groom (appears in the booking form's service dropdown). 100 or over = an optional extra (appears as a tick-box under “Add extras” instead)."
      >
        <input
          id="sort_order"
          name="sort_order"
          type="number"
          defaultValue={service?.sort_order ?? 0}
          className={input}
        />
      </Field>
      <label className="flex items-start gap-3 select-none cursor-pointer">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={service?.is_active ?? true}
          className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span>
          <span className="block text-sm font-medium text-stone-900">
            Visible on the public site
          </span>
          <span className="block text-sm text-stone-500">
            Turn off to hide without losing the service.
          </span>
        </span>
      </label>

      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={
            state.ok
              ? "text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
              : "text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          }
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium px-5 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

const input =
  "block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-stone-700 mb-1"
      >
        {label}
        {required ? <span className="text-emerald-700"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}
