import type { Metadata } from "next";
import { getSupabasePublic } from "@/lib/supabase/public";
import { FadeIn } from "../_components/FadeIn";
import { LocationsBrowser } from "./_components/LocationsBrowser";
import { BookingsClosed } from "../_components/BookingsClosed";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Locations",
  description:
    "Where our mobile grooming vans are running. Pick your area and book a slot.",
};

export default async function LocationsPage() {
  const supabase = getSupabasePublic();
  const [{ data: locations }, { data: settings }] = await Promise.all([
    supabase
      .from("locations")
      .select("id, slug, name, type, description, address")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("public_business_settings")
      .select(
        "show_slot_counts, bookings_enabled, contact_email, contact_phone"
      )
      .single(),
  ]);
  const showSlotCounts = settings?.show_slot_counts ?? true;
  const bookingsEnabled = settings?.bookings_enabled ?? false;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
      <FadeIn>
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
            Locations
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight text-stone-900">
            Find your area
          </h1>
          <p className="mt-4 text-lg text-stone-600">
            {bookingsEnabled
              ? "Pick your area to see the days and slots we're running there. Live availability — nothing that's already booked will show as free."
              : "We're mobile — we either park at your door or you meet the van at a local stop. Online booking isn't open yet, so tell us where you are and we'll let you know what's running near you."}
          </p>
        </div>
      </FadeIn>

      {/* This page is the homepage's main call to action. With bookings closed
          the browser below renders an empty "launching soon" state, which is a
          dead end for a visitor who arrived ready to book — so ask for the
          enquiry here instead of letting them bounce. */}
      <div className="mt-12">
        {bookingsEnabled ? (
          <LocationsBrowser
            locations={locations ?? []}
            showSlotCounts={showSlotCounts}
          />
        ) : (
          <div className="max-w-3xl">
            <BookingsClosed
              contactEmail={settings?.contact_email ?? null}
              contactPhone={settings?.contact_phone ?? null}
              subject="Booking enquiry — my area"
            />
          </div>
        )}
      </div>
    </div>
  );
}
