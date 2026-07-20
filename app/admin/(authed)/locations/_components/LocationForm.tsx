"use client";

import { useActionState } from "react";
import type { LocationFormState } from "../actions";

type LocationRow = {
  id?: string;
  name: string;
  type: "stop" | "area";
  address: string | null;
  description: string | null;
  postcode_areas?: string[] | null;
  is_active: boolean;
};

const initialState: LocationFormState = { ok: true };

export function LocationForm({
  location,
  action,
  submitLabel,
}: {
  location?: LocationRow;
  action: (
    prev: LocationFormState,
    formData: FormData
  ) => Promise<LocationFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      <Field label="Name" htmlFor="name" hint="Shown to customers.">
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={location?.name ?? ""}
          className="block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-stone-700">
          Type
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <TypeChoice
            value="area"
            label="Service area"
            description="Van comes to the customer — they enter their own address at booking."
            defaultChecked={(location?.type ?? "area") === "area"}
          />
          <TypeChoice
            value="stop"
            label="Fixed stop"
            description="Customers come to a specific address you enter below."
            defaultChecked={location?.type === "stop"}
          />
        </div>
      </fieldset>

      <Field
        label="Address"
        htmlFor="address"
        hint="For a stop, the exact address customers show up to. For an area, a descriptive summary like 'NW London'."
      >
        <input
          id="address"
          name="address"
          type="text"
          defaultValue={location?.address ?? ""}
          className="block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </Field>

      <Field
        label="Postcode areas covered"
        htmlFor="postcode_areas"
        hint="Letters only, comma separated — e.g. “LU” or “LU, MK”. Customers booking this location must have a postcode in one of these areas. Leave empty for no restriction."
      >
        <input
          id="postcode_areas"
          name="postcode_areas"
          type="text"
          placeholder="LU"
          defaultValue={(location?.postcode_areas ?? []).join(", ")}
          className="block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-stone-500">
          Use the area letters, not the district. “LU” covers all of LU1–LU7
          (Luton, Dunstable, Houghton Regis, Leighton Buzzard). Entries with
          numbers are ignored.
        </p>
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        hint="Optional — extra context for customers (parking, prep notes, etc.)."
      >
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={location?.description ?? ""}
          className="block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </Field>

      <label className="flex items-start gap-3 select-none cursor-pointer">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={location?.is_active ?? true}
          className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span>
          <span className="block text-sm font-medium text-stone-900">
            Visible to customers
          </span>
          <span className="block text-sm text-stone-500">
            When off, the location is hidden from the public site but existing
            bookings are unaffected.
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

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium px-4 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-stone-700 mb-1"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

function TypeChoice({
  value,
  label,
  description,
  defaultChecked,
}: {
  value: "stop" | "area";
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label
      className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 cursor-pointer hover:bg-stone-50 has-checked:border-emerald-500 has-checked:bg-emerald-50/40 has-checked:ring-1 has-checked:ring-emerald-500"
    >
      <input
        type="radio"
        name="type"
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 border-stone-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span>
        <span className="block text-sm font-medium text-stone-900">{label}</span>
        <span className="block text-xs text-stone-500">{description}</span>
      </span>
    </label>
  );
}
