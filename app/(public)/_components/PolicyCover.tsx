/**
 * Placeholder shown in place of a legal page whose text is still being
 * finalised.
 *
 * Why cover rather than delete: the pages are linked from the footer and are
 * referenced by the booking consent copy, so removing the routes would produce
 * dead links. Publishing a half-drafted policy is worse — a privacy policy or
 * refund policy is a statement customers can hold you to, and an inaccurate one
 * is a liability rather than a placeholder.
 *
 * The draft body stays in the page file, untouched, behind this. To publish,
 * delete the cover block from that page.
 */

type Props = {
  /** e.g. "Privacy policy" */
  title: string;
  /** One line on what the page will cover, so the visit isn't wasted. */
  blurb: string;
  contactEmail: string | null;
};

export function PolicyCover({ title, blurb, contactEmail }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-14 sm:py-24">
      <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-[0.18em]">
        Legal
      </p>

      <h1
        className="mt-3 text-4xl sm:text-5xl tracking-tight text-stone-900"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        {title}
      </h1>

      <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-7 sm:p-9">
        <p className="text-lg text-stone-800">
          This policy is being finalised.
        </p>

        <p className="mt-4 text-stone-600 leading-relaxed">{blurb}</p>

        <p className="mt-4 text-stone-600 leading-relaxed">
          We'd rather publish nothing than publish something inaccurate, so it's
          going up once it's properly checked.
          {contactEmail ? (
            <>
              {" "}
              If you need this information before then, email{" "}
              <a
                href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                  title
                )}`}
                className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
              >
                {contactEmail}
              </a>{" "}
              and we'll answer directly.
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
