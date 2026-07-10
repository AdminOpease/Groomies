import type { Metadata } from "next";
import { getSupabasePublic } from "@/lib/supabase/public";
import { FadeIn } from "../_components/FadeIn";
import { PawIcon, LaurelIcon } from "../_components/BrandIcons";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Services",
  description:
    "Our mobile grooming services and prices. Bath, dry, trim, nails — done at your door.",
};

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  price_from: boolean;
  sort_order: number;
};

export default async function ServicesPage() {
  const supabase = getSupabasePublic();
  const { data: raw } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price_cents, price_from, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  const services = (raw ?? []) as Service[];

  // Anything before sort_order 100 is a signature service; 100+ are add-ons.
  const signature = services.filter((s) => s.sort_order < 100);
  const addons = services.filter((s) => s.sort_order >= 100);

  return (
    <div>
      <ServicesHero />

      {services.length === 0 ? (
        <FadeIn>
          <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 sm:py-24">
            <div className="rounded-3xl border border-emerald-900/10 bg-white p-10 text-center">
              <p className="text-lg font-medium text-stone-800">
                Service list coming soon
              </p>
              <p className="mt-2 text-sm text-stone-500">
                We're finalising our packages. In the meantime, get in touch
                and we'll match one to your pet.
              </p>
            </div>
          </div>
        </FadeIn>
      ) : (
        <>
          {signature.length > 0 ? (
            <ServiceSection
              eyebrow="Signature Grooms"
              title="Our packages"
              body="Everything your pet needs in one calm, careful visit."
              services={signature}
              featured
            />
          ) : null}

          {addons.length > 0 ? (
            <ServiceSection
              eyebrow="Add-ons"
              title="Spa & extras"
              body="Little touches to add to any groom. Ask on the day."
              services={addons}
            />
          ) : null}
        </>
      )}

      <ClosingNote />
    </div>
  );
}

function ServicesHero() {
  return (
    <section className="relative overflow-hidden bg-emerald-50">
      <div
        aria-hidden
        className="absolute -right-4 top-0 text-emerald-700/10 hidden sm:block"
      >
        <LaurelIcon className="h-64 w-48 rotate-180" />
      </div>
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 py-20 sm:py-28 text-center">
        <FadeIn>
          <span className="inline-flex items-center gap-2 text-emerald-800 text-[11px] font-medium uppercase tracking-[0.18em]">
            <PawIcon className="h-3.5 w-3.5" />
            Menu
            <PawIcon className="h-3.5 w-3.5" />
          </span>
        </FadeIn>
        <FadeIn delay={0.05}>
          <h1
            className="mt-6 text-5xl sm:text-6xl leading-[1.05] text-stone-900"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            What we do
          </h1>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p
            className="mt-5 text-xl text-stone-700 italic"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Gentle care. Beautiful results.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

function ServiceSection({
  eyebrow,
  title,
  body,
  services,
  featured = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  services: Service[];
  featured?: boolean;
}) {
  return (
    <section className={featured ? "bg-white" : "bg-[color:var(--brand-soft)]"}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
        <FadeIn>
          <div className="text-center max-w-xl mx-auto">
            <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-[0.18em]">
              {eyebrow}
            </p>
            <h2
              className="mt-3 text-4xl sm:text-5xl text-stone-900"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {title}
            </h2>
            <p className="mt-4 text-stone-600">{body}</p>
          </div>
        </FadeIn>

        {featured ? (
          <ul className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            {services.map((s, i) => (
              <FadeIn key={s.id} delay={Math.min(i, 6) * 0.05}>
                <li className="h-full rounded-3xl border border-emerald-900/10 bg-white shadow-sm p-7 flex flex-col hover:shadow-md hover:border-emerald-500 transition-all">
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
                      {formatPrice(s.price_cents)}
                    </span>
                  </div>
                  {s.description ? (
                    <p className="mt-3 text-sm text-stone-600 leading-relaxed">
                      {s.description}
                    </p>
                  ) : null}
                  <p className="mt-4 text-xs text-stone-500 uppercase tracking-[0.12em]">
                    About {s.duration_minutes} min
                  </p>
                </li>
              </FadeIn>
            ))}
          </ul>
        ) : (
          <div className="mt-14 rounded-3xl border border-emerald-900/10 bg-white shadow-sm overflow-hidden">
            <ul className="divide-y divide-emerald-900/10">
              {services.map((s, i) => (
                <FadeIn key={s.id} delay={Math.min(i, 8) * 0.03}>
                  <li className="px-6 sm:px-8 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p
                        className="text-lg text-stone-900"
                        style={{ fontFamily: "var(--font-display), serif" }}
                      >
                        {s.name}
                      </p>
                      {s.description ? (
                        <p className="mt-1 text-sm text-stone-500 leading-relaxed">
                          {s.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-lg font-semibold text-emerald-800 tabular-nums whitespace-nowrap">
                      {s.price_from ? (
                        <span className="text-sm font-normal text-emerald-800/70">
                          From{" "}
                        </span>
                      ) : null}
                      {formatPrice(s.price_cents)}
                    </span>
                  </li>
                </FadeIn>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function ClosingNote() {
  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
      <FadeIn>
        <div className="text-center">
          <p
            className="text-2xl sm:text-3xl text-stone-900 italic"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Not sure which one to pick?
          </p>
          <p className="mt-3 text-stone-600 max-w-lg mx-auto">
            Book any slot — when we arrive we'll take a look at your pet's coat
            and confirm the right service before we start.
          </p>
        </div>
      </FadeIn>
    </section>
  );
}
