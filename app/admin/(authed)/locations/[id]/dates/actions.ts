"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

export type ActionState = {
  ok: boolean;
  message?: string;
  affectedBookings?: number;
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function requireDate(v: FormDataEntryValue | null): string {
  const s = (v ?? "").toString().trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("Invalid date");
  return s;
}

function requireTime(v: FormDataEntryValue | null): string {
  const s = (v ?? "").toString().trim();
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(s)) throw new Error("Invalid time");
  return s.length === 5 ? `${s}:00` : s;
}

function requirePositiveInt(v: FormDataEntryValue | null): number {
  const n = Number((v ?? "").toString().trim());
  if (!Number.isInteger(n) || n <= 0) throw new Error("Must be a positive whole number");
  return n;
}

function optionalPositiveInt(v: FormDataEntryValue | null): number | null {
  const s = (v ?? "").toString().trim();
  if (s.length === 0) return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n <= 0) throw new Error("Must be a positive whole number");
  return n;
}

// Enumerate dates between start and start+weeks*7-1 (inclusive) that fall on
// any of the selected weekdays. Weekdays: 0 = Sunday .. 6 = Saturday.
function generateDates(startISO: string, weeks: number, weekdays: number[]): string[] {
  const start = new Date(`${startISO}T00:00:00Z`);
  const totalDays = weeks * 7;
  const out: string[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    if (weekdays.includes(d.getUTCDay())) {
      out.push(d.toISOString().slice(0, 10));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Single date
// ---------------------------------------------------------------------------

export async function addSingleDate(
  locationId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await getSupabaseServer();

  let service_date: string;
  let max_per_day: number | null;
  try {
    service_date = requireDate(formData.get("service_date"));
    max_per_day = optionalPositiveInt(formData.get("max_per_day"));
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const { error } = await supabase
    .from("location_dates")
    .insert({ location_id: locationId, service_date, max_per_day });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "That date is already open for this location." };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath(`/admin/locations/${locationId}/dates`);
  return { ok: true, message: `Added ${service_date}.` };
}

export async function updateDate(
  locationId: string,
  dateId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await getSupabaseServer();

  let max_per_day: number | null;
  try {
    max_per_day = optionalPositiveInt(formData.get("max_per_day"));
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const { error } = await supabase
    .from("location_dates")
    .update({ max_per_day })
    .eq("id", dateId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/locations/${locationId}/dates`);
  revalidatePath(`/admin/locations/${locationId}/dates/${dateId}`);
  return { ok: true, message: "Saved." };
}

export async function deleteDate(
  locationId: string,
  dateId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const supabase = await getSupabaseServer();

  const { data: slots, error: slotsErr } = await supabase
    .from("time_slots")
    .select("id")
    .eq("location_date_id", dateId);
  if (slotsErr) return { ok: false, message: slotsErr.message };

  const slotIds = (slots ?? []).map((s) => s.id);

  if (slotIds.length > 0) {
    const { count, error: bkErr } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("time_slot_id", slotIds)
      .in("status", ["pending", "confirmed"]);
    if (bkErr) return { ok: false, message: bkErr.message };

    if ((count ?? 0) > 0) {
      return {
        ok: false,
        affectedBookings: count ?? 0,
        message:
          `${count} active booking${count === 1 ? "" : "s"} on this date. ` +
          `Cancel + notify those customers first, then delete the date.`,
      };
    }
  }

  const { error } = await supabase.from("location_dates").delete().eq("id", dateId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/locations/${locationId}/dates`);
  redirect(`/admin/locations/${locationId}/dates?deleted=1`);
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

export async function addSlot(
  locationId: string,
  dateId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await getSupabaseServer();

  let start_time: string;
  let end_time: string;
  let max_appointments: number;
  try {
    start_time = requireTime(formData.get("start_time"));
    end_time = requireTime(formData.get("end_time"));
    max_appointments = requirePositiveInt(formData.get("max_appointments"));
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  if (end_time <= start_time) {
    return { ok: false, message: "End time must be after start time." };
  }

  const { error } = await supabase.from("time_slots").insert({
    location_date_id: dateId,
    start_time,
    end_time,
    max_appointments,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "A slot with that start time already exists." };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath(`/admin/locations/${locationId}/dates`);
  revalidatePath(`/admin/locations/${locationId}/dates/${dateId}`);
  return { ok: true, message: `Slot ${start_time.slice(0, 5)}–${end_time.slice(0, 5)} added.` };
}

export async function updateSlot(
  locationId: string,
  dateId: string,
  slotId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await getSupabaseServer();

  let start_time: string;
  let end_time: string;
  let max_appointments: number;
  try {
    start_time = requireTime(formData.get("start_time"));
    end_time = requireTime(formData.get("end_time"));
    max_appointments = requirePositiveInt(formData.get("max_appointments"));
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  if (end_time <= start_time) {
    return { ok: false, message: "End time must be after start time." };
  }

  // Capacity guard: can't drop below current active booking count.
  const { count: currentBooked, error: countErr } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("time_slot_id", slotId)
    .in("status", ["pending", "confirmed"]);
  if (countErr) return { ok: false, message: countErr.message };

  if ((currentBooked ?? 0) > max_appointments) {
    return {
      ok: false,
      message:
        `Capacity can't go below the current booking count (${currentBooked}). ` +
        `Cancel some bookings first or pick a higher capacity.`,
    };
  }

  const { error } = await supabase
    .from("time_slots")
    .update({ start_time, end_time, max_appointments })
    .eq("id", slotId);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Another slot already starts at that time." };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath(`/admin/locations/${locationId}/dates`);
  revalidatePath(`/admin/locations/${locationId}/dates/${dateId}`);
  return { ok: true, message: "Slot saved." };
}

export async function deleteSlot(
  locationId: string,
  dateId: string,
  slotId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const supabase = await getSupabaseServer();

  const { count, error: bkErr } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("time_slot_id", slotId)
    .in("status", ["pending", "confirmed"]);
  if (bkErr) return { ok: false, message: bkErr.message };

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      affectedBookings: count ?? 0,
      message:
        `${count} active booking${count === 1 ? "" : "s"} on this slot. ` +
        `Cancel + notify those customers first, then delete the slot.`,
    };
  }

  const { error } = await supabase.from("time_slots").delete().eq("id", slotId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/locations/${locationId}/dates`);
  revalidatePath(`/admin/locations/${locationId}/dates/${dateId}`);
  return { ok: true, message: "Slot deleted." };
}

// ---------------------------------------------------------------------------
// Recurring generator
// ---------------------------------------------------------------------------

export type GenerateState = {
  ok: boolean;
  message?: string;
  datesCreated?: number;
  datesExisting?: number;
  slotsCreated?: number;
  slotsSkipped?: number;
};

export async function generateRecurring(
  locationId: string,
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  const supabase = await getSupabaseServer();

  // 1. Parse days-of-week.
  const weekdayInputs = formData.getAll("weekday").map((v) => Number(v));
  const weekdays = weekdayInputs.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  if (weekdays.length === 0) {
    return { ok: false, message: "Pick at least one day of the week." };
  }

  // 2. Start date + number of weeks.
  let startISO: string;
  let weeks: number;
  let max_per_day: number | null;
  try {
    startISO = requireDate(formData.get("start_date"));
    weeks = requirePositiveInt(formData.get("weeks"));
    if (weeks > 52) return { ok: false, message: "Max 52 weeks per generation." };
    max_per_day = optionalPositiveInt(formData.get("max_per_day"));
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  // 3. Slot template — parallel arrays from repeating form fields.
  const starts = formData.getAll("slot_start").map((v) => v.toString());
  const ends = formData.getAll("slot_end").map((v) => v.toString());
  const maxes = formData.getAll("slot_max").map((v) => v.toString());
  if (starts.length === 0) {
    return { ok: false, message: "Add at least one slot to the template." };
  }
  if (starts.length !== ends.length || starts.length !== maxes.length) {
    return { ok: false, message: "Slot template is malformed." };
  }

  type TemplateSlot = { start_time: string; end_time: string; max_appointments: number };
  const template: TemplateSlot[] = [];
  for (let i = 0; i < starts.length; i++) {
    try {
      const start_time = requireTime(starts[i]);
      const end_time = requireTime(ends[i]);
      const max_appointments = requirePositiveInt(maxes[i]);
      if (end_time <= start_time) {
        return { ok: false, message: `Slot ${i + 1}: end must be after start.` };
      }
      template.push({ start_time, end_time, max_appointments });
    } catch (e) {
      return { ok: false, message: `Slot ${i + 1}: ${(e as Error).message}` };
    }
  }

  const dates = generateDates(startISO, weeks, weekdays);
  if (dates.length === 0) {
    return {
      ok: false,
      message: "The chosen weekdays don't fall inside the selected range.",
    };
  }

  // 4. Insert dates — skip existing.
  const { data: existingDates, error: existErr } = await supabase
    .from("location_dates")
    .select("id, service_date")
    .eq("location_id", locationId)
    .in("service_date", dates);
  if (existErr) return { ok: false, message: existErr.message };

  const existingByDate = new Map<string, string>(
    (existingDates ?? []).map((d) => [d.service_date, d.id])
  );

  const toInsert = dates
    .filter((d) => !existingByDate.has(d))
    .map((d) => ({
      location_id: locationId,
      service_date: d,
      max_per_day,
    }));

  const insertedDates: Array<{ id: string; service_date: string }> = [];
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from("location_dates")
      .insert(toInsert)
      .select("id, service_date");
    if (error) return { ok: false, message: error.message };
    insertedDates.push(...(data ?? []));
  }

  const allDateIds = [
    ...insertedDates.map((d) => ({ id: d.id, service_date: d.service_date })),
    ...(existingDates ?? []).map((d) => ({ id: d.id, service_date: d.service_date })),
  ];

  // 5. Bulk-insert slots. Skip existing (unique on location_date_id + start_time).
  const slotsToInsert = allDateIds.flatMap((d) =>
    template.map((t) => ({
      location_date_id: d.id,
      start_time: t.start_time,
      end_time: t.end_time,
      max_appointments: t.max_appointments,
    }))
  );

  let slotsCreated = 0;
  let slotsSkipped = 0;

  if (slotsToInsert.length > 0) {
    // Find existing slots on those dates+times to know how many we'd skip.
    const { data: existingSlots, error: exsErr } = await supabase
      .from("time_slots")
      .select("location_date_id, start_time")
      .in(
        "location_date_id",
        allDateIds.map((d) => d.id)
      );
    if (exsErr) return { ok: false, message: exsErr.message };

    const existingSlotKeys = new Set(
      (existingSlots ?? []).map((s) => `${s.location_date_id}::${s.start_time}`)
    );
    const toActuallyInsert = slotsToInsert.filter(
      (s) => !existingSlotKeys.has(`${s.location_date_id}::${s.start_time}`)
    );
    slotsSkipped = slotsToInsert.length - toActuallyInsert.length;

    if (toActuallyInsert.length > 0) {
      const { error } = await supabase.from("time_slots").insert(toActuallyInsert);
      if (error) return { ok: false, message: error.message };
      slotsCreated = toActuallyInsert.length;
    }
  }

  revalidatePath(`/admin/locations/${locationId}/dates`);

  return {
    ok: true,
    datesCreated: insertedDates.length,
    datesExisting: existingDates?.length ?? 0,
    slotsCreated,
    slotsSkipped,
  };
}
