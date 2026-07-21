import type { Metadata } from "next";
import Link from "next/link";
import { getSupabasePublic } from "@/lib/supabase/public";
import { FadeIn } from "../_components/FadeIn";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About",
  description:
    "Mobile dog grooming in Dunstable and the surrounding LU postcodes. We come to your door in the areas we cover, or you meet the van at a scheduled stop. One dog at a time, no salon queue, no kennel wait.",
};

/**
 * Used when business_settings.about_blurb is unset. The owner can override the
 * opening paragraph from /admin/settings without a deploy; everything below it
 * is structural and stays put.
 */
const DEFAULT_BLURB =
  "Most dogs don't dislike being groomed. They dislike the car journey, the strange smells, the barking from the next room, and the hours in a kennel waiting their turn. Take those away and you're left with a dog who's simply having a wash. That's the whole idea behind Groomies.";

export default async function AboutPage() {
  const supabase = getSupabasePublic();
  const { data: settings } = await supabase
    .from("public_business_settings")
    .select("business_name, about_blurb, bookings_enabled, contact_email")
    .single();

  const businessName = settings?.business_name ?? "Groomies";
  const blurb = settings?.about_blurb ?? DEFAULT_BLURB;
  const bookingsEnabled = settings?.bookings_enabled ?? false;
  const contactEmail = settings?.contact_email ?? null;

  return (
    <div>
      {/* ---------------------------------------------------------------- */}
      {/* Opening statement                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-emerald-50 border-b border-emerald-900/10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
          <FadeIn>
            <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-[0.22em]">
              About {businessName}
            </p>
            {/* Must hold true for BOTH service models — door-to-door areas and
                fixed stops. Anything that promises "to your door" outright is
                false for stop customers. */}
            <h1
              className="mt-4 text-4xl sm:text-6xl leading-[1.03] tracking-tight text-stone-900"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              One van.
              <br />
              <em className="italic">One dog at a time.</em>
            </h1>
            <div className="mt-6 h-px w-12 bg-emerald-800/30" />
            <p className="mt-7 text-lg sm:text-xl leading-relaxed text-stone-700">
              {blurb}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* The case for mobile                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-20 sm:py-28">
        <FadeIn>
          <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-[0.22em]">
            Why mobile
          </p>
          <h2
            className="mt-3 text-3xl sm:text-4xl text-stone-900"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Three things a salon can't avoid
          </h2>
        </FadeIn>

        <div className="mt-12 space-y-12">
          <FadeIn delay={0.05}>
            <div className="grid sm:grid-cols-[auto_1fr] gap-5 sm:gap-8">
              <span
                className="text-4xl sm:text-5xl text-emerald-800/25 italic leading-none"
                style={{ fontFamily: "var(--font-display), serif" }}
                aria-hidden
              >
                One
              </span>
              <div>
                <h3 className="text-xl font-semibold text-stone-900">
                  The journey
                </h3>
                <p className="mt-2 text-stone-600 leading-relaxed">
                  For a lot of dogs the car is already the worst part of the
                  day, and they arrive at the groomer's stressed before anyone
                  has touched them. Depending on where you live we either park
                  outside your house, or you meet the van at a scheduled local
                  stop — minutes away, not a trip across town. Either way your
                  dog comes home the moment we're finished.
                </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <div className="grid sm:grid-cols-[auto_1fr] gap-5 sm:gap-8">
              <span
                className="text-4xl sm:text-5xl text-emerald-800/25 italic leading-none"
                style={{ fontFamily: "var(--font-display), serif" }}
                aria-hidden
              >
                Two
              </span>
              <div>
                <h3 className="text-xl font-semibold text-stone-900">
                  The waiting
                </h3>
                <p className="mt-2 text-stone-600 leading-relaxed">
                  A salon books several dogs into the same window, so most of
                  them spend the day in a crate listening to dryers and other
                  dogs. We take one dog per appointment. Yours is groomed and
                  finished, start to end, and then we leave — there is no
                  in-between where nothing is happening.
                </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <div className="grid sm:grid-cols-[auto_1fr] gap-5 sm:gap-8">
              <span
                className="text-4xl sm:text-5xl text-emerald-800/25 italic leading-none"
                style={{ fontFamily: "var(--font-display), serif" }}
                aria-hidden
              >
                Three
              </span>
              <div>
                <h3 className="text-xl font-semibold text-stone-900">
                  The audience
                </h3>
                <p className="mt-2 text-stone-600 leading-relaxed">
                  Nervous, elderly and reactive dogs often cope badly with a
                  room full of other animals. In the van it's quiet, it's one
                  dog, and we can go at whatever pace your dog needs — including
                  stopping if they've had enough.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Two service models                                                */}
      {/* ---------------------------------------------------------------- */}
      {/* locations.type drives this: 'area' = we drive to the customer and
          they give their address at booking; 'stop' = the van parks somewhere
          fixed and customers come to it. Both are real, and the site said
          nothing about the second one — so anyone booking a stop expected us
          to turn up at their house. */}
      <section className="bg-[color:var(--brand-soft)] border-y border-emerald-900/10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-20 sm:py-28">
          <FadeIn>
            <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-[0.22em]">
              How it works
            </p>
            <h2
              className="mt-3 text-3xl sm:text-4xl text-stone-900"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Two ways to see us
            </h2>
            <p className="mt-5 max-w-2xl text-stone-600 leading-relaxed">
              Which one applies depends on where you are — every date on the
              site says clearly which it is before you book.
            </p>
          </FadeIn>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <FadeIn delay={0.04}>
              <div className="h-full rounded-2xl border border-emerald-200 bg-white p-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  We come to you
                </span>
                <h3 className="mt-4 font-semibold text-stone-900">
                  In the areas we cover
                </h3>
                <p className="mt-2 text-stone-600 leading-relaxed text-[15px]">
                  The van parks outside your house and your dog is groomed a few
                  steps from your own front door. You give us your address when
                  you book, and we check the postcode is on our round that day.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.06}>
              <div className="h-full rounded-2xl border border-blue-200 bg-white p-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Meet us at a stop
                </span>
                <h3 className="mt-4 font-semibold text-stone-900">
                  At a set place and time
                </h3>
                <p className="mt-2 text-stone-600 leading-relaxed text-[15px]">
                  On some days the van is parked up somewhere local and you bring
                  your dog to us. You'll see the exact address and time slot
                  before you book, and the groom itself is identical — you just
                  wait nearby instead of indoors.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* What actually happens                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative bg-emerald-900 text-emerald-50 overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-20 sm:py-28">
          <FadeIn>
            <p className="text-[11px] font-medium text-emerald-300/80 uppercase tracking-[0.22em]">
              On the day
            </p>
            <h2
              className="mt-3 text-3xl sm:text-4xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              What a visit actually looks like
            </h2>
            <p className="mt-5 max-w-2xl text-emerald-100/80 leading-relaxed">
              No mystery, no drop-off, no "ring us at four to see if he's
              ready".
            </p>
          </FadeIn>

          <ol className="mt-12 grid gap-8 sm:grid-cols-2">
            {[
              {
                t: "We arrive and say hello",
                d: "The van parks outside. We meet your dog properly before anything starts, and talk through the coat, any mats, sore spots, lumps, and exactly what you want them to look like at the end.",
              },
              {
                t: "Bath, dry, and a proper brush-out",
                d: "Warm water, shampoo matched to the coat, and low-noise drying. The brush-out is where most of the work happens — it's what stops a coat matting again a fortnight later.",
              },
              {
                t: "The groom itself",
                d: "Clipping or scissoring to the finish you asked for, plus nails, ears and a tidy around the face, feet and sanitary areas as standard.",
              },
              {
                t: "We hand them straight back",
                d: "Your dog comes back to you clean and dry — no all-day drop-off, no picking them up hours later. We'll tell you honestly what we found and what to keep an eye on before the next visit.",
              },
            ].map((step, i) => (
              // FadeIn must sit INSIDE the <li>, not around it: it renders a
              // div, and a div between <ol> and <li> breaks list semantics for
              // screen readers.
              <li key={step.t} className="border-t border-emerald-100/15 pt-5">
                <FadeIn delay={0.04 * i}>
                  <span
                    className="text-sm italic text-emerald-300/70"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {step.t}
                  </h3>
                  <p className="mt-2 text-emerald-100/75 leading-relaxed text-[15px]">
                    {step.d}
                  </p>
                </FadeIn>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Range of work                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-20 sm:py-28">
        <FadeIn>
          <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-[0.22em]">
            The work
          </p>
          <h2
            className="mt-3 text-3xl sm:text-4xl text-stone-900"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            More than a bath and a blow-dry
          </h2>
        </FadeIn>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <FadeIn delay={0.04}>
            <div className="h-full rounded-2xl border border-stone-200 bg-white p-6">
              <h3 className="font-semibold text-stone-900">Everyday grooming</h3>
              <p className="mt-2 text-stone-600 leading-relaxed text-[15px]">
                A full groom is the works — bath, dry, brush-out, clip or
                scissor, nails and ears. If the coat is fine and you just want
                them freshened up between grooms, a Bath &amp; Freshen Up does
                exactly that for less.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.06}>
            <div className="h-full rounded-2xl border border-stone-200 bg-white p-6">
              <h3 className="font-semibold text-stone-900">Puppies</h3>
              <p className="mt-2 text-stone-600 leading-relaxed text-[15px]">
                A puppy's first groom sets the tone for every one after it. Our
                Puppy Introduction is a short, gentle session designed to get
                them used to the water, the noise and being handled — without
                trying to achieve a full haircut on day one.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div className="h-full rounded-2xl border border-stone-200 bg-white p-6">
              <h3 className="font-semibold text-stone-900">
                Specialist coat work
              </h3>
              <p className="mt-2 text-stone-600 leading-relaxed text-[15px]">
                Hand stripping for wire-coated breeds, where clipping would
                soften and dull the coat. De-matting where a coat has gone too
                far — done carefully, and we'll always tell you honestly if
                clipping off is kinder than pulling a dog through it.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="h-full rounded-2xl border border-stone-200 bg-white p-6">
              <h3 className="font-semibold text-stone-900">Spa extras</h3>
              <p className="mt-2 text-stone-600 leading-relaxed text-[15px]">
                Add what you fancy: nail trim, teeth cleaning, ear clean, paw
                balm, a blueberry facial, deep conditioning, de-shedding, or
                flea and tick treatments. Each one is priced individually, so
                you only pay for what your dog actually has.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Pricing honesty + area                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-emerald-50/60 border-y border-emerald-900/10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-20 sm:py-28 grid gap-12 sm:grid-cols-2">
          <FadeIn>
            <div>
              <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-[0.22em]">
                Pricing
              </p>
              <h2
                className="mt-3 text-2xl sm:text-3xl text-stone-900"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Priced by size, not by surprise
              </h2>
              <p className="mt-4 text-stone-600 leading-relaxed">
                A Cavalier and a Newfoundland are not the same job, so they
                aren't the same price. Every groom is priced by the size of the
                dog and you can see the whole list before you commit — no "we'll
                let you know at the end".
              </p>
              <Link
                href="/services"
                className="mt-5 inline-flex items-center text-sm font-medium text-emerald-800 hover:text-emerald-900 underline underline-offset-4"
              >
                See the full price list →
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <div>
              <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-[0.22em]">
                Where we go
              </p>
              <h2
                className="mt-3 text-2xl sm:text-3xl text-stone-900"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Dunstable and the LU postcodes
              </h2>
              <p className="mt-4 text-stone-600 leading-relaxed">
                The van works around Dunstable and the surrounding LU area. We
                keep the round tight on purpose — it's what lets us give each
                dog a proper unhurried appointment instead of racing across the
                county between jobs.
              </p>
              <p className="mt-3 text-stone-600 leading-relaxed">
                Not sure whether you're in range? Send us your postcode and
                we'll tell you straight away.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Close                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative bg-emerald-900 text-emerald-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <FadeIn>
            <h2
              className="text-3xl sm:text-4xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {bookingsEnabled
                ? "Come and meet the van."
                : "We're nearly ready for you."}
            </h2>
            <p className="mt-5 text-emerald-100/80 leading-relaxed">
              {bookingsEnabled
                ? "Pick a date and place that suit you, and we'll do the rest."
                : "Online booking isn't open just yet, but we're taking enquiries now — and getting in touch early means first pick of dates when they open."}
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              {bookingsEnabled ? (
                <Link
                  href="/locations"
                  className="inline-flex items-center rounded-full bg-white hover:bg-emerald-50 text-emerald-900 text-sm font-semibold px-7 py-3.5 transition-colors"
                >
                  Book a slot
                </Link>
              ) : contactEmail ? (
                <a
                  href={`mailto:${contactEmail}?subject=${encodeURIComponent(
                    "Enquiry from the website"
                  )}`}
                  className="inline-flex items-center rounded-full bg-white hover:bg-emerald-50 text-emerald-900 text-sm font-semibold px-7 py-3.5 transition-colors"
                >
                  Email {contactEmail}
                </a>
              ) : null}
              <Link
                href="/contact"
                className="inline-flex items-center rounded-full border border-emerald-100/30 hover:border-emerald-100/60 text-emerald-50 text-sm font-medium px-7 py-3.5 transition-colors"
              >
                Contact us
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
