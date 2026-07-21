/**
 * Shown wherever booking would normally be offered, while
 * business_settings.bookings_enabled is false.
 *
 * The job here is not to apologise — it is to keep the visitor in the pipeline.
 * Someone who reached a booking page is a warm lead; a bare "unavailable" wastes
 * them. So this asks for the enquiry instead, and gives a reason to send it now
 * (first pick of dates) rather than "check back later", which nobody does.
 */

type Props = {
  contactEmail: string | null;
  contactPhone: string | null;
  /** Pre-fills the subject so enquiries are recognisable in the inbox. */
  subject?: string;
};

export function BookingsClosed({
  contactEmail,
  contactPhone,
  subject = "Booking enquiry",
}: Props) {
  const mailto = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`
    : null;

  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-7 sm:p-10">
      <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-[0.18em]">
        Bookings open soon
      </p>

      <h2
        className="mt-3 text-2xl sm:text-3xl text-stone-900"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        We're not quite taking online bookings yet
      </h2>

      <p className="mt-4 text-stone-700 leading-relaxed">
        We're putting the final touches to the van and the schedule. In the
        meantime we're taking enquiries by email — tell us your dog's name and
        breed, roughly where you are, and what sort of groom you're after, and
        we'll come back to you personally.
      </p>

      <p className="mt-3 text-stone-700 leading-relaxed">
        Get in touch now and you'll be first in line when dates open.
      </p>

      {mailto ? (
        <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
          <a
            href={mailto}
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-6 py-3 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Email {contactEmail}
          </a>

          {contactPhone ? (
            <a
              href={`tel:${contactPhone.replace(/\s+/g, "")}`}
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white hover:border-emerald-400 text-stone-800 text-sm font-medium px-6 py-3 transition-colors"
            >
              Or call {contactPhone}
            </a>
          ) : null}
        </div>
      ) : (
        // contact_email unset in business settings — say so plainly rather than
        // rendering a dead button.
        <p className="mt-7 text-sm text-stone-500">
          Contact details will appear here once they're set in the business
          settings.
        </p>
      )}
    </div>
  );
}
