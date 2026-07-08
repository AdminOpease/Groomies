"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  sendConfirmationEmail,
  sendOwnerNotification,
} from "@/lib/email";

export type ManualBookingState = { ok: boolean; message?: string };

const nullIfBlank = (v: FormDataEntryValue | null): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length === 0 ? null : s;
};

const required = (v: FormDataEntryValue | null, field: string): string => {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length === 0) throw new Error(`${field} is required.`);
  return s;
};

export async function createManualBooking(
  slotId: string,
  _prev: ManualBookingState,
  formData: FormData
): Promise<ManualBookingState> {
  const supabase = await getSupabaseServer();

  let payload;
  try {
    payload = {
      p_time_slot_id: slotId,
      p_service_id: nullIfBlank(formData.get("service_id")),
      p_customer_name: required(formData.get("customer_name"), "Customer name"),
      p_customer_email: required(formData.get("customer_email"), "Email"),
      p_customer_phone: required(formData.get("customer_phone"), "Phone"),
      p_pet_name: required(formData.get("pet_name"), "Pet name"),
      p_pet_species: nullIfBlank(formData.get("pet_species")),
      p_pet_breed: nullIfBlank(formData.get("pet_breed")),
      p_service_address: nullIfBlank(formData.get("service_address")),
      p_notes: nullIfBlank(formData.get("notes")),
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const { data, error } = await supabase.rpc("admin_create_booking", payload);
  if (error) {
    if (error.message.includes("SLOT_FULL")) {
      return { ok: false, message: "That slot is now full. Pick another." };
    }
    if (error.message.includes("PER_DAY_CAP_REACHED")) {
      return {
        ok: false,
        message: "That day is at its per-day cap. Pick another slot.",
      };
    }
    if (error.message.includes("SLOT_NOT_BOOKABLE")) {
      return {
        ok: false,
        message: "That slot is in the past.",
      };
    }
    if (error.message.includes("STAFF_ONLY")) {
      return {
        ok: false,
        message: "You need to be signed in as staff to add a manual booking.",
      };
    }
    return { ok: false, message: error.message };
  }

  const result = data as { booking_id: string; booking_reference: string };

  // Grab the manage_token to build the confirmation email link. Best-effort —
  // never fails the booking.
  try {
    const { data: bookingRow } = await supabase
      .from("bookings")
      .select("manage_token")
      .eq("id", result.booking_id)
      .single();

    if (bookingRow?.manage_token) {
      await Promise.allSettled([
        sendConfirmationEmail(
          bookingRow.manage_token as string,
          payload.p_customer_email
        ),
        sendOwnerNotification(result.booking_reference),
      ]);
    }
  } catch {
    // swallow — the booking is already committed
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/locations/[id]/dates", "page");
  redirect(`/admin/bookings/${result.booking_id}`);
}
