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

// ---------------------------------------------------------------------------
// Regression: the public views must be READ-ONLY for anon.
// ---------------------------------------------------------------------------
// This gap is how a real vulnerability survived from day one. The suite above
// asserted that anon CAN read public_business_settings — the exception — but
// never that anon cannot WRITE to it. Because the view selects from a single
// table it was automatically updatable, and Supabase's default privileges
// grant ALL on new objects in `public` to anon, a plain PATCH rewrote the
// underlying row: business name, contact_email, payments_enabled,
// bookings_enabled. Fixed in 20260721210000 with revoke-all/grant-select.
//
// These tests exist because that fix is easy to undo by accident: any future
// migration that drops and recreates a view and issues a bare `grant select`
// silently restores the ALL grant. Grants are not RLS, and RLS does not save
// you here.
describe("Grants — public views are read-only for anon", () => {
  it("anon cannot UPDATE business settings through the public view", async () => {
    const { error } = await anon
      .from("public_business_settings")
      .update({ business_name: "PWNED" })
      .eq("id", true);
    expect(error).not.toBeNull();

    // ...and nothing actually changed.
    const { data } = await service
      .from("business_settings")
      .select("business_name")
      .eq("id", true)
      .single();
    expect(data?.business_name).not.toBe("PWNED");
  });

  it("anon cannot re-open bookings through the public view", async () => {
    // The most damaging version of the same hole: flipping this back on lets
    // the public book while the business believes it is closed.
    //
    // Asserts the value is UNCHANGED rather than false — the owner legitimately
    // toggles this in /admin/settings, and a test that hard-codes false would
    // start failing the day they open for business.
    const { data: before } = await service
      .from("business_settings")
      .select("bookings_enabled")
      .eq("id", true)
      .single();

    const { error } = await anon
      .from("public_business_settings")
      .update({ bookings_enabled: !before?.bookings_enabled })
      .eq("id", true);
    expect(error).not.toBeNull();

    const { data: after } = await service
      .from("business_settings")
      .select("bookings_enabled")
      .eq("id", true)
      .single();
    expect(after?.bookings_enabled).toBe(before?.bookings_enabled);
  });

  it("anon cannot DELETE through the public view", async () => {
    const { error } = await anon
      .from("public_business_settings")
      .delete()
      .eq("id", true);
    expect(error).not.toBeNull();
  });

  it("anon cannot write to slot_availability", async () => {
    const { error } = await anon
      .from("slot_availability")
      .update({ remaining: 999 })
      .neq("slot_id", "00000000-0000-0000-0000-000000000000");
    expect(error).not.toBeNull();
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
