"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

export type ServiceState = { ok: boolean; message?: string };

const requireString = (v: FormDataEntryValue | null, field: string): string => {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length === 0) throw new Error(`${field} is required.`);
  return s;
};

const requirePositiveInt = (
  v: FormDataEntryValue | null,
  field: string
): number => {
  const n = Number((v ?? "").toString().trim());
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${field} must be a positive whole number.`);
  return n;
};

const optionalNonNegativeInt = (v: FormDataEntryValue | null): number | null => {
  const s = (v ?? "").toString().trim();
  if (s.length === 0) return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0) throw new Error("Deposit must be a whole number.");
  return n;
};

const optionalInt = (v: FormDataEntryValue | null): number => {
  const s = (v ?? "").toString().trim();
  if (s.length === 0) return 0;
  const n = Number(s);
  if (!Number.isInteger(n)) return 0;
  return n;
};

function parse(formData: FormData) {
  return {
    name: requireString(formData.get("name"), "Name"),
    description:
      typeof formData.get("description") === "string"
        ? (formData.get("description") as string).trim() || null
        : null,
    duration_minutes: requirePositiveInt(
      formData.get("duration_minutes"),
      "Duration"
    ),
    price_cents: Math.round(
      requirePositiveInt(formData.get("price_pence"), "Price") * 1
    ),
    deposit_amount_cents: optionalNonNegativeInt(
      formData.get("deposit_pence")
    ),
    is_active: formData.get("is_active") === "on",
    price_from: formData.get("price_from") === "on",
    sort_order: optionalInt(formData.get("sort_order")),
  };
}

export async function createService(
  _prev: ServiceState,
  formData: FormData
): Promise<ServiceState> {
  const supabase = await getSupabaseServer();
  let payload;
  try {
    payload = parse(formData);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const { data, error } = await supabase
    .from("services")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/");
  redirect(`/admin/services/${data.id}?created=1`);
}

export async function updateService(
  id: string,
  _prev: ServiceState,
  formData: FormData
): Promise<ServiceState> {
  const supabase = await getSupabaseServer();
  let payload;
  try {
    payload = parse(formData);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const { error } = await supabase.from("services").update(payload).eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/services");
  revalidatePath(`/admin/services/${id}`);
  revalidatePath("/services");
  revalidatePath("/");
  return { ok: true, message: "Saved." };
}

export async function deleteService(
  id: string,
  _prev: ServiceState,
  _formData: FormData
): Promise<ServiceState> {
  const supabase = await getSupabaseServer();

  // Bookings link with ON DELETE SET NULL, so deletion is always safe —
  // but confirm nothing weird before we hard-delete.
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/services");
  revalidatePath("/services");
  redirect("/admin/services?deleted=1");
}
