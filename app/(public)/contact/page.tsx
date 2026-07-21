import type { Metadata } from "next";
import Link from "next/link";
import { getSupabasePublic } from "@/lib/supabase/public";
import { FadeIn } from "../_components/FadeIn";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch — questions, custom requests, or anything else. Or just book directly online.",
};

export default async function ContactPage() {
  const supabase = getSupabasePublic();
  const { data: settings } = await supabase
    .from("public_business_settings")
    .select("business_name, contact_email, contact_phone, bookings_enabled")
    .single();

  const bookingsEnabled = settings?.bookings_enabled ?? false;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-14 sm:py-20">
      <FadeIn>
        <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
          Contact
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight text-stone-900">
          Get in touch
        </h1>
        {bookingsEnabled ? (
          <p className="mt-4 text-lg text-stone-600">
            Fastest way to book is online — but for anything else, we're happy
            to hear from you.
          </p>
        ) : (
          <p className="mt-4 text-lg text-stone-600">
            Online booking isn't open just yet, so email or a phone call is the
            way to reach us. Tell us your dog's name and breed, roughly where
            you are, and what sort of groom you're after — we'll come back to
            you personally.
          </p>
        )}
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {settings?.contact_email ? (
            <a
              href={`mailto:${settings.contact_email}`}
              className="rounded-2xl border border-stone-200 bg-white p-5 hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <p className="text-xs text-stone-500 uppercase tracking-wider">
                Email
              </p>
              <p className="mt-1 text-stone-900 font-medium break-all">
                {settings.contact_email}
              </p>
            </a>
          ) : null}
          {settings?.contact_phone ? (
            <a
              href={`tel:${settings.contact_phone.replace(/\s+/g, "")}`}
              className="rounded-2xl border border-stone-200 bg-white p-5 hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <p className="text-xs text-stone-500 uppercase tracking-wider">
                Phone
              </p>
              <p className="mt-1 text-stone-900 font-medium">
                {settings.contact_phone}
              </p>
            </a>
          ) : null}
          {!settings?.contact_email && !settings?.contact_phone ? (
            <div className="col-span-full rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500">
              Contact details will appear here once set in the business settings.
            </div>
          ) : null}
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <p className="text-xs text-stone-500 uppercase tracking-wider">
            Where we work
          </p>
          <p className="mt-2 text-sm text-stone-600 leading-relaxed">
            We're mobile, so there's no salon to visit. Depending on the day and
            your postcode, we either park outside your house or you meet the van
            at a scheduled local stop — each date on the site says which. We
            currently cover Dunstable and the surrounding LU postcodes. Not sure
            if you're in range? Send us your postcode and we'll tell you
            straight away.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="mt-12">
          <Link
            href={bookingsEnabled ? "/locations" : "/services"}
            className="inline-flex items-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 shadow-sm transition-colors"
          >
            {bookingsEnabled ? "Or book a slot →" : "See our services →"}
          </Link>
        </div>
      </FadeIn>
    </div>
  );
}
