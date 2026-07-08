"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";

export type AdminBookingState = { ok: boolean; message?: string };

const ok: AdminBookingState = { ok: true };

async function updateStatus(
  bookingId: string,
  status: "cancelled" | "completed" | "no_show"
): Promise<AdminBookingState> {
  const supabase = await getSupabaseServer();
  const payload: Record<string, unknown> = { status };
  if (status === "cancelled") payload.cancelled_at = new Date().toISOString();

  const { error } = await supabase
    .from("bookings")
    .update(payload)
    .eq("id", bookingId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  return ok;
}

export async function adminCancelBooking(bookingId: string) {
  return updateStatus(bookingId, "cancelled");
}

export async function markBookingCompleted(bookingId: string) {
  return updateStatus(bookingId, "completed");
}

export async function markBookingNoShow(bookingId: string) {
  return updateStatus(bookingId, "no_show");
}

export async function anonymiseBooking(
  bookingId: string
): Promise<AdminBookingState> {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("anonymise_booking", {
    p_booking_id: bookingId,
  });
  if (error) {
    if (error.message.includes("BOOKING_NOT_FOUND")) {
      return { ok: false, message: "This booking no longer exists." };
    }
    return { ok: false, message: error.message };
  }
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  return ok;
}

export async function moveBooking(
  bookingId: string,
  newSlotId: string
): Promise<AdminBookingState> {
  if (!newSlotId) {
    return { ok: false, message: "Pick a slot to move to." };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.rpc("admin_move_booking", {
    p_booking_id: bookingId,
    p_new_slot_id: newSlotId,
  });
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
        message: "Target slot is in the past or its location is deactivated.",
      };
    }
    if (error.message.includes("BOOKING_NOT_MOVABLE")) {
      return {
        ok: false,
        message: "This booking is already cancelled/completed and can't be moved.",
      };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  return ok;
}
