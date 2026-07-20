"use client";

import { useActionState, useState } from "react";
import { submitBooking, type BookingResult } from "../actions";
import { DOG_BREEDS } from "@/lib/dog-breeds";

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

/** ["LU"] -> "LU"; ["LU","MK"] -> "LU and MK"; ["LU","MK","AL"] -> "LU, MK and AL" */
function formatAreas(areas: string[]): string {
  if (areas.length <= 1) return areas[0] ?? "";
  return `${areas.slice(0, -1).join(", ")} and ${areas[areas.length - 1]}`;
}

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
  depositMode = "off",
  depositPercent = 0,
  paymentsEnabled = false,
  coveredAreas = [],
}: {
  slotId: string;
  services: Service[];
  requiresAddress: boolean;
  areaHint: string | null;
  depositMode?: "off" | "deposit" | "full";
  depositPercent?: number;
  paymentsEnabled?: boolean;
  coveredAreas?: string[];
}) {
  // Only mandatory where the location actually restricts by area — elsewhere
  // it's useful but shouldn't block a booking.
  const postcodeRequired = coveredAreas.length > 0;
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
  const [variantId, setVariantId] = useState<string>(
    v?.service_variant_id ?? ""
  );
  const selected = services.find((s) => s.id === serviceId);
  const sizes = sizesOf(selected);

  // Switching package invalidates any size already chosen for the old one.
  const pickService = (id: string) => {
    setServiceId(id);
    setVariantId("");
    setAddonIds((prev) => prev.filter((x) => x !== id));
  };

  // Extras: any service that isn't size-priced (a tiered price needs a size we
  // never ask for here) and isn't the main service already being booked.
  const [addonIds, setAddonIds] = useState<string[]>(
    v?.addon_service_ids ?? []
  );

  // Stays open on an error re-render if they'd already entered a second breed.
  const [isCross, setIsCross] = useState<boolean>(
    Boolean(v?.pet_breed_secondary)
  );
  const addonOptions = services.filter(
    (s) => sizesOf(s).length === 0 && s.id !== serviceId
  );
  const chosenAddons = addonOptions.filter((s) => addonIds.includes(s.id));

  const toggleAddon = (id: string) =>
    setAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Running total. For a tiered package the main line only counts once a size
  // is picked, so we don't quote a number we can't stand behind.
  const mainPrice =
    selected == null
      ? null
      : sizes.length > 0
        ? (sizes.find((z) => z.id === variantId)?.price_cents ?? null)
        : selected.price_cents;
  const addonsTotal = chosenAddons.reduce((n, s) => n + s.price_cents, 0);
  const total = (mainPrice ?? 0) + addonsTotal;
  const anyFrom =
    (selected?.price_from ?? false) ||
    sizes.some((z) => z.id === variantId && z.price_from);

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
            onChange={(e) => pickService(e.target.value)}
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
            <div className="mt-4">
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
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
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

      {/* Add-ons */}
      {addonOptions.length > 0 ? (
        <Section title="Add extras">
          <p className="text-sm text-stone-600">
            Optional — tick anything you'd like added to this visit.
          </p>
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {addonOptions.map((s) => {
              const checked = addonIds.includes(s.id);
              return (
                <li key={s.id}>
                  <label className="flex items-start gap-3 py-2 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      name="addon_service_ids"
                      value={s.id}
                      checked={checked}
                      onChange={() => toggleAddon(s.id)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="flex-1 flex items-baseline justify-between gap-3">
                      <span className="text-sm text-stone-800">{s.name}</span>
                      <span className="text-sm font-medium text-emerald-800 tabular-nums whitespace-nowrap">
                        {s.price_from ? "from " : ""}
                        {money(s.price_cents)}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {/* Running total. Deliberately omitted until every chosen line has a
              known price, so we never show a number we can't stand behind. */}
          {mainPrice !== null || chosenAddons.length > 0 ? (
            <div className="mt-5 rounded-xl border border-emerald-900/15 bg-emerald-50/60 px-4 py-3">
              <dl className="space-y-1 text-sm">
                {mainPrice !== null && selected ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-stone-600">
                      {selected.name}
                      {sizes.length > 0
                        ? ` — ${sizes.find((z) => z.id === variantId)?.label}`
                        : ""}
                    </dt>
                    <dd className="tabular-nums text-stone-800">
                      {money(mainPrice)}
                    </dd>
                  </div>
                ) : null}
                {chosenAddons.map((s) => (
                  <div key={s.id} className="flex justify-between gap-4">
                    <dt className="text-stone-600">{s.name}</dt>
                    <dd className="tabular-nums text-stone-800">
                      {money(s.price_cents)}
                    </dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-emerald-900/15 pt-2 mt-2">
                  <dt className="font-medium text-stone-900">
                    {selected && sizes.length > 0 && mainPrice === null
                      ? "Extras total"
                      : "Total"}
                  </dt>
                  <dd className="font-semibold tabular-nums text-emerald-800">
                    {anyFrom ? "from " : ""}
                    {money(total)}
                  </dd>
                </div>
              </dl>
              {/* Deposit owed. Shown as soon as the owner sets a policy; the
                  wording only promises a payment step once payments are on. */}
              {depositMode !== "off" && total > 0 ? (
                <div className="mt-2 flex justify-between gap-4 text-sm">
                  <span className="text-stone-600">
                    {depositMode === "full"
                      ? "Payable up front"
                      : `Deposit (${depositPercent}%)`}
                  </span>
                  <span className="font-medium tabular-nums text-stone-900">
                    {money(
                      depositMode === "full"
                        ? total
                        : Math.round((total * depositPercent) / 100)
                    )}
                  </span>
                </div>
              ) : null}

              {anyFrom ? (
                <p className="mt-2 text-xs text-stone-500">
                  Starting price — we'll confirm the final cost before starting.
                </p>
              ) : null}
              {depositMode !== "off" && total > 0 ? (
                <p className="mt-2 text-xs text-stone-500">
                  {paymentsEnabled
                    ? "You'll be asked to pay this to secure the appointment."
                    : "Payable on the day — nothing is charged when you book."}
                </p>
              ) : null}
            </div>
          ) : null}
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
        <Field
          label="Breed"
          htmlFor="pet_breed"
          hint="Optional — helps us plan the right blades and shampoo. Start typing to search, or type your own."
        >
          <input
            id="pet_breed"
            name="pet_breed"
            type="text"
            list="dog-breeds"
            autoComplete="off"
            placeholder="e.g. Cockapoo"
            defaultValue={v?.pet_breed ?? ""}
            className={inputClass}
          />
        </Field>

        {/* Crosses are extremely common for groomers, and the second breed is
            what actually tells us the coat — so it gets its own field rather
            than being buried in free text. */}
        {isCross ? (
          <Field
            label="Second breed"
            htmlFor="pet_breed_secondary"
            hint="The other half of the cross."
          >
            <div className="flex gap-2">
              <input
                id="pet_breed_secondary"
                name="pet_breed_secondary"
                type="text"
                list="dog-breeds"
                autoComplete="off"
                placeholder="e.g. Poodle"
                defaultValue={v?.pet_breed_secondary ?? ""}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setIsCross(false)}
                className="shrink-0 rounded-lg border border-stone-300 px-3 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Remove
              </button>
            </div>
          </Field>
        ) : (
          <button
            type="button"
            onClick={() => setIsCross(true)}
            className="text-sm text-emerald-800 hover:text-emerald-900 underline underline-offset-4"
          >
            + It's a cross of two breeds
          </button>
        )}

        {/* One shared option list for both breed inputs. */}
        <datalist id="dog-breeds">
          {DOG_BREEDS.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
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

        {/* Postcode is its own field, not buried in the address, because the
            covered-area check has to read it reliably. It's also the field the
            address lookup will fill in once that's added. */}
        <Field
          label="Postcode"
          htmlFor="postcode"
          required={postcodeRequired}
          hint={
            coveredAreas.length > 0
              ? `We're covering ${formatAreas(coveredAreas)} postcodes on this date.`
              : "So we know exactly where we're heading."
          }
        >
          <input
            id="postcode"
            name="postcode"
            type="text"
            required={postcodeRequired}
            autoComplete="postal-code"
            autoCapitalize="characters"
            placeholder="LU5 4AB"
            defaultValue={v?.postcode ?? ""}
            className={`${inputClass} uppercase`}
          />
        </Field>
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
