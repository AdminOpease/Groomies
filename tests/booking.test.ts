import { describe, it, expect, afterAll } from "vitest";
import { anon, service } from "./support/clients";
import { makeSlot, validBookingArgs } from "./support/fixtures";

describe("book_slot — no overbooking under concurrency", () => {
  const cleanups: Array<() => Promise<void>> = [];
  afterAll(async () => {
    for (const c of cleanups) await c();
  });

  it("two concurrent bookings on a capacity-1 slot: exactly one wins", async () => {
    const f = await makeSlot({ maxAppointments: 1 });
    cleanups.push(f.cleanup);

    const [a, b] = await Promise.all([
      anon.rpc("book_slot", { p_time_slot_id: f.timeSlotId, ...validBookingArgs() }),
      anon.rpc("book_slot", { p_time_slot_id: f.timeSlotId, ...validBookingArgs() }),
    ]);

    const results = [a, b];
    const successes = results.filter((r) => r.error === null);
    const failures = results.filter((r) => r.error !== null);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0].error?.message).toContain("SLOT_FULL");
  });
});

describe("book_slot — availability filtering", () => {
  const cleanups: Array<() => Promise<void>> = [];
  afterAll(async () => {
    for (const c of cleanups) await c();
  });

  it("cannot book a past slot", async () => {
    const f = await makeSlot({ daysFromToday: -1 });
    cleanups.push(f.cleanup);

    const { error } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs(),
    });
    expect(error?.message).toContain("SLOT_NOT_BOOKABLE");
  });

  it("cannot book at an inactive location", async () => {
    const f = await makeSlot({ locationActive: false });
    cleanups.push(f.cleanup);

    const { error } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs(),
    });
    expect(error?.message).toContain("SLOT_NOT_BOOKABLE");
  });

  it("area location requires service_address", async () => {
    const f = await makeSlot({ locationType: "area" });
    cleanups.push(f.cleanup);

    const { error } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs({ p_service_address: null }),
    });
    expect(error?.message).toContain("ADDRESS_REQUIRED");
  });

  it("stop location does NOT require service_address", async () => {
    const f = await makeSlot({ locationType: "stop" });
    cleanups.push(f.cleanup);

    const { error } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs({ p_service_address: null }),
    });
    expect(error).toBeNull();
  });

  it("consent is required", async () => {
    const f = await makeSlot();
    cleanups.push(f.cleanup);

    const { error } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs({ p_consent_given: false }),
    });
    expect(error?.message).toContain("CONSENT_REQUIRED");
  });

  it("per-day cap blocks bookings beyond max_per_day", async () => {
    const f = await makeSlot({ maxAppointments: 5, maxPerDay: 1 });
    cleanups.push(f.cleanup);

    const first = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs(),
    });
    expect(first.error).toBeNull();

    const second = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs(),
    });
    expect(second.error?.message).toContain("PER_DAY_CAP_REACHED");
  });
});

describe("hold expiry frees the slot", () => {
  const cleanups: Array<() => Promise<void>> = [];
  afterAll(async () => {
    for (const c of cleanups) await c();
  });

  it("abandoned pending booking expires and the slot becomes available again", async () => {
    // Enable payments so book_slot creates a hold instead of confirming.
    await service
      .from("business_settings")
      .update({ payments_enabled: true, hold_duration_minutes: 15 })
      .eq("id", true);

    try {
      const f = await makeSlot({ maxAppointments: 1 });
      cleanups.push(f.cleanup);

      // Create a pending hold via the RPC.
      const { data: booking, error } = await anon.rpc("book_slot", {
        p_time_slot_id: f.timeSlotId,
        ...validBookingArgs(),
      });
      expect(error).toBeNull();
      expect(booking.status).toBe("pending");

      // Slot is now full.
      const beforeExpiry = await anon
        .from("slot_availability")
        .select("remaining")
        .eq("slot_id", f.timeSlotId)
        .single();
      expect(beforeExpiry.data?.remaining).toBe(0);

      // Simulate the hold clock running out (service-role update, past the wall).
      await service
        .from("bookings")
        .update({ hold_expires_at: new Date(Date.now() - 60_000).toISOString() })
        .eq("id", booking.booking_id);

      // Availability immediately reflects it (the view checks hold_expires_at > now()).
      const afterClock = await anon
        .from("slot_availability")
        .select("remaining")
        .eq("slot_id", f.timeSlotId)
        .single();
      expect(afterClock.data?.remaining).toBe(1);

      // The cron function is what actually flips status='expired'.
      const { data: expired, error: expErr } = await service.rpc("expire_abandoned_holds");
      expect(expErr).toBeNull();
      expect(expired).toBeGreaterThanOrEqual(1);

      const { data: after } = await service
        .from("bookings")
        .select("status")
        .eq("id", booking.booking_id)
        .single();
      expect(after?.status).toBe("expired");
    } finally {
      await service
        .from("business_settings")
        .update({ payments_enabled: false })
        .eq("id", true);
    }
  });
});

describe("manage_token — customer can view/cancel own booking only", () => {
  const cleanups: Array<() => Promise<void>> = [];
  afterAll(async () => {
    for (const c of cleanups) await c();
  });

  it("cannot get a booking with a random token", async () => {
    const { data, error } = await anon.rpc("get_booking_by_token", {
      p_token: "00000000-0000-0000-0000-000000000000",
    });
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("real token retrieves the booking", async () => {
    const f = await makeSlot({ maxAppointments: 1 });
    cleanups.push(f.cleanup);

    const { data: booking } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs(),
    });
    expect(booking.manage_token).toBeTruthy();

    const { data, error } = await anon.rpc("get_booking_by_token", {
      p_token: booking.manage_token,
    });
    expect(error).toBeNull();
    expect(data.booking_reference).toBe(booking.booking_reference);
    expect(data.pet_name).toBe("Rex");
  });

  it("cancelling by token flips status and frees the slot", async () => {
    const f = await makeSlot({ maxAppointments: 1 });
    cleanups.push(f.cleanup);

    const { data: booking } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs(),
    });

    const cancel = await anon.rpc("cancel_booking_by_token", {
      p_token: booking.manage_token,
    });
    expect(cancel.error).toBeNull();
    expect(cancel.data.new_status).toBe("cancelled");

    const { data: avail } = await anon
      .from("slot_availability")
      .select("remaining")
      .eq("slot_id", f.timeSlotId)
      .single();
    expect(avail?.remaining).toBe(1);
  });

  it("cancelling with a wrong token fails cleanly", async () => {
    const { error } = await anon.rpc("cancel_booking_by_token", {
      p_token: "00000000-0000-0000-0000-000000000000",
    });
    expect(error?.message).toContain("BOOKING_NOT_FOUND");
  });
});
