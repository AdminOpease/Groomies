import { service } from "./clients";

type Fixture = {
  locationId: string;
  locationDateId: string;
  timeSlotId: string;
  cleanup: () => Promise<void>;
};

/**
 * Creates an isolated test fixture:
 *   - one active location (defaults to 'area' type)
 *   - one location_date (defaults to today+7d, so it's future)
 *   - one time_slot (defaults to 10:00–11:00, capacity 1)
 * Returns the ids plus a cleanup fn that deletes everything (via bookings-restrict-aware order).
 */
export async function makeSlot(opts: {
  locationType?: "stop" | "area";
  locationActive?: boolean;
  daysFromToday?: number;
  maxAppointments?: number;
  maxPerDay?: number | null;
} = {}): Promise<Fixture> {
  const {
    locationType = "area",
    locationActive = true,
    daysFromToday = 7,
    maxAppointments = 1,
    maxPerDay = null,
  } = opts;

  const name = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { data: loc, error: locErr } = await service
    .from("locations")
    .insert({
      name,
      type: locationType,
      address: locationType === "stop" ? "1 Test Lane" : "Test Area",
      is_active: locationActive,
    })
    .select("id")
    .single();
  if (locErr) throw locErr;

  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  const isoDate = date.toISOString().slice(0, 10);

  const { data: locDate, error: dateErr } = await service
    .from("location_dates")
    .insert({
      location_id: loc.id,
      service_date: isoDate,
      max_per_day: maxPerDay,
    })
    .select("id")
    .single();
  if (dateErr) throw dateErr;

  const { data: slot, error: slotErr } = await service
    .from("time_slots")
    .insert({
      location_date_id: locDate.id,
      start_time: "10:00:00",
      end_time: "11:00:00",
      max_appointments: maxAppointments,
    })
    .select("id")
    .single();
  if (slotErr) throw slotErr;

  const cleanup = async () => {
    // Delete bookings first (FK is RESTRICT).
    await service.from("bookings").delete().eq("time_slot_id", slot.id);
    await service.from("time_slots").delete().eq("id", slot.id);
    await service.from("location_dates").delete().eq("id", locDate.id);
    await service.from("locations").delete().eq("id", loc.id);
  };

  return {
    locationId: loc.id,
    locationDateId: locDate.id,
    timeSlotId: slot.id,
    cleanup,
  };
}

export function validBookingArgs(overrides: Record<string, unknown> = {}) {
  return {
    p_service_id: null,
    // Both required by the current book_slot signature. PostgREST resolves the
    // overload by argument names, so omitting them stops matching the function.
    p_service_variant_id: null,
    p_addon_service_ids: [],
    p_customer_name: "Test Customer",
    p_customer_email: `test-${Date.now()}@example.com`,
    p_customer_phone: "+447700000000",
    p_pet_name: "Rex",
    p_pet_species: "dog",
    p_pet_breed: "Labrador",
    p_service_address: "10 Downing Street, London",
    p_notes: null,
    p_consent_given: true,
    ...overrides,
  };
}
