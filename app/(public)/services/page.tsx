import type { Metadata } from "next";
import { getSupabasePublic } from "@/lib/supabase/public";
import { FadeIn } from "../_components/FadeIn";

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

export default async function ServicesPage() {
  const supabase = getSupabasePublic();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price_cents")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-14 sm:py-20">
      <FadeIn>
        <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
          Services
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight text-stone-900">
          What we do
        </h1>
        <p className="mt-4 text-lg text-stone-600 max-w-2xl">
          Every visit ends with a fresh, comfortable pet — bath, blow-dry, trim,
          nails, ears. Add-ons where useful, never upsold.
        </p>
      </FadeIn>

      {!services || services.length === 0 ? (
        <FadeIn>
          <div className="mt-12 rounded-2xl border border-stone-200 bg-white p-10 text-center">
            <p className="text-lg font-medium text-stone-800">
              Service list coming soon
            </p>
            <p className="mt-2 text-sm text-stone-500">
              We're finalising our packages. In the meantime, get in touch and
              we'll match one to your pet.
            </p>
          </div>
        </FadeIn>
      ) : (
        <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {services.map((s, i) => (
            <FadeIn key={s.id} delay={Math.min(i, 6) * 0.04}>
              <li className="h-full rounded-2xl border border-stone-200 bg-white p-6 hover:shadow-md hover:border-emerald-300 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-stone-900">
                    {s.name}
                  </h2>
                  <span className="text-lg font-semibold text-emerald-700 tabular-nums">
                    {formatPrice(s.price_cents)}
                  </span>
                </div>
                {s.description ? (
                  <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                    {s.description}
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-stone-500">
                  About {s.duration_minutes} min
                </p>
              </li>
            </FadeIn>
          ))}
        </ul>
      )}

      <FadeIn delay={0.05}>
        <section className="mt-16 rounded-2xl bg-emerald-50 border border-emerald-200 p-8 sm:p-10">
          <h2 className="text-2xl font-semibold text-stone-900">
            Not sure which one to pick?
          </h2>
          <p className="mt-2 text-stone-700 max-w-xl">
            Book any slot — when we arrive, we'll take a look at your pet's coat
            and confirm the right service before we start.
          </p>
        </section>
      </FadeIn>
    </div>
  );
}
