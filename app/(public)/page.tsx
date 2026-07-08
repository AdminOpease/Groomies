import Link from "next/link";
import { getSupabasePublic } from "@/lib/supabase/public";
import { FadeIn } from "./_components/FadeIn";

export const revalidate = 3600;

export default async function HomePage() {
  const supabase = getSupabasePublic();
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, slug, type")
    .eq("is_active", true)
    .order("name");

  return (
    <div>
      <Hero />
      <HowItWorks />
      <AreasCovered locations={locations ?? []} />
      <CTABand />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-amber-50"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(16,185,129,0.15),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-32">
        <FadeIn>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 text-emerald-800 text-xs font-medium px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Mobile pet grooming
          </span>
        </FadeIn>
        <FadeIn delay={0.05}>
          <h1 className="mt-5 text-4xl sm:text-6xl font-semibold tracking-tight text-stone-900 max-w-3xl">
            A calm, careful groom —{" "}
            <span className="text-emerald-700">at your driveway</span>.
          </h1>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="mt-5 text-lg text-stone-600 max-w-xl">
            Our vans travel to your area on scheduled days. Book a slot online,
            and we'll take it from there — no salon runs, no waiting rooms, no
            stressed pets.
          </p>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/locations"
              className="inline-flex items-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Find your area
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center rounded-full bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-sm font-medium px-5 py-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
            >
              See services
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: "Pick your area",
      body:
        "Browse the days and slots we're running near you. Book the one that fits.",
    },
    {
      title: "We arrive to you",
      body:
        "Our fully-equipped van pulls up at your door. No commute, no crate stress.",
    },
    {
      title: "Fresh coat, happy pet",
      body:
        "Bath, dry, trim, nails — done in one visit. We bring the salon; you keep the calm.",
    },
  ];

  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
      <FadeIn>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900">
          How it works
        </h2>
        <p className="mt-3 text-stone-600 max-w-xl">
          Three steps between "should I book" and a much happier animal.
        </p>
      </FadeIn>

      <ol className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {steps.map((s, i) => (
          <FadeIn key={s.title} delay={i * 0.08}>
            <li className="h-full rounded-2xl bg-white border border-stone-200 shadow-sm p-6">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white font-semibold">
                {i + 1}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-stone-900">
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">
                {s.body}
              </p>
            </li>
          </FadeIn>
        ))}
      </ol>
    </section>
  );
}

function AreasCovered({
  locations,
}: {
  locations: Array<{ id: string; name: string; slug: string; type: string }>;
}) {
  return (
    <section className="bg-white border-y border-stone-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <FadeIn>
            <div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900">
                Where we go
              </h2>
              <p className="mt-3 text-stone-600 max-w-xl">
                Areas we currently cover. Not seeing yours? Check back — we're
                expanding routes each month.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.05}>
            <Link
              href="/locations"
              className="text-sm text-emerald-700 hover:text-emerald-800 font-medium underline underline-offset-2"
            >
              All locations →
            </Link>
          </FadeIn>
        </div>

        {locations.length === 0 ? (
          <FadeIn>
            <p className="mt-8 text-stone-500 italic">
              New routes launching soon.
            </p>
          </FadeIn>
        ) : (
          <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {locations.map((loc, i) => (
              <FadeIn key={loc.id} delay={Math.min(i, 6) * 0.03}>
                <li>
                  <Link
                    href={`/locations/${loc.slug}`}
                    className="group block rounded-2xl border border-stone-200 bg-stone-50 hover:bg-white hover:border-emerald-300 hover:shadow-md p-5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-stone-900 group-hover:text-emerald-800 transition-colors">
                        {loc.name}
                      </span>
                      <span className="text-stone-300 group-hover:text-emerald-500 transition-colors">
                        →
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500 capitalize">
                      {loc.type === "area" ? "Door-to-door area" : "Fixed stop"}
                    </p>
                  </Link>
                </li>
              </FadeIn>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function CTABand() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
      <FadeIn>
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-10 sm:p-14 shadow-lg">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight max-w-xl">
            Ready when your pet is.
          </h2>
          <p className="mt-3 text-emerald-50/90 max-w-lg">
            Pick a day, pick a slot, and we'll roll up ready.
          </p>
          <div className="mt-8">
            <Link
              href="/locations"
              className="inline-flex items-center rounded-full bg-white text-emerald-800 hover:bg-emerald-50 text-sm font-semibold px-5 py-2.5 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-700"
            >
              Book now
            </Link>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
