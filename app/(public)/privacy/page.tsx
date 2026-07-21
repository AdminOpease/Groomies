import type { Metadata } from "next";
import { getSupabasePublic } from "@/lib/supabase/public";
import { FadeIn } from "../_components/FadeIn";
import { PolicyCover } from "../_components/PolicyCover";

export const revalidate = 86400;

/**
 * Flip to true to publish the drafted policy below.
 *
 * A flag rather than deleting the draft: the text is written and only needs
 * checking, so it stays in this file ready to go. Noindex stays on while
 * covered — an indexed "coming soon" legal page is worse than no result.
 */
const PUBLISHED = false;

export const metadata: Metadata = {
  title: "Privacy policy",
  ...(PUBLISHED ? {} : { robots: { index: false, follow: true } }),
};

async function getContext() {
  const supabase = getSupabasePublic();
  const [pub, settings] = await Promise.all([
    supabase
      .from("public_business_settings")
      .select("business_name, contact_email")
      .single(),
    supabase
      .from("business_settings")
      .select("retention_months")
      .eq("id", true)
      .single(),
  ]);
  return {
    businessName: pub.data?.business_name ?? "Groomies",
    contactEmail: pub.data?.contact_email ?? null,
    retentionMonths: settings.data?.retention_months ?? 12,
  };
}

export default async function PrivacyPage() {
  const c = await getContext();

  if (!PUBLISHED) {
    return (
      <PolicyCover
        title="Privacy policy"
        blurb="It will set out what we collect when you book, how long we keep it, who it's shared with, and how to ask for your data to be deleted."
        contactEmail={c.contactEmail}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-14 sm:py-20">
      <FadeIn>
        <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
          Legal
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight text-stone-900">
          Privacy policy
        </h1>
        <p className="mt-4 text-sm text-stone-500">
          Last updated when this site was published. If you spot anything that
          isn't right, get in touch.
        </p>
      </FadeIn>

      <FadeIn delay={0.05}>
        <StarterNote />
      </FadeIn>

      <div className="mt-10 space-y-10">
        <Section title="1. Who we are">
          <p>
            {c.businessName} operates a mobile pet-grooming service. When we
            mention "we," "us," or "our," we mean {c.businessName}. When we say
            "you," we mean you — the customer visiting our website or booking a
            groom.
          </p>
        </Section>

        <Section title="2. What we collect and why">
          <p>
            When you book a groom, we collect only what we need to run that
            booking:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your name, email, and phone number (to contact you)</li>
            <li>Your pet's name, species, and breed (to prepare the groom)</li>
            <li>
              Your address — only when we're coming to you (service-area
              bookings)
            </li>
            <li>Any notes you add to the booking</li>
            <li>Booking history for record-keeping</li>
          </ul>
          <p>
            We don't sell your data. We don't use it for marketing without a
            separate opt-in. We don't track you across other websites.
          </p>
        </Section>

        <Section title="3. Third parties">
          <p>
            To run the service we share data with a small set of processors,
            each of which is subject to strict data-protection standards:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Supabase</strong> — hosts our database (UK/EU region)
            </li>
            <li>
              <strong>Cloudflare</strong> — serves this website and protects it
              from abuse
            </li>
            <li>
              <strong>Resend</strong> — sends your booking confirmation and any
              service-related emails
            </li>
            <li>
              <strong>Stripe</strong> — processes payments if you're paying a
              deposit or the full price (we never see your card details)
            </li>
          </ul>
        </Section>

        <Section title="4. How long we keep your data">
          <p>
            We anonymise or delete booking data after{" "}
            <strong>{c.retentionMonths} months</strong>. You can ask us to
            delete your data sooner (see section 6).
          </p>
        </Section>

        <Section title="5. Cookies and analytics">
          <p>
            We use only strictly necessary cookies to run the booking flow. We
            don't run cross-site tracking or advertising cookies, so we don't
            need to show you a cookie banner.
          </p>
        </Section>

        <Section title="6. Your rights">
          <p>Under UK GDPR you have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Ask what data we hold about you</li>
            <li>Correct anything that's wrong</li>
            <li>
              Ask us to delete your data (right to erasure) — we'll do it as
              soon as we can, and always within 30 days
            </li>
            <li>Object to how we're using it</li>
          </ul>
          <p>
            To exercise any of these, email{" "}
            {c.contactEmail ? (
              <a
                href={`mailto:${c.contactEmail}`}
                className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
              >
                {c.contactEmail}
              </a>
            ) : (
              "our contact address (see the footer)"
            )}
            .
          </p>
        </Section>

        <Section title="7. Complaints">
          <p>
            If you're unhappy with how we've handled your data, you can complain
            to the UK Information Commissioner's Office (ICO) at{" "}
            <a
              href="https://ico.org.uk"
              className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
              target="_blank"
              rel="noopener"
            >
              ico.org.uk
            </a>
            . We'd appreciate the chance to fix it first — please talk to us.
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

function StarterNote() {
  return (
    <p className="mt-6 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      <strong>Starting template.</strong> This policy is a reasonable UK-focused
      starting point — please have it reviewed by a solicitor familiar with
      your specific processing before public launch.
    </p>
  );
}
