import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyTurnstile } from "../lib/turnstile";

/**
 * Unit tests for the Turnstile failure policy.
 *
 * These exist because the policy is deliberately asymmetric and looks like a
 * bug if you skim it: a definitive rejection from Cloudflare blocks the
 * booking, but being unable to REACH Cloudflare lets it through. That is the
 * right trade for a one-van business — a silently-lost real booking costs more
 * than a spam row someone will see in the admin — but it is exactly the kind
 * of thing a later reader "fixes" into failing closed and quietly starts
 * dropping bookings during a Cloudflare blip.
 *
 * The first test is the one that matters today: with no key set, the whole
 * thing must be a no-op, because that is the live configuration.
 */

const realFetch = globalThis.fetch;

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe("Turnstile — dormant until configured", () => {
  it("allows the booking when no secret key is set", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const r = await verifyTurnstile("anything");
    expect(r.ok).toBe(true);
  });

  it("does not call Cloudflare when unconfigured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    await verifyTurnstile("token");
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("Turnstile — failure policy once configured", () => {
  it("FAILS CLOSED when Cloudflare rejects the token", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }),
        { status: 200 }
      )) as unknown as typeof fetch;

    const r = await verifyTurnstile("bad-token");
    expect(r.ok).toBe(false);
  });

  it("passes when Cloudflare accepts the token", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: true }), {
        status: 200,
      })) as unknown as typeof fetch;

    const r = await verifyTurnstile("good-token");
    expect(r.ok).toBe(true);
  });

  it("FAILS OPEN when Cloudflare is unreachable", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const r = await verifyTurnstile("token");
    expect(r.ok).toBe(true);
  });

  it("FAILS OPEN on a non-200 from siteverify", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    globalThis.fetch = (async () =>
      new Response("", { status: 503 })) as unknown as typeof fetch;

    const r = await verifyTurnstile("token");
    expect(r.ok).toBe(true);
  });

  it("allows, but complains loudly, when the secret is set and no token arrives", async () => {
    // Means NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing so the widget never
    // rendered. Blocking every booking over a half-finished config would be
    // worse than the spam it prevents — but it must be shouted into the logs.
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    const r = await verifyTurnstile(null);
    expect(r.ok).toBe(true);
    expect(err).toHaveBeenCalled();
  });
});
