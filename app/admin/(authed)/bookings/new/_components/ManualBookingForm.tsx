"use client";

import { useActionState } from "react";
import { createManualBooking, type ManualBookingState } from "../actions";

type Service = { id: string; name: string; price_cents: number };

const initial: ManualBookingState = { ok: true };

export function ManualBookingForm({
  slotId,
  services,
  requiresAddress,
}: {
  slotId: string;
  services: Service[];
  requiresAddress: boolean;
}) {
  const bound = createManualBooking.bind(null, slotId);
  const [state, formAction, pending] = useActionState(bound, initial);

  return (
    <form action={formAction} className="space-y-6">
      {services.length > 0 ? (
        <Field label="Service" htmlFor="service_id">
          <select id="service_id" name="service_id" defaultValue="" className={input}>
            <option value="">— pick later</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — £{(s.price_cents / 100).toFixed(2)}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Customer name" htmlFor="customer_name" required>
          <input id="customer_name" name="customer_name" type="text" required className={input} />
        </Field>
        <Field label="Phone" htmlFor="customer_phone" required>
          <input id="customer_phone" name="customer_phone" type="tel" required className={input} />
        </Field>
      </div>
      <Field label="Email" htmlFor="customer_email" required hint="Their confirmation email will go here.">
        <input id="customer_email" name="customer_email" type="email" required className={input} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Pet name" htmlFor="pet_name" required>
          <input id="pet_name" name="pet_name" type="text" required className={input} />
        </Field>
        <Field label="Species" htmlFor="pet_species">
          <select id="pet_species" name="pet_species" defaultValue="" className={input}>
            <option value="">—</option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
            <option value="other">Other</option>
          </select>
        </Field>
      </div>
      <Field label="Breed" htmlFor="pet_breed">
        <input id="pet_breed" name="pet_breed" type="text" className={input} />
      </Field>

      {requiresAddress ? (
        <Field
          label="Customer address"
          htmlFor="service_address"
          hint="Where the van should go. You can edit this later if you take the address on a separate call."
        >
          <textarea id="service_address" name="service_address" rows={2} className={input} />
        </Field>
      ) : null}

      <Field label="Notes" htmlFor="notes" hint="Optional — temperament, coat, allergies.">
        <textarea id="notes" name="notes" rows={3} className={input} />
      </Field>

      {state.message ? (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium px-5 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {pending ? "Adding booking…" : "Add booking"}
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
