import { describe, it, expect, afterAll } from "vitest";
import { anon, service } from "./support/clients";
import { makeSlot, validBookingArgs } from "./support/fixtures";

describe("RLS — anon cannot read PII", () => {
  const cleanups: Array<() => Promise<void>> = [];
  afterAll(async () => {
    for (const c of cleanups) await c();
  });

  it("anon cannot select from bookings", async () => {
    const f = await makeSlot();
    cleanups.push(f.cleanup);

    // Seed a real booking via the RPC (which is anon-callable by design).
    const { error: bookErr } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs(),
    });
    expect(bookErr).toBeNull();

    const { data, error } = await anon.from("bookings").select("*").limit(10);
    // Under RLS with no policy, PostgREST returns [] (not an error) — either
    // way, no rows must come back for anon.
    expect(error === null ? data ?? [] : []).toEqual([]);
  });

  it("anon cannot select from profiles", async () => {
    const { data } = await anon.from("profiles").select("*");
    expect(data ?? []).toEqual([]);
  });

  it("anon cannot select from business_settings directly", async () => {
    const { data } = await anon.from("business_settings").select("*");
    expect(data ?? []).toEqual([]);
  });

  it("anon CAN read public_business_settings view", async () => {
    const { data, error } = await anon
      .from("public_business_settings")
      .select("*")
      .single();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data).not.toHaveProperty("owner_notification_email");
    expect(data).not.toHaveProperty("technical_billing_alert_email");
  });
});

describe("RLS — anon can only read active/future availability", () => {
  const cleanups: Array<() => Promise<void>> = [];
  afterAll(async () => {
    for (const c of cleanups) await c();
  });

  it("anon cannot see an inactive location", async () => {
    const f = await makeSlot({ locationActive: false });
    cleanups.push(f.cleanup);

    const { data } = await anon
      .from("locations")
      .select("id")
      .eq("id", f.locationId);
    expect(data ?? []).toEqual([]);
  });

  it("anon cannot see a past location_date", async () => {
    const f = await makeSlot({ daysFromToday: -1 });
    cleanups.push(f.cleanup);

    const { data } = await anon
      .from("location_dates")
      .select("id")
      .eq("id", f.locationDateId);
    expect(data ?? []).toEqual([]);
  });

  it("anon CAN see an active future slot in slot_availability", async () => {
    const f = await makeSlot({ maxAppointments: 3 });
    cleanups.push(f.cleanup);

    const { data, error } = await anon
      .from("slot_availability")
      .select("*")
      .eq("slot_id", f.timeSlotId)
      .single();
    expect(error).toBeNull();
    expect(data?.remaining).toBe(3);
  });
});
