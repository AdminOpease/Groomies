import type { Metadata } from "next";
import { getSupabasePublic } from "@/lib/supabase/public";
import { FadeIn } from "../_components/FadeIn";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Refund and cancellation policy",
};

async function getContext() {
  const supabase = getSupabasePublic();
  const [pub, settings] = await Promise.all([
    supabase
      .from("public_business_settings")
      .select("business_name, contact_email, payments_enabled")
      .single(),
    supabase
      .from("business_settings")
      .select("refund_cutoff_hours")
      .eq("id", true)
      .single(),
  ]);
  return {
    businessName: pub.data?.business_name ?? "Groomies",
    contactEmail: pub.data?.contact_email ?? null,
    paymentsEnabled: pub.data?.payments_enabled ?? false,
    refundCutoffHours: settings.data?.refund_cutoff_hours ?? 48,
  };
}

export default async function RefundPage() {
  const c = await getContext();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-14 sm:py-20">
      <FadeIn>
        <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
          Legal
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight text-stone-900">
          Refund and cancellation policy
        </h1>
      </FadeIn>

      <FadeIn delay={0.05}>
        <p className="mt-6 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <strong>Starting template.</strong> Please have a solicitor review
          before public launch.
        </p>
      </FadeIn>

      <div className="mt-10 space-y-10">
        <Section title="1. Cancelling a booking">
          <p>
            You can cancel any booking using the secure link in your booking
            confirmation email. The link works without any account — no login
            needed.
          </p>
          <p>
            If you can't find the link, get in touch{" "}
            {c.contactEmail ? (
              <>
                at{" "}
                <a
                  href={`mailto:${c.contactEmail}`}
                  className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                >
                  {c.contactEmail}
                </a>{" "}
              </>
            ) : (
              "using the contact details in the footer "
            )}
            and we'll cancel it for you.
          </p>
        </Section>
        <Section title="2. Refunds on deposits">
          {c.paymentsEnabled ? (
            <>
              <p>
                We take a small deposit to reserve your slot. The refund policy
                depends on when you cancel:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>
                    More than {c.refundCutoffHours} hours before your booking
                  </strong>{" "}
                  — full refund, automatic
                </li>
                <li>
                  <strong>
                    Within {c.refundCutoffHours} hours of your booking
                  </strong>{" "}
                  — non-refundable
                </li>
              </ul>
              <p>
                Refunds are issued to the card you paid with. Allow a few
                business days for the money to appear on your statement.
              </p>
            </>
          ) : (
            <p>
              We don't currently take deposits at booking time, so there's
              nothing to refund on cancellation. Just cancel using your secure
              link and the slot goes back to available for others.
            </p>
          )}
        </Section>
        <Section title="3. If we cancel">
          <p>
            If we have to cancel your booking — very rare, but weather or
            unexpected van issues can happen — we'll refund any deposit paid in
            full and reach out to reschedule.
          </p>
        </Section>
        <Section title="4. No-shows">
          <p>
            If you're not there when we arrive at the agreed time and address,
            we treat the appointment as a no-show. Deposits paid are not
            refundable in this case. Please tell us as soon as you know there's
            a problem so we can help work something out.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-stone-900 mb-3">{title}</h2>
      <div className="space-y-3 text-stone-700 leading-relaxed">{children}</div>
    </section>
  );
}
