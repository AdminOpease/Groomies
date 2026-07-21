"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";

export type SettingsState = { ok: boolean; message?: string };

const nullIfBlank = (v: FormDataEntryValue | null): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length === 0 ? null : s;
};

const clampInt = (
  v: FormDataEntryValue | null,
  min: number,
  max: number,
  fallback: number
): number => {
  const n = Number((v ?? fallback).toString().trim());
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
};

export async function updateBusinessSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const supabase = await getSupabaseServer();

  const business_name = nullIfBlank(formData.get("business_name")) ?? "Groomies";
  const deposit_mode = ((formData.get("deposit_mode") ?? "off").toString());
  if (!["off", "deposit", "full"].includes(deposit_mode)) {
    return { ok: false, message: "Invalid deposit mode." };
  }

  const payload = {
    business_name,
    logo_url: nullIfBlank(formData.get("logo_url")),
    contact_email: nullIfBlank(formData.get("contact_email")),
    contact_phone: nullIfBlank(formData.get("contact_phone")),
    about_blurb: nullIfBlank(formData.get("about_blurb")),
    primary_brand_color: nullIfBlank(formData.get("primary_brand_color")),
    default_service_area_copy: nullIfBlank(
      formData.get("default_service_area_copy")
    ),
    owner_notification_email: nullIfBlank(
      formData.get("owner_notification_email")
    ),
    technical_billing_alert_email: nullIfBlank(
      formData.get("technical_billing_alert_email")
    ),
    payments_enabled: formData.get("payments_enabled") === "on",
    deposit_mode,
    deposit_percent: clampInt(formData.get("deposit_percent"), 0, 100, 30),
    retention_months: clampInt(formData.get("retention_months"), 1, 60, 12),
    refund_cutoff_hours: clampInt(
      formData.get("refund_cutoff_hours"),
      0,
      168,
      48
    ),
    hold_duration_minutes: clampInt(
      formData.get("hold_duration_minutes"),
      5,
      60,
      15
    ),
    show_slot_counts: formData.get("show_slot_counts") === "on",
    bookings_enabled: formData.get("bookings_enabled") === "on",
  };

  const { error } = await supabase
    .from("business_settings")
    .update(payload)
    .eq("id", true);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout"); // public site header/footer read these
  return { ok: true, message: "Saved." };
}
