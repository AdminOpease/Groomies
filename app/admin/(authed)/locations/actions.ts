"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

export type LocationFormState = {
  ok: boolean;
  message?: string;
  affectedBookings?: number;
};

const emptyState: LocationFormState = { ok: true };

function nullIfBlank(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length === 0 ? null : s;
}

/**
 * "LU, mk , AL" -> ["LU","MK","AL"]
 *
 * Area codes only (the letters). Anything with digits is dropped rather than
 * stored: a district like "LU5" would silently fence out half the town, and a
 * half-working geo-fence is worse than none.
 */
function parsePostcodeAreas(v: FormDataEntryValue | null): string[] {
  if (typeof v !== "string") return [];
  return Array.from(
    new Set(
      v
        .split(/[,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z]{1,2}$/.test(s))
    )
  );
}

function parseLocationForm(formData: FormData) {
  const type = formData.get("type") === "stop" ? "stop" : "area";
  const is_active = formData.get("is_active") === "on";
  return {
    name: (formData.get("name") ?? "").toString().trim(),
    type,
    address: nullIfBlank(formData.get("address")),
    description: nullIfBlank(formData.get("description")),
    postcode_areas: parsePostcodeAreas(formData.get("postcode_areas")),
    is_active,
  };
}

export async function createLocation(
  _prev: LocationFormState,
  formData: FormData
): Promise<LocationFormState> {
  const supabase = await getSupabaseServer();
  const payload = parseLocationForm(formData);

  if (!payload.name) {
    return { ok: false, message: "Name is required." };
  }

  const { data, error } = await supabase
    .from("locations")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/locations");
  redirect(`/admin/locations/${data.id}?created=1`);
}

export async function updateLocation(
  id: string,
  _prev: LocationFormState,
  formData: FormData
): Promise<LocationFormState> {
  const supabase = await getSupabaseServer();
  const payload = parseLocationForm(formData);

  if (!payload.name) {
    return { ok: false, message: "Name is required." };
  }

  const { error } = await supabase
    .from("locations")
    .update(payload)
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/locations");
  revalidatePath(`/admin/locations/${id}`);
  return { ok: true, message: "Saved." };
}

/**
 * Deletes a location. Refuses to delete if any pending/confirmed bookings
 * exist for its slots — the spec requires cancel+notify before removal.
 *
 * For Phase 3 we surface the count of affected bookings and suggest
 * deactivating instead. Bulk-cancel-with-notify lands with the bookings UI
 * (Phase 6+).
 */
export async function deleteLocation(
  id: string,
  _prev: LocationFormState,
  _formData: FormData
): Promise<LocationFormState> {
  const supabase = await getSupabaseServer();

  const { data: dates, error: datesErr } = await supabase
    .from("location_dates")
    .select("id")
    .eq("location_id", id);

  if (datesErr) return { ok: false, message: datesErr.message };

  const dateIds = (dates ?? []).map((d) => d.id);

  let activeBookings = 0;
  if (dateIds.length > 0) {
    const { data: slots, error: slotsErr } = await supabase
      .from("time_slots")
      .select("id")
      .in("location_date_id", dateIds);
    if (slotsErr) return { ok: false, message: slotsErr.message };

    const slotIds = (slots ?? []).map((s) => s.id);

    if (slotIds.length > 0) {
      const { count, error: bkErr } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .in("time_slot_id", slotIds)
        .in("status", ["pending", "confirmed"]);
      if (bkErr) return { ok: false, message: bkErr.message };
      activeBookings = count ?? 0;
    }
  }

  if (activeBookings > 0) {
    return {
      ok: false,
      affectedBookings: activeBookings,
      message:
        `${activeBookings} active booking${activeBookings === 1 ? "" : "s"} ` +
        `would be affected. Cancel + notify those customers first, or deactivate ` +
        `this location to hide it from new bookings without cancelling existing ones.`,
    };
  }

  const { error } = await supabase.from("locations").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/locations");
  redirect("/admin/locations?deleted=1");
}

export async function toggleLocationActive(id: string, isActive: boolean) {
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("locations")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/locations");
  revalidatePath(`/admin/locations/${id}`);
}
