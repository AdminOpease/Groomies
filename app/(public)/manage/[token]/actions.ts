"use server";

import { revalidatePath } from "next/cache";
import { getSupabasePublic } from "@/lib/supabase/public";

export type CancelResult = {
  ok: boolean;
  message?: string;
  refundEligible?: boolean;
};

export async function cancelBooking(
  token: string,
  _prev: CancelResult | null
): Promise<CancelResult> {
  const supabase = getSupabasePublic();
  const { data, error } = await supabase.rpc("cancel_booking_by_token", {
    p_token: token,
  });

  if (error) {
    if (error.message.includes("ALREADY_CANCELLED")) {
      return { ok: false, message: "This booking is already cancelled." };
    }
    if (error.message.includes("BOOKING_NOT_FOUND")) {
      return {
        ok: false,
        message: "We couldn't find this booking. The link may be expired.",
      };
    }
    if (error.message.includes("ALREADY_EXPIRED")) {
      return { ok: false, message: "This booking already expired." };
    }
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  const result = data as { ok: boolean; refund_eligible: boolean } | null;
  revalidatePath(`/manage/${token}`);

  return {
    ok: true,
    refundEligible: result?.refund_eligible ?? false,
  };
}
