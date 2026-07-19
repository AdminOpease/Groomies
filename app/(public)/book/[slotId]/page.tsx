import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSupabasePublic } from "@/lib/supabase/public";
import { formatDateLondon, formatTime, todayLondonISO } from "@/lib/format";
import { FadeIn } from "../../_components/FadeIn";
import { BookingForm } from "./_components/BookingForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book your slot",
  robots: { index: false, follow: false },
};

async function loadSlot(slotId: string) {
  const supabase = getSupabasePublic();

  // Slot + parent date + parent location + remaining, all in one round-trip.
  const [slotRes, availRes, servicesRes, settingsRes] = await Promise.all([
    supabase
      .from("time_slots")
      .select(
        `
          id,
          start_time,
          end_time,
          max_appointments,
          location_dates!inner (
            id,
            service_date,
            locations!inner ( id, name, slug, type, address, is_active )
          )
        `
      )
      .eq("id", slotId)
      .single(),
    supabase
      .from("slot_availability")
      .select("remaining")
      .eq("slot_id", slotId)
      .maybeSingle(),
    supabase
      .from("services")
      .select(
        "id, name, price_cents, price_from, duration_minutes, service_variants(id, label, price_cents, price_from, sort_order)"
      )
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("public_business_settings")
      .select("deposit_mode, deposit_percent, payments_enabled")
      .maybeSingle(),
  ]);

  if (slotRes.error || !slotRes.data) return null;

  type LocationRef = {
    id: string;
    name: string;
    slug: string;
    type: string;
    address: string | null;
    is_active: boolean;
  };
  type DateRef = {
    id: string;
    service_date: string;
    locations: LocationRef | LocationRef[] | null;
  };
  type SlotRow = {
    id: string;
    start_time: string;
    end_time: string;
    max_appointments: number;
    location_dates: DateRef | DateRef[] | null;
  };

  const slot = slotRes.data as SlotRow;
  const rawDate = Array.isArray(slot.location_dates)
    ? slot.location_dates[0]
    : slot.location_dates;
  if (!rawDate) return null;

  const rawLocation = Array.isArray(rawDate.locations)
    ? rawDate.locations[0]
    : rawDate.locations;
  if (!rawLocation) return null;

  // Basic bookability check (RPC re-enforces, but this shows a nicer UI up-front).
  if (
    !rawLocation.is_active ||
    rawDate.service_date < todayLondonISO()
  ) {
    return null;
  }

  return {
    slot: {
      id: slot.id,
      start_time: slot.start_time,
      end_time: slot.end_time,
      max_appointments: slot.max_appointments,
    },
    date: { id: rawDate.id, service_date: rawDate.service_date },
    location: rawLocation,
    remaining: availRes.data?.remaining ?? 0,
    services: servicesRes.data ?? [],
    deposit: {
      mode: (settingsRes.data?.deposit_mode ?? "off") as
        | "off"
        | "deposit"
        | "full",
      percent: settingsRes.data?.deposit_percent ?? 0,
      paymentsEnabled: settingsRes.data?.payments_enabled ?? false,
    },
  };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ slotId: string }>;
}) {
  const { slotId } = await params;
  const data = await loadSlot(slotId);
  if (!data) notFound();

  const requiresAddress = data.location.type === "area";
  const isFull = data.remaining <= 0;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
      <FadeIn>
        <nav aria-label="Breadcrumb" className="text-sm text-emerald-800 mb-4">
          <Link
            href={`/locations/${data.location.slug}`}
            className="hover:text-emerald-900 underline underline-offset-4"
          >
            {data.location.name}
          </Link>{" "}
          / <span aria-current="page">Book</span>
        </nav>

        <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-[0.18em]">
          Your booking
        </p>
        <h1
          className="mt-2 text-4xl sm:text-5xl leading-[1.05] text-stone-900"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Almost there.
        </h1>
      </FadeIn>

      <FadeIn delay={0.05}>
        <section className="mt-8 rounded-3xl border border-emerald-900/10 bg-emerald-50 p-6">
          <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-[0.18em]">
            Your slot
          </p>
          <p
            className="mt-3 text-2xl text-stone-900"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {formatDateLondon(data.date.service_date)}
          </p>
          <p className="mt-1 text-lg text-stone-700 tabular-nums">
            {formatTime(data.slot.start_time)}–{formatTime(data.slot.end_time)}
          </p>
          <p className="mt-3 text-sm text-stone-600">
            {data.location.name}
            {data.location.address ? ` · ${data.location.address}` : ""}
          </p>
        </section>
      </FadeIn>

      {isFull ? (
        <FadeIn delay={0.1}>
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-lg font-medium text-stone-900">
              This slot just filled up
            </p>
            <p className="mt-2 text-sm text-stone-600">
              Please pick another slot for this date or the next one available.
            </p>
            <Link
              href={`/locations/${data.location.slug}`}
              className="mt-4 inline-flex items-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 shadow-sm transition-colors"
            >
              ← Back to available slots
            </Link>
          </div>
        </FadeIn>
      ) : (
        <FadeIn delay={0.1}>
          <div className="mt-8">
            <BookingForm
              slotId={data.slot.id}
              services={data.services}
              requiresAddress={requiresAddress}
              areaHint={
                requiresAddress
                  ? data.location.address ?? data.location.name
                  : null
              }
              depositMode={data.deposit.mode}
              depositPercent={data.deposit.percent}
              paymentsEnabled={data.deposit.paymentsEnabled}
            />
          </div>
        </FadeIn>
      )}
    </div>
  );
}
