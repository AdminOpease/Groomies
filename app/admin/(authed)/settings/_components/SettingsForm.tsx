"use client";

import { useActionState } from "react";
import { updateBusinessSettings, type SettingsState } from "../actions";

type Settings = {
  business_name: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  about_blurb: string | null;
  primary_brand_color: string | null;
  default_service_area_copy: string | null;
  owner_notification_email: string | null;
  technical_billing_alert_email: string | null;
  payments_enabled: boolean;
  deposit_mode: "off" | "deposit" | "full";
  deposit_percent: number;
  retention_months: number;
  refund_cutoff_hours: number;
  hold_duration_minutes: number;
  show_slot_counts: boolean;
  bookings_enabled: boolean;
};

const initial: SettingsState = { ok: true };

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(
    updateBusinessSettings,
    initial
  );

  return (
    <form action={formAction} className="space-y-8 max-w-2xl">
      <Section
        title="Business identity"
        description="Shown throughout the public site and in emails."
      >
        <Field label="Business name" htmlFor="business_name" required>
          <input
            id="business_name"
            name="business_name"
            type="text"
            required
            defaultValue={settings.business_name}
            className={input}
          />
        </Field>
        <Field
          label="Logo URL"
          htmlFor="logo_url"
          hint="Optional. Full URL (https://…) or a relative path (e.g. /Groomies Logo.jpg for a file in /public)."
        >
          <input
            id="logo_url"
            name="logo_url"
            type="text"
            defaultValue={settings.logo_url ?? ""}
            className={input}
          />
        </Field>
        <Field label="Brand colour (hex)" htmlFor="primary_brand_color" hint="Optional. e.g. #059669">
          <input
            id="primary_brand_color"
            name="primary_brand_color"
            type="text"
            defaultValue={settings.primary_brand_color ?? ""}
            className={input}
          />
        </Field>
      </Section>

      <Section
        title="Public contact"
        description="Shown in the footer, contact page, and email signatures."
      >
        <Field label="Contact email" htmlFor="contact_email">
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={settings.contact_email ?? ""}
            className={input}
          />
        </Field>
        <Field label="Contact phone" htmlFor="contact_phone">
          <input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            defaultValue={settings.contact_phone ?? ""}
            className={input}
          />
        </Field>
        <Field label="About blurb" htmlFor="about_blurb" hint="Optional. Shown on the About page.">
          <textarea
            id="about_blurb"
            name="about_blurb"
            rows={4}
            defaultValue={settings.about_blurb ?? ""}
            className={input}
          />
        </Field>
        <Field
          label="Service-area copy"
          htmlFor="default_service_area_copy"
          hint="Optional. Shown on area-type location pages."
        >
          <input
            id="default_service_area_copy"
            name="default_service_area_copy"
            type="text"
            defaultValue={settings.default_service_area_copy ?? ""}
            className={input}
          />
        </Field>
      </Section>

      <Section
        title="Internal notifications"
        description="Never shown publicly. Used for new-booking alerts and technical warnings."
      >
        <Field
          label="Owner notification email"
          htmlFor="owner_notification_email"
          hint="Where 'new booking' alerts land. Falls back to Contact email if blank."
        >
          <input
            id="owner_notification_email"
            name="owner_notification_email"
            type="email"
            defaultValue={settings.owner_notification_email ?? ""}
            className={input}
          />
        </Field>
        <Field
          label="Technical / billing alert email"
          htmlFor="technical_billing_alert_email"
          hint="Where usage-limit warnings land. Point at your developer during handover."
        >
          <input
            id="technical_billing_alert_email"
            name="technical_billing_alert_email"
            type="email"
            defaultValue={settings.technical_billing_alert_email ?? ""}
            className={input}
          />
        </Field>
      </Section>

      <Section
        title="Booking policies"
        description="Applied to every new booking. Existing bookings aren't affected."
      >
        <label className="flex items-start gap-3 select-none cursor-pointer">
          <input
            type="checkbox"
            name="bookings_enabled"
            defaultChecked={settings.bookings_enabled}
            className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            <span className="block text-sm font-medium text-stone-900">
              Accept online bookings
            </span>
            <span className="block text-sm text-stone-500">
              Turn off to close the public booking flow — visitors see an
              invitation to email you instead, and the booking pages stop
              accepting submissions. You can still add bookings yourself from
              the admin, so phone bookings keep working. Separate from
              payments: this controls whether people can book at all.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 select-none cursor-pointer">
          <input
            type="checkbox"
            name="show_slot_counts"
            defaultChecked={settings.show_slot_counts}
            className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            <span className="block text-sm font-medium text-stone-900">
              Show customers how many slots are left
            </span>
            <span className="block text-sm text-stone-500">
              When off, the public site shows dates and times but not the
              remaining count. "Fully booked" tags still appear once
              nothing's available.
            </span>
          </span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Hold duration (minutes)"
            htmlFor="hold_duration_minutes"
            hint="How long a pending booking holds a slot before it expires."
          >
            <input
              id="hold_duration_minutes"
              name="hold_duration_minutes"
              type="number"
              min="5"
              max="60"
              defaultValue={settings.hold_duration_minutes}
              className={input}
            />
          </Field>
          <Field
            label="Refund cutoff (hours)"
            htmlFor="refund_cutoff_hours"
            hint="Refundable if cancelled MORE than this many hours before."
          >
            <input
              id="refund_cutoff_hours"
              name="refund_cutoff_hours"
              type="number"
              min="0"
              max="168"
              defaultValue={settings.refund_cutoff_hours}
              className={input}
            />
          </Field>
          <Field
            label="Retention (months)"
            htmlFor="retention_months"
            hint="Bookings are anonymised after this many months (GDPR)."
          >
            <input
              id="retention_months"
              name="retention_months"
              type="number"
              min="1"
              max="60"
              defaultValue={settings.retention_months}
              className={input}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Payments"
        description="When on, customers pay a deposit or full price at booking. When off, bookings confirm immediately with no charge."
      >
        <label className="flex items-start gap-3 select-none cursor-pointer">
          <input
            type="checkbox"
            name="payments_enabled"
            defaultChecked={settings.payments_enabled}
            className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            <span className="block text-sm font-medium text-stone-900">
              Take payment at booking
            </span>
            <span className="block text-sm text-stone-500">
              Requires Stripe keys added to Cloudflare env vars. Until wired,
              this just toggles the state machine.
            </span>
          </span>
        </label>
        <Field label="Deposit mode" htmlFor="deposit_mode">
          <select
            id="deposit_mode"
            name="deposit_mode"
            defaultValue={settings.deposit_mode}
            className={input}
          >
            <option value="off">Off — no payment collected</option>
            <option value="deposit">Deposit — a percentage of the total</option>
            <option value="full">Full price up-front</option>
          </select>
        </Field>
        <Field
          label="Deposit percentage"
          htmlFor="deposit_percent"
          hint="Percent of the booking total (service + any extras) taken as a deposit. Only used when deposit mode is “Deposit”."
        >
          <input
            id="deposit_percent"
            name="deposit_percent"
            type="number"
            min="0"
            max="100"
            defaultValue={settings.deposit_percent}
            className={input}
          />
        </Field>
        <p className="text-sm text-stone-500">
          Deposits are calculated and shown as soon as you set them here.
          Money is only actually collected once payments are switched on and
          Stripe is connected.
        </p>
      </Section>

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

      <div className="flex items-center">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium px-5 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

const input =
  "block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
      {description ? (
        <p className="mt-1 text-xs text-stone-500">{description}</p>
      ) : null}
      <div className="mt-4 space-y-4">{children}</div>
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
