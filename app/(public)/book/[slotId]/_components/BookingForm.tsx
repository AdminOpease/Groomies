"use client";

import { useActionState, useState } from "react";
import { submitBooking, type BookingResult } from "../actions";

type Variant = {
  id: string;
  label: string;
  price_cents: number;
  price_from: boolean;
  sort_order: number;
};

type Service = {
  id: string;
  name: string;
  price_cents: number;
  price_from: boolean;
  duration_minutes: number;
  service_variants: Variant[] | null;
};

const money = (cents: number) =>
  `£${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

const sizesOf = (s: Service | undefined): Variant[] =>
  [...(s?.service_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order);

/** What to show next to a service name in the dropdown. */
function servicePriceLabel(s: Service): string {
  const sizes = sizesOf(s);
  if (sizes.length === 0) {
    return `${s.price_from ? "from " : ""}${money(s.price_cents)}`;
  }
  const lowest = Math.min(...sizes.map((v) => v.price_cents));
  return `from ${money(lowest)}`;
}

export function BookingForm({
  slotId,
  services,
  requiresAddress,
  areaHint,
}: {
  slotId: string;
  services: Service[];
  requiresAddress: boolean;
  areaHint: string | null;
}) {
  const bound = submitBooking.bind(null, slotId);
  const [state, formAction, pending] = useActionState<
    BookingResult | null,
    FormData
  >(bound, null);

  // Preserve user-typed values across error re-renders. Empty on the initial
  // render and after successful submissions (which redirect anyway).
  const v = state && !state.ok ? state.values : undefined;

  // Which service is picked drives whether we ask for a dog size. Controlled
  // so the size selector can react; survives error re-renders because the
  // component never unmounts.
  const [serviceId, setServiceId] = useState<string>(v?.service_id ?? "");
  const selected = services.find((s) => s.id === serviceId);
  const sizes = sizesOf(selected);

  return (
    <form action={formAction} className="space-y-8">
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        <label htmlFor="hp_field">Leave this empty</label>
        <input
          id="hp_field"
          type="text"
          name="hp_field"
          tabIndex={-1}
          autoComplete="new-password"
        />
      </div>

      {/* Service */}
      {services.length > 0 ? (
        <Section title="Service">
          <label htmlFor="service_id" className="sr-only">Service</label>
          <select
            id="service_id"
            name="service_id"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">Not sure yet — decide on arrival</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {servicePriceLabel(s)}
              </option>
            ))}
          </select>

          {/* Size tiers: only for services priced by dog size. Keyed on the
              service so switching packages clears a stale size. */}
          {sizes.length > 0 ? (
            <div className="mt-4" key={serviceId}>
              <label
                htmlFor="service_variant_id"
                className="block text-sm font-medium text-stone-700 mb-1"
              >
                Your dog's size<span className="text-emerald-700"> *</span>
              </label>
              <select
                id="service_variant_id"
                name="service_variant_id"
                required
                defaultValue={v?.service_variant_id ?? ""}
                className="block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Choose a size…</option>
                {sizes.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.label} — {size.price_from ? "from " : ""}
                    {money(size.price_cents)}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-stone-500">
                {sizes.some((s) => s.price_from)
                  ? "Starting price for that size — the final price depends on coat condition, temperament, breed and time required. We'll always confirm before starting."
                  : "Prices are per groom for that size."}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-stone-500">
              You can leave this unset — we'll confirm with you when we arrive.
            </p>
          )}
        </Section>
      ) : null}

      {/* Pet */}
      <Section title="Your pet">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Pet name" htmlFor="pet_name" required>
            <input
              id="pet_name"
              name="pet_name"
              type="text"
              required
              autoComplete="off"
              defaultValue={v?.pet_name ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Species" htmlFor="pet_species">
            <select
              id="pet_species"
              name="pet_species"
              defaultValue={v?.pet_species ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>
        <Field label="Breed" htmlFor="pet_breed" hint="Optional — helps us plan the right blades and shampoo.">
          <input
            id="pet_breed"
            name="pet_breed"
            type="text"
            autoComplete="off"
            defaultValue={v?.pet_breed ?? ""}
            className={inputClass}
          />
        </Field>
      </Section>

      {/* Customer */}
      <Section title="Your details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Your name" htmlFor="customer_name" required>
            <input
              id="customer_name"
              name="customer_name"
              type="text"
              required
              autoComplete="name"
              defaultValue={v?.customer_name ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Phone" htmlFor="customer_phone" required>
            <input
              id="customer_phone"
              name="customer_phone"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel"
              placeholder="07…"
              defaultValue={v?.customer_phone ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Email" htmlFor="customer_email" required hint="We'll send your confirmation + manage link here.">
          <input
            id="customer_email"
            name="customer_email"
            type="email"
            inputMode="email"
            required
            autoComplete="email"
            defaultValue={v?.customer_email ?? ""}
            className={inputClass}
          />
        </Field>

        {requiresAddress ? (
          <Field
            label="Where should we come?"
            htmlFor="service_address"
            required
            hint={
              areaHint
                ? `${areaHint} — please enter your full address so we can find you.`
                : "Enter the full address you'd like us to visit."
            }
          >
            <textarea
              id="service_address"
              name="service_address"
              rows={2}
              required
              autoComplete="street-address"
              defaultValue={v?.service_address ?? ""}
              className={inputClass}
            />
          </Field>
        ) : null}
      </Section>

      {/* Notes */}
      <Section title="Anything else?">
        <Field label="Notes for the groomer" htmlFor="notes" hint="Optional — temperament, allergies, coat preferences.">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={v?.notes ?? ""}
            className={inputClass}
          />
        </Field>
      </Section>

      {/* Consent */}
      <label className="flex items-start gap-3 select-none cursor-pointer bg-white rounded-2xl border border-stone-200 p-4">
        <input
          type="checkbox"
          name="consent"
          required
          defaultChecked={v?.consent ?? false}
          className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span className="text-sm text-stone-700">
          I've read the{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-emerald-800" target="_blank" rel="noopener">
            privacy policy
          </a>{" "}
          and agree to my details being used to run this booking. Required.
        </span>
      </label>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold px-6 py-3 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {pending ? "Booking…" : "Confirm booking"}
      </button>
    </form>
  );
}

const inputClass =
  "block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-stone-900 mb-3">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

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
      <label htmlFor={htmlFor} className="block text-sm font-medium text-stone-700 mb-1">
        {label}
        {required ? <span className="text-emerald-700"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}
