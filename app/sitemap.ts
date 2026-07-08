import type { MetadataRoute } from "next";
import { getSupabasePublic } from "@/lib/supabase/public";

export const revalidate = 3600;

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const staticRoutes = ["", "/services", "/locations", "/about", "/contact"].map(
    (p) => ({
      url: `${base}${p || "/"}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: p === "" ? 1.0 : 0.7,
    })
  );

  let locationRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = getSupabasePublic();
    const { data } = await supabase
      .from("locations")
      .select("slug, updated_at")
      .eq("is_active", true);
    locationRoutes = (data ?? []).map((l) => ({
      url: `${base}/locations/${l.slug}`,
      lastModified: new Date(l.updated_at ?? now),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // If Supabase is unreachable at build, ship just the static routes.
  }

  return [...staticRoutes, ...locationRoutes];
}
