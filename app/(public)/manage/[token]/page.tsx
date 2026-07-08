import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabasePublic } from "@/lib/supabase/public";
import { formatDateLondon, formatTime } from "@/lib/format";
import { FadeIn } from "../../_components/FadeIn";
import { CancelButton } from "./_components/CancelButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage your booking",
  robots: { index: false, follow: false },
};

type BookingDetails = {
  booking_reference: string;
  status: "pending" | "confirmed" | "cancelled" | "expired";
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pet_name: string;
  pet_species: string | null;
  pet_breed: string | null;
  notes: string | null;
  service_address: string | null;
  service?: {
    name: string;
    duration_minutes: number;
    price_cents: number;
  } | null;
  location: {
    name: string;
    type: string;
    address: string | null;
    description: string | null;
  };
  slot: {
    service_date: string;
    start_time: string;
    end_time: string;
    starts_at: string;
  };
  payment_status: string | null;
  amount_paid_cents: number | null;
  eligible_for_refund: boolean;
  refund_cutoff_hours: number;
};

export default async function ManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ just_booked?: string }>;
}) {
  const { token } = await params;
  const { just_booked } = await searchParams;

  const supabase = getSupabasePublic();
  const { data, error } = await supabase.rpc("get_booking_by_token", {
    p_token: token,
  });
  if (error || !data) notFound();

  const b = data as BookingDetails;
  const cancelled = b.status === "cancelled" || b.status === "expired";
  const paymentTaken =
    b.payment_status === "paid" && (b.amount_paid_cents ?? 0) > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-14">
      {just_booked && !cancelled ? (
        <FadeIn>
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 mb-6 text-emerald-900"
          >
            <p className="font-semibold">You're booked in.</p>
            <p className="mt-1 text-sm">
              A confirmation is on its way to <strong>{b.customer_email}</strong>.
              Save this page — it's how you manage or cancel later.
            </p>
          </div>
        </FadeIn>
      ) : null}

      <FadeIn>
        <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
          Your booking
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900 font-mono">
            {b.booking_reference}
          </h1>
          <StatusBadge status={b.status} />
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <section className="mt-8 rounded-2xl border border-stone-200 bg-white shadow-sm p-6 sm:p-7 space-y-5">
          <Row label="When">
            <p className="font-medium text-stone-900">
              {formatDateLondon(b.slot.service_date)}
            </p>
            <p className="text-stone-600 text-sm tabular-nums">
              {formatTime(b.slot.start_time)}–{formatTime(b.slot.end_time)}
            </p>
          </Row>
          <Row label="Where">
            <p className="font-medium text-stone-900">{b.location.name}</p>
            <p className="text-stone-600 text-sm">
              {b.service_address ??
                b.location.address ??
                b.location.description ??
                "—"}
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
                About {b.service.duration_minutes} min · £
                {(b.service.price_cents / 100).toFixed(2)}
              </p>
            </Row>
          ) : null}
          <Row label="Contact">
            <p className="font-medium text-stone-900">{b.customer_name}</p>
            <p className="text-stone-600 text-sm">
              {b.customer_email} · {b.customer_phone}
            </p>
          </Row>
          {b.notes ? (
            <Row label="Notes">
              <p className="text-stone-700 text-sm whitespace-pre-wrap">
                {b.notes}
              </p>
            </Row>
          ) : null}
        </section>
      </FadeIn>

      {cancelled ? (
        <FadeIn delay={0.1}>
          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
            This booking has been {b.status}. If you'd like a fresh slot,{" "}
            <Link
              href="/locations"
              className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
            >
              browse the schedule
            </Link>
            .
          </div>
        </FadeIn>
      ) : (
        <FadeIn delay={0.1}>
          <div className="mt-6">
            <CancelButton
              token={token}
              refundCutoffHours={b.refund_cutoff_hours}
              eligibleForRefund={b.eligible_for_refund}
              paymentTaken={paymentTaken}
            />
          </div>
        </FadeIn>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] sm:grid-cols-[8rem_1fr] gap-3 sm:gap-4">
      <div className="text-xs text-stone-500 uppercase tracking-wider pt-0.5">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    confirmed: {
      label: "Confirmed",
      className:
        "bg-emerald-50 border-emerald-200 text-emerald-800",
    },
    pending: {
      label: "Awaiting payment",
      className: "bg-amber-50 border-amber-200 text-amber-800",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-stone-100 border-stone-200 text-stone-600",
    },
    expired: {
      label: "Expired",
      className: "bg-stone-100 border-stone-200 text-stone-600",
    },
  };
  const c = config[status] ?? config.confirmed;
  return (
    <span
      className={`inline-flex items-center rounded-full border ${c.className} text-xs font-medium px-2.5 py-1`}
    >
      {c.label}
    </span>
  );
}
