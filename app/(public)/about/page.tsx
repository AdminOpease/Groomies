import type { Metadata } from "next";
import { getSupabasePublic } from "@/lib/supabase/public";
import { FadeIn } from "../_components/FadeIn";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About",
  description: "About our mobile pet grooming business.",
};

const DEFAULT_BLURB =
  "We started because our own pets hated the salon: the drive, the noise, the wait. Mobile grooming fixes all three. Our van rolls up to your door with everything a salon has — just calmer, and just for your pet.";

export default async function AboutPage() {
  const supabase = getSupabasePublic();
  const { data: settings } = await supabase
    .from("public_business_settings")
    .select("business_name, about_blurb")
    .single();

  const businessName = settings?.business_name ?? "Groomies";
  const blurb = settings?.about_blurb ?? DEFAULT_BLURB;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-14 sm:py-20">
      <FadeIn>
        <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
          About
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight text-stone-900">
          Why {businessName}?
        </h1>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="mt-8 prose prose-stone max-w-none">
          <p className="text-lg leading-relaxed text-stone-700">{blurb}</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <section className="mt-14 rounded-2xl bg-white border border-stone-200 p-8">
          <h2 className="text-xl font-semibold text-stone-900">
            What makes us different
          </h2>
          <ul className="mt-4 space-y-3 text-stone-700">
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-none" />
              We come to you. No transport stress, no waiting rooms.
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-none" />
              One pet at a time. Your slot is your pet's slot.
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-none" />
              Fully-equipped mobile studio — warm water, low-noise dryers, the
              works.
            </li>
          </ul>
        </section>
      </FadeIn>
    </div>
  );
}
