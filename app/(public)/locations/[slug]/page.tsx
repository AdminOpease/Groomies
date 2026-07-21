import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabasePublic } from "@/lib/supabase/public";
import { FadeIn } from "../../_components/FadeIn";
import { LocationSchedule } from "./_components/LocationSchedule";
import { BookingsClosed } from "../../_components/BookingsClosed";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const supabase = getSupabasePublic();
  const { data } = await supabase
    .from("locations")
    .select("slug")
    .eq("is_active", true);
  return (data ?? []).map((l) => ({ slug: l.slug }));
}

async function fetchLocation(slug: string) {
  const supabase = getSupabasePublic();
  const { data } = await supabase
    .from("locations")
    .select("id, slug, name, type, description, address, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  return data;
}

async function fetchSettings() {
  const supabase = getSupabasePublic();
  const { data } = await supabase
    .from("public_business_settings")
    .select("show_slot_counts, bookings_enabled, contact_email, contact_phone")
    .single();
  return {
    showSlotCounts: data?.show_slot_counts ?? true,
    // Default to CLOSED when the settings row can't be read. Failing open would
    // serve live booking links while the business isn't ready to honour them.
    bookingsEnabled: data?.bookings_enabled ?? false,
    contactEmail: data?.contact_email ?? null,
    contactPhone: data?.contact_phone ?? null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const location = await fetchLocation(slug);
  if (!location) return { title: "Location not found" };
  return {
    title: location.name,
    description:
      location.description ??
      `Book a mobile grooming slot in ${location.name}. Live availability.`,
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [location, settings] = await Promise.all([
    fetchLocation(slug),
    fetchSettings(),
  ]);
  if (!location) notFound();

  return (
    <div>
      <section className="bg-emerald-50 border-b border-emerald-900/10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-14 sm:py-20">
          <FadeIn>
            <nav aria-label="Breadcrumb" className="text-sm text-emerald-800 mb-6">
              <Link
                href="/locations"
                className="hover:text-emerald-900 underline underline-offset-4"
              >
                Locations
              </Link>{" "}
              / <span aria-current="page">{location.name}</span>
            </nav>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <TypeBadge type={location.type} />
            </div>

            <h1
              className="text-5xl sm:text-6xl leading-[1.05] text-stone-900"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {location.name}
            </h1>

            {location.address ? (
              <p className="mt-4 text-stone-700 text-lg">{location.address}</p>
            ) : null}
            {location.description ? (
              <p className="mt-5 text-stone-700 max-w-2xl">
                {location.description}
              </p>
            ) : null}
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-14 sm:py-20">
        <FadeIn delay={0.05}>
          {settings.bookingsEnabled ? (
            <>
              <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-[0.18em]">
                Available dates
              </p>
              <h2
                className="mt-2 text-3xl text-stone-900"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                Pick your slot
              </h2>
              <div className="mt-8">
                <LocationSchedule
                  locationId={location.id}
                  showSlotCounts={settings.showSlotCounts}
                />
              </div>
            </>
          ) : (
            <BookingsClosed
              contactEmail={settings.contactEmail}
              contactPhone={settings.contactPhone}
              subject={`Booking enquiry — ${location.name}`}
            />
          )}
        </FadeIn>
      </section>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  if (type === "stop") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium px-2.5 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
        Meet us at this address
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium px-2.5 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      We come to you
    </span>
  );
}
