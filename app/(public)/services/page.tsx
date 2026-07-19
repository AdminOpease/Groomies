import type { Metadata } from "next";
import { getSupabasePublic } from "@/lib/supabase/public";
import { FadeIn } from "../_components/FadeIn";
import { PawIcon, LaurelIcon } from "../_components/BrandIcons";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Services & Prices",
  description:
    "Our mobile grooming services and prices, by dog size. Bath, dry, trim, nails — done at your door.",
};

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

type Variant = {
  id: string;
  label: string;
  price_cents: number;
  price_from: boolean;
  sort_order: number;
  is_active: boolean;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  price_from: boolean;
  category: string | null;
  sort_order: number;
  service_variants: Variant[] | null;
};

// Content that isn't per-service pricing. Kept here rather than in the DB
// because none of it carries a price the owner needs to change often.
const PLEASE_NOTE = {
  intro: "Additional charges may apply for:",
  items: [
    "Excessive matting",
    "Behaviour requiring extra handling",
    "Severely overgrown coats",
    "Flea infestations",
    "Extra-large breeds",
    "Out-of-area appointments",
  ],
  footer:
    "We will always discuss any additional costs before starting your dog's groom.",
};

const SPA_UPGRADES = [
  "Mud Spa Treatment",
  "Oatmeal Sensitive Skin",
  "Aromatherapy Bath",
  "Paw & Nose Balm",
  "Blueberry Facial",
];

const VIP_BENEFITS = [
  "Priority booking",
  "Free nail trims between grooms",
  "Loyalty rewards",
  "Reduced de-matting charges",
  "Regular maintenance plans",
];

// Shown under any size table where the prices are starting prices.
const FROM_FOOTNOTE =
  "Final price depends on coat condition, temperament, breed & time required.";

type Section = { title: string; items: Service[]; order: number };

/** Group services into price-list sections, ordered by their lowest sort_order. */
function groupByCategory(services: Service[]): Section[] {
  const map = new Map<string, Service[]>();
  for (const s of services) {
    const key = s.category?.trim() || "More services";
    const bucket = map.get(key);
    if (bucket) bucket.push(s);
    else map.set(key, [s]);
  }
  return [...map.entries()]
    .map(([title, items]) => ({
      title,
      items: [...items].sort((a, b) => a.sort_order - b.sort_order),
      order: Math.min(...items.map((i) => i.sort_order)),
    }))
    .sort((a, b) => a.order - b.order);
}

const activeVariants = (s: Service): Variant[] =>
  (s.service_variants ?? [])
    .filter((v) => v.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

export default async function ServicesPage() {
  const supabase = getSupabasePublic();
  const { data: raw } = await supabase
    .from("services")
    .select(
      "id, name, description, duration_minutes, price_cents, price_from, category, sort_order, service_variants(id, label, price_cents, price_from, sort_order, is_active)"
    )
    .eq("is_active", true)
    .order("sort_order");
  const services = (raw ?? []) as unknown as Service[];
  const sections = groupByCategory(services);

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
        sections.map((section, i) => (
          <PriceSection key={section.title} section={section} alt={i % 2 === 1} />
        ))
      )}

      <SpaUpgrades />
      <VipClub />
      <PleaseNote />
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
            Services &amp; prices
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

function Price({ cents, from }: { cents: number; from: boolean }) {
  return (
    <span className="text-lg font-semibold text-emerald-800 tabular-nums whitespace-nowrap">
      {from ? (
        <span className="text-sm font-normal text-emerald-800/70">From </span>
      ) : null}
      {formatPrice(cents)}
    </span>
  );
}

/**
 * One price-list section. Services with size tiers get their own card with a
 * size/price table; simple one-price services share a single list card.
 */
function PriceSection({ section, alt }: { section: Section; alt: boolean }) {
  const tiered = section.items.filter((s) => activeVariants(s).length > 0);
  const flat = section.items.filter((s) => activeVariants(s).length === 0);
  // A section holding one service is titled after it, so repeating the name
  // inside the card just reads as a stutter.
  const soleService = section.items.length === 1;

  return (
    <section className={alt ? "bg-[color:var(--brand-soft)]" : "bg-white"}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-14 sm:py-20">
        <FadeIn>
          <h2
            className="flex items-center gap-3 text-3xl sm:text-4xl text-stone-900"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            <PawIcon className="h-5 w-5 shrink-0 text-emerald-700" />
            {section.title}
          </h2>
        </FadeIn>

        <div className="mt-8 space-y-6">
          {tiered.map((s, i) => (
            <FadeIn key={s.id} delay={Math.min(i, 4) * 0.05}>
              <TieredCard service={s} hideName={soleService} />
            </FadeIn>
          ))}

          {flat.length > 0 ? (
            <FadeIn delay={Math.min(tiered.length, 4) * 0.05}>
              <FlatList services={flat} hideName={soleService} />
            </FadeIn>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** A size-priced package: description, then one row per size. */
function TieredCard({
  service,
  hideName = false,
}: {
  service: Service;
  hideName?: boolean;
}) {
  const variants = activeVariants(service);
  const anyFrom = variants.some((v) => v.price_from);

  return (
    <div className="rounded-3xl border border-emerald-900/10 bg-white shadow-sm p-7 sm:p-8">
      {hideName ? null : (
        <h3
          className="text-2xl text-stone-900"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {service.name}
        </h3>
      )}
      {service.description ? (
        <p className="mt-3 text-sm text-stone-600 leading-relaxed">
          {service.description}
        </p>
      ) : null}

      <ul className="mt-6 divide-y divide-emerald-900/10 border-y border-emerald-900/10">
        {variants.map((v) => (
          <li
            key={v.id}
            className="flex items-center justify-between gap-4 py-3.5"
          >
            <span className="text-sm sm:text-base text-stone-700 uppercase tracking-[0.08em]">
              {v.label}
            </span>
            <Price cents={v.price_cents} from={v.price_from} />
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-stone-500">
        {anyFrom ? `*${FROM_FOOTNOTE}` : `About ${service.duration_minutes} min`}
      </p>
    </div>
  );
}

/** One-price services, rendered as a leader-dot price list. */
function FlatList({
  services,
  hideName = false,
}: {
  services: Service[];
  hideName?: boolean;
}) {
  // Single service whose name is already the section heading: show what it
  // includes on the left and the price on the right, with no repeated title.
  if (hideName && services.length === 1) {
    const s = services[0];
    return (
      <div className="rounded-3xl border border-emerald-900/10 bg-white shadow-sm p-7 sm:p-8">
        <div className="flex items-start justify-between gap-6">
          <p className="text-sm text-stone-600 leading-relaxed">
            {s.description}
          </p>
          <Price cents={s.price_cents} from={s.price_from} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-emerald-900/10 bg-white shadow-sm p-7 sm:p-8">
      <ul className="space-y-1">
        {services.map((s) => (
          <li key={s.id} className="py-2.5">
            <div className="flex items-baseline gap-3">
              <span className="text-base text-stone-800">{s.name}</span>
              <span
                aria-hidden
                className="flex-1 border-b border-dotted border-emerald-900/25 translate-y-[-0.25rem]"
              />
              <Price cents={s.price_cents} from={s.price_from} />
            </div>
            {s.description ? (
              <p className="mt-1 text-sm text-stone-500 leading-relaxed">
                {s.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpaUpgrades() {
  return (
    <section className="bg-emerald-900 text-emerald-50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-14 sm:py-20 text-center">
        <FadeIn>
          <h2
            className="text-3xl sm:text-4xl italic"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Luxury spa upgrades
          </h2>
        </FadeIn>
        <FadeIn delay={0.05}>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-4">
            {SPA_UPGRADES.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-emerald-50/90"
              >
                <PawIcon className="h-3.5 w-3.5 text-emerald-200/70" />
                {item}
              </li>
            ))}
          </ul>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="mt-8 text-sm text-emerald-100/70 italic">
            Ask your groomer for today's recommendations.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

function VipClub() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-14 sm:py-20">
        <FadeIn>
          <div className="rounded-3xl border border-emerald-900/15 bg-[color:var(--brand-soft)] p-8 sm:p-10">
            <p className="text-[11px] font-medium text-emerald-800 uppercase tracking-[0.22em]">
              Members
            </p>
            <h2
              className="mt-3 text-3xl sm:text-4xl text-stone-900"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Groomies VIP Club
            </h2>
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {VIP_BENEFITS.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2.5 text-stone-700"
                >
                  <span aria-hidden className="mt-1 text-emerald-700">
                    ✓
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-7 text-sm text-stone-600">
              Ask about joining at your next groom.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function PleaseNote() {
  return (
    <section className="bg-[color:var(--brand-soft)] border-y border-emerald-900/10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
        <FadeIn>
          <p className="text-[11px] font-medium text-emerald-800 uppercase tracking-[0.22em]">
            Please note
          </p>
          <p className="mt-4 text-sm text-stone-700">{PLEASE_NOTE.intro}</p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {PLEASE_NOTE.items.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-sm text-stone-600"
              >
                <span aria-hidden className="text-emerald-700/50">
                  •
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm font-medium text-stone-800">
            {PLEASE_NOTE.footer}
          </p>
        </FadeIn>
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
