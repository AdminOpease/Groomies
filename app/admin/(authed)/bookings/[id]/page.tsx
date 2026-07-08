import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { formatDateLondon, formatTime } from "@/lib/format";
import { StatusActions } from "./_components/StatusActions";
import { MoveBooking } from "./_components/MoveBooking";

export const dynamic = "force-dynamic";

type BookingDetail = {
  id: string;
  booking_reference: string;
  status: string;
  source: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pet_name: string;
  pet_species: string | null;
  pet_breed: string | null;
  notes: string | null;
  service_address: string | null;
  consent_given_at: string;
  created_at: string;
  cancelled_at: string | null;
  payment_status: string | null;
  amount_paid_cents: number | null;
  service: { name: string; price_cents: number; duration_minutes: number } | null;
  time_slot: {
    id: string;
    start_time: string;
    end_time: string;
    location_date: {
      service_date: string;
      location: { name: string; type: string; address: string | null };
    };
  };
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServer();

  const { data: raw, error } = await supabase
    .from("bookings")
    .select(
      `
      id, booking_reference, status, source, customer_name, customer_email,
      customer_phone, pet_name, pet_species, pet_breed, notes, service_address,
      consent_given_at, created_at, cancelled_at, payment_status, amount_paid_cents,
      service:services(name, price_cents, duration_minutes),
      time_slot:time_slots!inner(
        id, start_time, end_time,
        location_date:location_dates!inner(
          service_date,
          location:locations!inner(name, type, address)
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !raw) notFound();
  const b = raw as unknown as BookingDetail;

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-stone-500">
        <Link
          href="/admin/bookings"
          className="hover:text-stone-800 underline underline-offset-2"
        >
          Bookings
        </Link>{" "}
        / <span aria-current="page">{b.booking_reference}</span>
      </nav>

      <div className="flex flex-wrap items-baseline gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight font-mono">
          {b.booking_reference}
        </h1>
        <StatusBadge status={b.status} />
        {b.source === "manual" ? (
          <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-100 text-stone-600 text-xs font-medium px-2 py-0.5 uppercase tracking-wide">
            Phone booking
          </span>
        ) : null}
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white shadow-sm p-5 sm:p-6 space-y-5">
        <Row label="When">
          <p className="font-medium text-stone-900">
            {formatDateLondon(b.time_slot.location_date.service_date)}
          </p>
          <p className="text-stone-600 text-sm tabular-nums">
            {formatTime(b.time_slot.start_time)}–{formatTime(b.time_slot.end_time)}
          </p>
        </Row>
        <Row label="Where">
          <p className="font-medium text-stone-900">
            {b.time_slot.location_date.location.name}
          </p>
          <p className="text-stone-600 text-sm">
            {b.service_address ??
              b.time_slot.location_date.location.address ??
              "—"}
          </p>
        </Row>
        <Row label="Customer">
          <p className="font-medium text-stone-900">{b.customer_name}</p>
          <p className="text-stone-600 text-sm">
            <a
              href={`mailto:${b.customer_email}`}
              className="hover:text-stone-900 underline underline-offset-2"
            >
              {b.customer_email}
            </a>
          </p>
          <p className="text-stone-600 text-sm">
            <a
              href={`tel:${b.customer_phone.replace(/\s+/g, "")}`}
              className="hover:text-stone-900"
            >
              {b.customer_phone}
            </a>
          </p>
        </Row>
        <Row label="Pet">
          <p className="font-medium text-stone-900">{b.pet_name}</p>
          {b.pet_breed || b.pet_species ? (
            <p className="text-stone-600 text-sm capitalize">
              {[b.pet_species, b.pet_breed].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </Row>
        {b.service ? (
          <Row label="Service">
            <p className="font-medium text-stone-900">{b.service.name}</p>
            <p className="text-stone-600 text-sm">
              {b.service.duration_minutes} min · £
              {(b.service.price_cents / 100).toFixed(2)}
            </p>
          </Row>
        ) : null}
        {b.notes ? (
          <Row label="Notes">
            <p className="text-stone-700 text-sm whitespace-pre-wrap">
              {b.notes}
            </p>
          </Row>
        ) : null}
        <Row label="Booked at">
          <p className="text-stone-700 text-sm">
            {new Date(b.created_at).toLocaleString("en-GB", {
              timeZone: "Europe/London",
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </Row>
      </section>

      <StatusActions bookingId={b.id} currentStatus={b.status} />
      <MoveBooking
        bookingId={b.id}
        currentSlotId={b.time_slot.id}
        currentStatus={b.status}
      />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] sm:grid-cols-[7rem_1fr] gap-3 sm:gap-4">
      <div className="text-xs text-stone-500 uppercase tracking-wider pt-0.5">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    confirmed: {
      label: "Confirmed",
      cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
    },
    pending: {
      label: "Pending",
      cls: "bg-amber-50 text-amber-800 border-amber-200",
    },
    cancelled: {
      label: "Cancelled",
      cls: "bg-stone-100 text-stone-600 border-stone-200",
    },
    expired: {
      label: "Expired",
      cls: "bg-stone-100 text-stone-500 border-stone-200",
    },
    completed: {
      label: "Completed",
      cls: "bg-blue-50 text-blue-800 border-blue-200",
    },
    no_show: {
      label: "No-show",
      cls: "bg-red-50 text-red-800 border-red-200",
    },
  };
  const c = cfg[status] ?? cfg.confirmed;
  return (
    <span
      className={`inline-flex items-center rounded-full border ${c.cls} text-xs font-medium px-2.5 py-1`}
    >
      {c.label}
    </span>
  );
}
