import type { Metadata } from "next";
import { getSupabasePublic } from "@/lib/supabase/public";
import { FadeIn } from "../_components/FadeIn";
import { LocationsBrowser } from "./_components/LocationsBrowser";

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
      .select("show_slot_counts")
      .single(),
  ]);
  const showSlotCounts = settings?.show_slot_counts ?? true;

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
            Pick your area to see the days and slots we're running there. Live
            availability — nothing that's already booked will show as free.
          </p>
        </div>
      </FadeIn>

      <div className="mt-12">
        <LocationsBrowser
          locations={locations ?? []}
          showSlotCounts={showSlotCounts}
        />
      </div>
    </div>
  );
}
