import { describe, it, expect, afterAll } from "vitest";
import { anon, service } from "./support/clients";
import { makeSlot, makeService, validBookingArgs } from "./support/fixtures";

/**
 * Pricing guards.
 *
 * These protect against the failure mode that money bugs actually have: they
 * are SILENT. A broken guard doesn't error — it just records £45 when the
 * customer chose the £85 option, and you find out from a customer or from the
 * accounts rather than from the code.
 *
 * Each test owns its own service/tier fixtures so re-pricing a real groom in
 * /admin can never make the suite pass or fail for the wrong reason.
 */

const SMALL = 4500;
const LARGE = 8500;

describe("book_slot — size tier pricing", () => {
  const cleanups: Array<() => Promise<void>> = [];
  afterAll(async () => {
    for (const c of cleanups) await c();
  });

  it("records the CHOSEN tier's price, not the service's base price", async () => {
    const f = await makeSlot();
    const svc = await makeService({
      priceCents: SMALL,
      tiers: [
        { label: "Small dogs", priceCents: SMALL },
        { label: "Large dogs", priceCents: LARGE },
      ],
    });
    cleanups.push(f.cleanup, svc.cleanup);
    const large = svc.variants.find((v) => v.label === "Large dogs")!;

    const { data: booking, error } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs({
        p_service_id: svc.serviceId,
        p_service_variant_id: large.id,
      }),
    });
    expect(error).toBeNull();

    const { data: row } = await service
      .from("bookings")
      .select("price_cents, total_cents, service_variant_id")
      .eq("id", booking.booking_id)
      .single();

    expect(row?.price_cents).toBe(LARGE);
    expect(row?.total_cents).toBe(LARGE);
    expect(row?.service_variant_id).toBe(large.id);
  });

  it("a size-priced service cannot be booked without a size", async () => {
    const f = await makeSlot();
    const svc = await makeService({
      tiers: [{ label: "Small dogs", priceCents: SMALL }],
    });
    cleanups.push(f.cleanup, svc.cleanup);

    const { error } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs({
        p_service_id: svc.serviceId,
        p_service_variant_id: null,
      }),
    });
    expect(error?.message).toContain("VARIANT_REQUIRED");
  });

  it("cannot book one service at another service's tier price", async () => {
    const f = await makeSlot();
    const cheap = await makeService({
      tiers: [{ label: "Small dogs", priceCents: SMALL }],
    });
    const pricey = await makeService({
      tiers: [{ label: "Large dogs", priceCents: LARGE }],
    });
    cleanups.push(f.cleanup, cheap.cleanup, pricey.cleanup);

    const { error } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs({
        p_service_id: pricey.serviceId,
        p_service_variant_id: cheap.variants[0].id,
      }),
    });
    expect(error?.message).toContain("VARIANT_INVALID");
  });

  it("a flat-priced service still books on its own price", async () => {
    const f = await makeSlot();
    const svc = await makeService({ priceCents: 1500 });
    cleanups.push(f.cleanup, svc.cleanup);

    const { data: booking, error } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs({ p_service_id: svc.serviceId }),
    });
    expect(error).toBeNull();

    const { data: row } = await service
      .from("bookings")
      .select("price_cents, total_cents, service_variant_id")
      .eq("id", booking.booking_id)
      .single();

    expect(row?.price_cents).toBe(1500);
    expect(row?.total_cents).toBe(1500);
    expect(row?.service_variant_id).toBeNull();
  });
});

describe("book_slot — add-on pricing", () => {
  const cleanups: Array<() => Promise<void>> = [];
  afterAll(async () => {
    for (const c of cleanups) await c();
  });

  it("total is main + extras, and each extra snapshots its own price", async () => {
    const f = await makeSlot();
    const main = await makeService({
      tiers: [{ label: "Large dogs", priceCents: LARGE }],
    });
    const nails = await makeService({ priceCents: 1500 });
    const teeth = await makeService({ priceCents: 1000 });
    cleanups.push(f.cleanup, main.cleanup, nails.cleanup, teeth.cleanup);

    const { data: booking, error } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs({
        p_service_id: main.serviceId,
        p_service_variant_id: main.variants[0].id,
        p_addon_service_ids: [nails.serviceId, teeth.serviceId],
      }),
    });
    expect(error).toBeNull();

    const { data: row } = await service
      .from("bookings")
      .select("price_cents, total_cents")
      .eq("id", booking.booking_id)
      .single();

    expect(row?.price_cents).toBe(LARGE);
    expect(row?.total_cents).toBe(LARGE + 1500 + 1000);
    expect(booking.total_cents).toBe(LARGE + 1500 + 1000);

    const { data: addons } = await service
      .from("booking_addons")
      .select("price_cents")
      .eq("booking_id", booking.booking_id);
    expect(addons).toHaveLength(2);
    expect(addons?.map((a) => a.price_cents).sort()).toEqual([1000, 1500]);
  });

  it("the same extra submitted twice is charged once", async () => {
    const f = await makeSlot();
    const main = await makeService({ priceCents: 2000 });
    const extra = await makeService({ priceCents: 1500 });
    cleanups.push(f.cleanup, main.cleanup, extra.cleanup);

    const { data: booking, error } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs({
        p_service_id: main.serviceId,
        p_addon_service_ids: [extra.serviceId, extra.serviceId],
      }),
    });
    expect(error).toBeNull();

    const { data: row } = await service
      .from("bookings")
      .select("total_cents")
      .eq("id", booking.booking_id)
      .single();
    expect(row?.total_cents).toBe(2000 + 1500);

    const { data: addons } = await service
      .from("booking_addons")
      .select("id")
      .eq("booking_id", booking.booking_id);
    expect(addons).toHaveLength(1);
  });

  it("a size-priced service cannot be used as an extra", async () => {
    const f = await makeSlot();
    const main = await makeService({ priceCents: 2000 });
    const tiered = await makeService({
      tiers: [{ label: "Large dogs", priceCents: LARGE }],
    });
    cleanups.push(f.cleanup, main.cleanup, tiered.cleanup);

    const { error } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs({
        p_service_id: main.serviceId,
        p_addon_service_ids: [tiered.serviceId],
      }),
    });
    expect(error?.message).toContain("ADDON_INVALID");
  });

  it("the main service cannot be added as its own extra", async () => {
    const f = await makeSlot();
    const main = await makeService({ priceCents: 2000 });
    cleanups.push(f.cleanup, main.cleanup);

    const { error } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs({
        p_service_id: main.serviceId,
        p_addon_service_ids: [main.serviceId],
      }),
    });
    expect(error?.message).toContain("ADDON_INVALID");
  });

  it("an inactive service cannot be used as an extra", async () => {
    const f = await makeSlot();
    const main = await makeService({ priceCents: 2000 });
    const hidden = await makeService({ priceCents: 500 });
    cleanups.push(f.cleanup, main.cleanup, hidden.cleanup);

    await service
      .from("services")
      .update({ is_active: false })
      .eq("id", hidden.serviceId);

    const { error } = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs({
        p_service_id: main.serviceId,
        p_addon_service_ids: [hidden.serviceId],
      }),
    });
    expect(error?.message).toContain("ADDON_INVALID");
  });

  it("bad input is rejected before the slot is consumed", async () => {
    // The guard runs before the capacity check, so a rejected booking must
    // leave the slot bookable — otherwise a typo could burn a customer's slot.
    const f = await makeSlot({ maxAppointments: 1 });
    const svc = await makeService({
      tiers: [{ label: "Small dogs", priceCents: SMALL }],
    });
    cleanups.push(f.cleanup, svc.cleanup);

    const bad = await anon.rpc("book_slot", {
      p_time_slot_id: f.timeSlotId,
      ...validBookingArgs({
        p_service_id: svc.serviceId,
        p_service_variant_id: null,
      }),
    });
    expect(bad.error?.message).toContain("VARIANT_REQUIRED");

    const { data: avail } = await anon
      .from("slot_availability")
      .select("remaining")
      .eq("slot_id", f.timeSlotId)
      .single();
    expect(avail?.remaining).toBe(1);
  });
});
