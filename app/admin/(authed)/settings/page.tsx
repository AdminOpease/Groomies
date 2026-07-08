import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { SettingsForm } from "./_components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    redirect("/admin");
  }

  const { data: settings, error } = await supabase
    .from("business_settings")
    .select(
      "business_name, logo_url, contact_email, contact_phone, about_blurb, primary_brand_color, default_service_area_copy, owner_notification_email, technical_billing_alert_email, payments_enabled, deposit_mode, retention_months, refund_cutoff_hours, hold_duration_minutes, show_slot_counts"
    )
    .eq("id", true)
    .single();

  if (error || !settings) {
    return (
      <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
        Failed to load business settings: {error?.message ?? "not found"}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        Business settings
      </h1>
      <p className="mt-1 text-sm text-stone-500 mb-8">
        Everything that shapes the public site, emails, and booking policy.
      </p>

      <SettingsForm settings={settings} />
    </div>
  );
}
