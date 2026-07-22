"use server";

import { redirect } from "next/navigation";
import { getSupabasePublic } from "@/lib/supabase/public";
import {
  sendConfirmationEmail,
  sendOwnerNotification,
} from "@/lib/email";
import { combineBreeds } from "@/lib/dog-breeds";
import { verifyTurnstile } from "@/lib/turnstile";

export type BookingValues = {
  service_id: string | null;
  service_variant_id: string | null;
  addon_service_ids: string[];
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  pet_name: string | null;
  pet_species: string | null;
  pet_breed: string | null;
  pet_breed_secondary: string | null;
  service_address: string | null;
  postcode: string | null;
  notes: string | null;
  consent: boolean;
};

export type BookingResult =
  | { ok: true }
  | { ok: false; message: string; code?: string; values?: BookingValues };

const nullIfBlank = (v: FormDataEntryValue | null): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length === 0 ? null : s;
};

const required = (v: string | null, field: string): string => {
  if (!v || v.trim().length === 0) throw new Error(`${field} is required.`);
  return v.trim();
};

// Map Postgres SQLSTATE from the book_slot RPC into customer-facing copy.
function friendlyError(rpcMessage: string): { message: string; code: string } {
  if (rpcMessage.includes("SLOT_FULL")) {
    return {
      code: "SLOT_FULL",
      message:
        "Sorry — that slot was just taken. Please pick another one and try again.",
    };
  }
  if (rpcMessage.includes("SLOT_NOT_BOOKABLE")) {
    return {
      code: "SLOT_NOT_BOOKABLE",
      message:
        "This slot isn't available anymore. It may have passed or the location was deactivated.",
    };
  }
  if (rpcMessage.includes("PER_DAY_CAP_REACHED")) {
    return {
      code: "PER_DAY_CAP_REACHED",
      message:
        "That day is fully booked across all slots. Please pick another date.",
    };
  }
  if (rpcMessage.includes("ADDRESS_REQUIRED")) {
    return {
      code: "ADDRESS_REQUIRED",
      message:
        "This location visits customer addresses — please add your address to the form.",
    };
  }
  if (rpcMessage.includes("CONSENT_REQUIRED")) {
    return {
      code: "CONSENT_REQUIRED",
      message: "Please tick the consent box to continue.",
    };
  }
  if (rpcMessage.includes("SLOT_NOT_FOUND")) {
    return {
      code: "SLOT_NOT_FOUND",
      message: "This slot no longer exists.",
    };
  }
  if (rpcMessage.includes("VARIANT_REQUIRED")) {
    return {
      code: "VARIANT_REQUIRED",
      message: "Please choose your dog's size for that service.",
    };
  }
  if (rpcMessage.includes("VARIANT_INVALID")) {
    return {
      code: "VARIANT_INVALID",
      message:
        "That size isn't available for the service you picked. Please choose again.",
    };
  }
  if (rpcMessage.includes("POSTCODE_OUT_OF_AREA")) {
    return {
      code: "POSTCODE_OUT_OF_AREA",
      message:
        "We're not covering that postcode on this date — we're in a different area. Try another date, or get in touch and we'll let you know when we're next nearby.",
    };
  }
  if (rpcMessage.includes("POSTCODE_REQUIRED")) {
    return {
      code: "POSTCODE_REQUIRED",
      message: "Please add your postcode so we can check we're covering you.",
    };
  }
  if (rpcMessage.includes("POSTCODE_INVALID")) {
    return {
      code: "POSTCODE_INVALID",
      message: "That doesn't look like a UK postcode — please check it.",
    };
  }
  if (rpcMessage.includes("ADDON_INVALID")) {
    return {
      code: "ADDON_INVALID",
      message:
        "One of the extras you picked isn't available any more. Please review your selection and try again.",
    };
  }
  return {
    code: "OTHER",
    message: "Something went wrong. Please try again.",
  };
}

export async function submitBooking(
  slotId: string,
  _prev: BookingResult | null,
  formData: FormData
): Promise<BookingResult> {
  // Honeypot — an off-screen field bots fill and humans (and password
  // managers) don't. Named to avoid autofill patterns.
  if (nullIfBlank(formData.get("hp_field"))) {
    return {
      ok: false,
      message: "Something looked off with your submission.",
    };
  }

  // Turnstile — the layer above the honeypot, which a headless browser driving
  // the real form would sail straight through. No-ops entirely until the keys
  // are set. Checked before any database work, so a rejected submission never
  // touches slot capacity. `cf-turnstile-response` is Cloudflare's fixed field
  // name, injected into the form by the widget script.
  const turnstile = await verifyTurnstile(
    nullIfBlank(formData.get("cf-turnstile-response"))
  );
  if (!turnstile.ok) {
    return {
      ok: false,
      code: "TURNSTILE_FAILED",
      message:
        "We couldn't verify that you're human. Please refresh the page and try again — or give us a call and we'll book you in.",
    };
  }

  // Capture what the user typed so we can echo it back on any error and
  // React 19's default form reset doesn't blank the fields.
  const values: BookingValues = {
    service_id: nullIfBlank(formData.get("service_id")),
    service_variant_id: nullIfBlank(formData.get("service_variant_id")),
    addon_service_ids: formData
      .getAll("addon_service_ids")
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0),
    customer_name: nullIfBlank(formData.get("customer_name")),
    customer_email: nullIfBlank(formData.get("customer_email")),
    customer_phone: nullIfBlank(formData.get("customer_phone")),
    pet_name: nullIfBlank(formData.get("pet_name")),
    pet_species: nullIfBlank(formData.get("pet_species")),
    pet_breed: nullIfBlank(formData.get("pet_breed")),
    pet_breed_secondary: nullIfBlank(formData.get("pet_breed_secondary")),
    service_address: nullIfBlank(formData.get("service_address")),
    postcode: nullIfBlank(formData.get("postcode")),
    notes: nullIfBlank(formData.get("notes")),
    consent: formData.get("consent") === "on",
  };

  let payload;
  try {
    payload = {
      p_time_slot_id: slotId,
      // Required now that "not sure yet" is gone — enforced here too, since
      // the browser's `required` is trivially bypassed.
      p_service_id: required(values.service_id, "Service"),
      // A size without a service is incoherent, and the RPC rejects it — so
      // drop it if the customer cleared the service.
      p_service_variant_id: values.service_id ? values.service_variant_id : null,
      // The RPC rejects the main service repeated as an extra, so filter it
      // out rather than letting a stale checkbox fail the whole booking.
      p_addon_service_ids: values.addon_service_ids.filter(
        (id) => id !== values.service_id
      ),
      p_customer_name: required(values.customer_name, "Your name"),
      p_customer_email: required(values.customer_email, "Email"),
      p_customer_phone: required(values.customer_phone, "Phone"),
      p_pet_name: required(values.pet_name, "Pet name"),
      p_pet_species: values.pet_species,
      // Stored as one readable value ("Cockapoo × Poodle"). Breed is
      // informational only, so this avoids changing the book_slot signature
      // — and a consistent separator keeps it parseable if that changes.
      p_pet_breed: combineBreeds(values.pet_breed, values.pet_breed_secondary),
      p_service_address: values.service_address,
      p_notes: values.notes,
      p_consent_given: values.consent,
      p_postcode: values.postcode,
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message, values };
  }

  const supabase = getSupabasePublic();
  const { data, error } = await supabase.rpc("book_slot", payload);

  if (error) {
    const friendly = friendlyError(error.message);
    return {
      ok: false,
      message: friendly.message,
      code: friendly.code,
      values,
    };
  }

  const booking = data as {
    booking_id: string;
    booking_reference: string;
    manage_token: string;
    status: "pending" | "confirmed";
    hold_expires_at: string | null;
  };

  // Emails: best-effort. NEVER let an email failure fail the booking (spec).
  try {
    await Promise.allSettled([
      sendConfirmationEmail(booking.manage_token, payload.p_customer_email),
      sendOwnerNotification(booking.booking_reference),
    ]);
  } catch {
    // Fully swallowed — the booking is already committed in the DB.
  }

  redirect(`/manage/${booking.manage_token}?just_booked=1`);
}
