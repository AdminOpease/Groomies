import { getSupabasePublic } from "@/lib/supabase/public";
import { Header } from "./_components/Header";
import { Footer } from "./_components/Footer";

export const revalidate = 3600; // Rebuild these pages hourly.

async function getPublicSettings() {
  const supabase = getSupabasePublic();
  const { data } = await supabase
    .from("public_business_settings")
    .select(
      "business_name, contact_email, contact_phone, social_links, primary_brand_color, about_blurb"
    )
    .single();
  return data ?? {
    business_name: "Groomies",
    contact_email: null,
    contact_phone: null,
    social_links: null,
    primary_brand_color: null,
    about_blurb: null,
  };
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getPublicSettings();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PetStore",
    name: settings.business_name,
    description:
      settings.about_blurb ??
      "Premium mobile pet grooming. Our vans travel to your area on scheduled days.",
    url: siteUrl(),
    telephone: settings.contact_phone ?? undefined,
    email: settings.contact_email ?? undefined,
  };

  return (
    <>
      <Header businessName={settings.business_name} />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="flex-1">{children}</main>
      <Footer
        settings={{
          business_name: settings.business_name,
          contact_email: settings.contact_email,
          contact_phone: settings.contact_phone,
          social_links: settings.social_links as Record<string, unknown> | null,
        }}
      />
    </>
  );
}
