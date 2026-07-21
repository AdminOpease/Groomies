import Link from "next/link";
import Image from "next/image";
import { getSupabasePublic } from "@/lib/supabase/public";
import { FadeIn } from "./_components/FadeIn";

export const revalidate = 3600;

// Brand logo (pre-trimmed to even padding) — same asset the header/footer use.
const LOGO_SRC = "/Groomies Logo.png";
// Placeholder editorial photos — swap for the owner's own via Supabase Storage later.
const HERO_PHOTO = {
  src: "/Image Groomies.png",
  alt: "A cheeky Groomies pup showing off a fresh cut",
};
const STUDIO_PHOTO = {
  src: "https://images.unsplash.com/photo-1560743641-3914f2c45636?auto=format&fit=crop&w=1400&q=85",
  alt: "A calm groom in a mobile studio",
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  price_from: boolean;
};

export default async function HomePage() {
  const supabase = getSupabasePublic();
  const [{ data: locations }, { data: services }] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name, slug, type")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("services")
      .select("id, name, description, price_cents, price_from, sort_order")
      .eq("is_active", true)
      .lt("sort_order", 100)
      .order("sort_order")
      .limit(4),
  ]);

  return (
    <div>
      <Hero />
      <MarqueeStrip />
      <Statement />
      <HowItWorks />
      <ServicesTeaser services={(services ?? []) as Service[]} />
      <StudioMoment />
      <AreasCovered locations={locations ?? []} />
      <Commitments />
      <CTABand />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero — split, big cinematic photo, confident type. No ornament.
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="relative overflow-hidden bg-emerald-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-10 lg:gap-16 items-center">
          <div>
            <FadeIn>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_SRC}
                alt="Groomies"
                className="h-20 sm:h-24 w-auto -ml-1"
              />
            </FadeIn>
            <FadeIn delay={0.05}>
              <p className="mt-6 text-[11px] font-medium text-emerald-800 uppercase tracking-[0.22em]">
                Mobile dog grooming · UK
              </p>
            </FadeIn>
            <FadeIn delay={0.05}>
              <h1
                className="mt-6 text-[3.75rem] sm:text-7xl lg:text-[5.5rem] leading-[0.95] text-stone-900 tracking-tight"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Grooming that
                <br />
                <span className="italic text-emerald-800">comes to you.</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="mt-8 text-lg text-stone-700 max-w-md">
                A calm, careful groom in a fully-equipped mobile studio at your
                door. Book online in a minute — we'll take it from there.
              </p>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="/locations"
                  className="inline-flex items-center rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold px-7 py-3.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  Find your area
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center rounded-full bg-transparent hover:bg-white/60 border border-emerald-800/40 text-emerald-900 text-sm font-medium px-7 py-3.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  See services
                </Link>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={0.1}>
            <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-emerald-900/10">
              <Image
                src={HERO_PHOTO.src}
                alt={HERO_PHOTO.alt}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Marquee-style trust strip — simple line of proof points.
// ---------------------------------------------------------------------------

function MarqueeStrip() {
  const items = [
    "Fully insured",
    "City & Guilds qualified",
    "Warm water on-board",
    "Low-noise dryers",
    "One pet at a time",
  ];
  return (
    <section className="bg-emerald-900 text-emerald-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-[11px] font-medium uppercase tracking-[0.22em] text-center">
        {items.map((label, i) => (
          <span key={label} className="flex items-center gap-4">
            {label}
            {i < items.length - 1 ? (
              <span aria-hidden className="text-emerald-500">·</span>
            ) : null}
          </span>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Statement — big italic promise. Nothing else.
// ---------------------------------------------------------------------------

function Statement() {
  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 py-24 sm:py-32 text-center">
      <FadeIn>
        <p
          className="text-3xl sm:text-4xl lg:text-5xl leading-tight text-stone-800 italic"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          A calm groom. Great coats. Happy pets.
          <br />
          It's really that simple.
        </p>
      </FadeIn>
      <FadeIn delay={0.1}>
        <p className="mt-8 text-[11px] font-medium text-emerald-800 uppercase tracking-[0.22em]">
          The Groomies promise
        </p>
      </FadeIn>
    </section>
  );
}

// ---------------------------------------------------------------------------
// How it works — big numbered steps, no cards, no ornament.
// ---------------------------------------------------------------------------

function HowItWorks() {
  const steps = [
    {
      n: "One",
      badge: "Step 01",
      title: "Pick your area",
      body: "Browse the days and slots we're running near you and pick the one that fits your week.",
    },
    {
      n: "Two",
      badge: "Step 02",
      title: "We arrive to you",
      body: "The mobile studio pulls up at your door — no commute, no waiting room, no crate stress.",
    },
    {
      n: "Three",
      badge: "Step 03",
      title: "Fresh coat, happy pet",
      body: "Bath, dry, trim, nails, ears — everything a salon does, done in one calm visit.",
    },
  ];
  return (
    <section className="relative bg-[color:var(--brand-soft)] border-y border-emerald-900/10 overflow-hidden">
      {/* Subtle radial glow so the section feels lit rather than flat. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[60%] pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgba(109,112,66,0.10), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-24 sm:py-32">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] font-medium text-emerald-800 uppercase tracking-[0.22em]">
              How it works
            </p>
            <h2
              className="mt-5 text-5xl sm:text-6xl leading-[1.02] text-stone-900"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Three <span className="italic text-emerald-800">quiet</span> steps.
            </h2>
            <p className="mt-5 text-stone-600 max-w-lg mx-auto">
              Between "should I book" and a much calmer pet — three things
              happen. That's all.
            </p>
          </div>
        </FadeIn>

        <ol className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((s, i) => (
            <FadeIn key={s.n} delay={i * 0.08}>
              <li className="group relative h-full overflow-hidden rounded-3xl bg-white/70 backdrop-blur border border-emerald-900/10 p-8 sm:p-10 hover:border-emerald-800/40 hover:bg-white transition-all">
                {/* Big italic numeral watermark — clipped to the card and
                    anchored top-right so all three read consistently regardless
                    of word length. */}
                <span
                  aria-hidden
                  className="absolute top-2 right-5 text-emerald-800/15 group-hover:text-emerald-800/25 transition-colors select-none pointer-events-none italic leading-none"
                  style={{
                    fontFamily: "var(--font-display), serif",
                    fontSize: "7rem",
                  }}
                >
                  {s.n}
                </span>

                <p className="relative text-[11px] font-medium text-emerald-800 uppercase tracking-[0.22em]">
                  {s.badge}
                </p>
                <h3
                  className="relative mt-6 text-3xl sm:text-4xl text-stone-900 leading-[1.05]"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {s.title}
                </h3>
                <div className="relative mt-5 h-px w-12 bg-emerald-800/30" />
                <p className="relative mt-5 text-stone-600 leading-relaxed">
                  {s.body}
                </p>
              </li>
            </FadeIn>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Services teaser — cleaner grid, less card chrome.
// ---------------------------------------------------------------------------

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

function ServicesTeaser({ services }: { services: Service[] }) {
  if (services.length === 0) return null;
  return (
    <section className="bg-emerald-50/60 border-y border-emerald-900/10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28">
        <FadeIn>
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium text-emerald-800 uppercase tracking-[0.22em]">
                Signature grooms
              </p>
              <h2
                className="mt-4 text-4xl sm:text-5xl leading-[1.05] text-stone-900"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Our packages.
              </h2>
            </div>
            <Link
              href="/services"
              className="text-sm text-emerald-800 hover:text-emerald-900 font-medium underline underline-offset-4"
            >
              Full menu →
            </Link>
          </div>
        </FadeIn>

        <ul className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          {services.map((s, i) => (
            <FadeIn key={s.id} delay={Math.min(i, 6) * 0.05}>
              <li className="h-full rounded-3xl border border-emerald-900/10 bg-white p-7 hover:border-emerald-800/40 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <h3
                    className="text-2xl text-stone-900"
                    style={{ fontFamily: "var(--font-display), serif" }}
                  >
                    {s.name}
                  </h3>
                  <span className="text-xl font-semibold text-emerald-800 tabular-nums whitespace-nowrap">
                    {s.price_from ? (
                      <span className="text-sm font-normal text-emerald-800/70">
                        From{" "}
                      </span>
                    ) : null}
                    {formatMoney(s.price_cents)}
                  </span>
                </div>
                {s.description ? (
                  <p className="mt-3 text-sm text-stone-600 leading-relaxed line-clamp-3">
                    {s.description}
                  </p>
                ) : null}
              </li>
            </FadeIn>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Studio moment — cinematic dark section with a big photo and copy.
// ---------------------------------------------------------------------------

function StudioMoment() {
  return (
    <section className="relative bg-emerald-900 text-emerald-50 overflow-hidden">
      <div className="grid lg:grid-cols-2">
        <div className="relative min-h-[380px] lg:min-h-[600px]">
          <Image
            src={STUDIO_PHOTO.src}
            alt={STUDIO_PHOTO.alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="px-6 sm:px-12 lg:px-16 py-16 sm:py-24 lg:py-32">
          <FadeIn>
            <p className="text-[11px] font-medium text-emerald-300 uppercase tracking-[0.22em]">
              A studio on wheels
            </p>
            <h2
              className="mt-5 text-4xl sm:text-5xl lg:text-6xl leading-[1.05]"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Everything a salon has.
              <br />
              <span className="italic text-emerald-200">
                Nothing it doesn't need.
              </span>
            </h2>
            <p className="mt-7 text-emerald-100/85 leading-relaxed max-w-md text-lg">
              Warm water on-board, low-noise dryers, hypoallergenic products,
              one pet at a time. All of it arrives at your door.
            </p>
            <div className="mt-9">
              <Link
                href="/about"
                className="inline-flex items-center text-sm text-emerald-100 hover:text-white font-medium underline underline-offset-4"
              >
                More about how we work →
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Areas covered — clean list, no ornament.
// ---------------------------------------------------------------------------

function AreasCovered({
  locations,
}: {
  locations: Array<{ id: string; name: string; slug: string; type: string }>;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-24 sm:py-32">
      <FadeIn>
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium text-emerald-800 uppercase tracking-[0.22em]">
              Where we go
            </p>
            <h2
              className="mt-4 text-4xl sm:text-5xl leading-[1.05] text-stone-900"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Serving your area.
            </h2>
          </div>
          <Link
            href="/locations"
            className="text-sm text-emerald-800 hover:text-emerald-900 font-medium underline underline-offset-4"
          >
            All locations →
          </Link>
        </div>
      </FadeIn>

      {locations.length === 0 ? (
        <FadeIn>
          <p className="mt-12 text-stone-500 italic">
            New routes launching soon.
          </p>
        </FadeIn>
      ) : (
        <ul className="mt-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {locations.map((loc, i) => (
            <FadeIn key={loc.id} delay={Math.min(i, 6) * 0.03}>
              <li>
                <Link
                  href={`/locations/${loc.slug}`}
                  className="group flex items-center justify-between rounded-2xl border border-emerald-900/10 bg-white hover:bg-emerald-50/50 hover:border-emerald-800/40 p-5 transition-all"
                >
                  <div className="min-w-0">
                    <p
                      className="text-lg text-stone-900 group-hover:text-emerald-900 transition-colors"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {loc.name}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500 capitalize">
                      {loc.type === "area" ? "Door-to-door" : "Fixed stop"}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="text-emerald-800/40 group-hover:text-emerald-800 transition-colors"
                  >
                    →
                  </span>
                </Link>
              </li>
            </FadeIn>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Testimonials — trimmed to two, editorial pull-quote layout.
// ---------------------------------------------------------------------------

/**
 * This slot held two invented testimonials ("Anna — Bella, cockapoo" and
 * "Mark — Rufus, terrier cross"). They were removed when the site went live.
 *
 * Fabricated reviews are a banned commercial practice under the Digital
 * Markets, Competition and Consumers Act 2024, which the CMA can enforce
 * directly — and the business has not traded yet, so there was no real
 * customer they could ever have been attributed to.
 *
 * Replaced with commitments, which build the same trust without pretending
 * anyone has said anything. Put real quotes here once real customers give
 * them, with their permission.
 */
function Commitments() {
  const promises = [
    {
      t: "One dog per appointment",
      d: "No crate, no queue, no waiting around while other dogs are done.",
    },
    {
      t: "The price you were quoted",
      d: "Anything extra gets discussed with you before we start, never after.",
    },
    {
      t: "Your dog's welfare first",
      d: "If a coat is too matted to work through kindly, we'll say so and offer the gentler option.",
    },
  ];
  return (
    <section className="border-t border-emerald-900/10 bg-emerald-50/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-24 sm:py-32">
        <FadeIn>
          <p className="text-[11px] font-medium text-emerald-800 uppercase tracking-[0.22em] text-center">
            Our promise
          </p>
        </FadeIn>
        <ul className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {promises.map((p, i) => (
            // FadeIn goes inside the <li> — a div between <ul> and <li> breaks
            // list semantics for screen readers.
            <li key={p.t}>
              <FadeIn delay={i * 0.08}>
                <p
                  className="text-2xl sm:text-3xl italic text-stone-800 leading-snug"
                  style={{ fontFamily: "var(--font-display), serif" }}
                >
                  {p.t}
                </p>
                <p className="mt-4 text-stone-600 leading-relaxed">{p.d}</p>
              </FadeIn>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CTA band — dark, confident. No gradient noise.
// ---------------------------------------------------------------------------

function CTABand() {
  return (
    <section className="bg-emerald-900 text-emerald-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-24 sm:py-32 text-center">
        <FadeIn>
          <p className="text-[11px] font-medium text-emerald-300 uppercase tracking-[0.22em]">
            Ready when you are
          </p>
          <h2
            className="mt-5 text-5xl sm:text-6xl lg:text-7xl leading-[1.02]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Book your pet in
            <br />
            <span className="italic text-emerald-200">for a calmer groom.</span>
          </h2>
          <div className="mt-10">
            <Link
              href="/locations"
              className="inline-flex items-center rounded-full bg-white text-emerald-900 hover:bg-emerald-100 text-sm font-semibold px-8 py-4 shadow-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-900"
            >
              Find your area
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
