import type { Metadata } from "next";
import Link from "next/link";
import { getSupabasePublic } from "@/lib/supabase/public";
import { FadeIn } from "../_components/FadeIn";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Terms of service",
};

async function getContext() {
  const supabase = getSupabasePublic();
  const { data } = await supabase
    .from("public_business_settings")
    .select("business_name, contact_email")
    .single();
  return {
    businessName: data?.business_name ?? "Groomies",
    contactEmail: data?.contact_email ?? null,
  };
}

export default async function TermsPage() {
  const c = await getContext();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-14 sm:py-20">
      <FadeIn>
        <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
          Legal
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight text-stone-900">
          Terms of service
        </h1>
        <p className="mt-4 text-sm text-stone-500">
          The rules of engagement when you book a groom with us.
        </p>
      </FadeIn>

      <FadeIn delay={0.05}>
        <p className="mt-6 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <strong>Starting template.</strong> Please have a solicitor review
          before public launch.
        </p>
      </FadeIn>

      <div className="mt-10 space-y-10">
        <Section title="1. Booking">
          <p>
            By submitting a booking, you agree that all the details you've
            provided are accurate and that you're the person responsible for the
            animal being groomed. You are 18 or over.
          </p>
        </Section>
        <Section title="2. Our service">
          <p>
            {c.businessName} provides mobile pet-grooming services at scheduled
            times and locations. We'll do our best to arrive within your booked
            window, but small delays can happen — traffic, previous appointment
            overruns, and so on. We'll let you know as soon as we can if we're
            running late.
          </p>
        </Section>
        <Section title="3. Your pet's welfare">
          <p>
            You confirm that your pet is fit to be groomed and that you've told
            us about any behavioural, medical, or coat conditions we should
            know. We reserve the right to stop the groom if it becomes unsafe
            for the animal or for our team, in which case we'll charge for time
            spent and equipment used.
          </p>
        </Section>
        <Section title="4. Cancellations and refunds">
          <p>
            See our{" "}
            <Link
              href="/refund"
              className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
            >
              refund policy
            </Link>{" "}
            for the specifics.
          </p>
        </Section>
        <Section title="5. Liability">
          <p>
            We take reasonable care while grooming your pet. Where the law
            allows, our liability is limited to a refund of the fee you paid
            for the affected booking. Nothing in these terms limits liability
            for death or personal injury caused by negligence, or any other
            liability that cannot be excluded by law.
          </p>
        </Section>
        <Section title="6. Governing law">
          <p>
            These terms are governed by the laws of England and Wales. Any
            disputes will be handled by the English courts.
          </p>
        </Section>
        <Section title="7. Contact">
          <p>
            Questions?{" "}
            {c.contactEmail ? (
              <a
                href={`mailto:${c.contactEmail}`}
                className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
              >
                {c.contactEmail}
              </a>
            ) : (
              "See the contact details in the footer."
            )}
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
