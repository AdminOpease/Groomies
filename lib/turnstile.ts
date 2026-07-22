/**
 * Cloudflare Turnstile verification.
 *
 * The second layer of bot protection on the booking form. The first is the
 * honeypot in BookingForm (`hp_field`), which catches naive form-spammers but
 * does nothing against a headless browser driving the real form — that is the
 * gap Turnstile closes.
 *
 * Dormant until keys are set, same pattern as Resend and Stripe: with no
 * TURNSTILE_SECRET_KEY the widget never renders and this never runs, so local
 * dev and the current pre-launch site are unaffected.
 */

const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason: string };

/**
 * Verify a Turnstile token from a form submission.
 *
 * Failure policy — deliberate, and the interesting decision here:
 *
 *   - Token missing or rejected by Cloudflare → FAIL CLOSED. Cloudflare gave a
 *     definitive "no", so refuse the booking.
 *   - Cannot reach Cloudflare at all (network error, timeout) → FAIL OPEN, with
 *     a loud server log. We cannot tell a bot from a real customer, and for a
 *     one-van grooming business a silently-lost real booking costs more than
 *     one spam row that a human will see in the admin anyway. The honeypot is
 *     still in front of this.
 *
 * That trade-off is right for this business and would be wrong for, say, a
 * payment endpoint. If Turnstile ever guards something that moves money,
 * revisit it.
 */
export async function verifyTurnstile(
  token: string | null,
  remoteIp?: string | null
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Not configured — nothing to enforce.
  if (!secret) return { ok: true, skipped: true };

  // Configured server-side but no token arrived. Usually means
  // NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing, so the widget never rendered.
  // Refusing every booking over a half-finished config would be worse than the
  // spam it prevents, so log loudly and let it through — the deploy is broken
  // and someone needs to see that, but not at the cost of the business.
  if (!token) {
    console.error(
      "[turnstile] TURNSTILE_SECRET_KEY is set but no token was submitted. " +
        "NEXT_PUBLIC_TURNSTILE_SITE_KEY is probably missing from the BUILD " +
        "variables, so the widget never rendered. Allowing the booking, but " +
        "bot protection is NOT active — fix the config."
    );
    return { ok: true, skipped: true };
  }

  try {
    const body = new FormData();
    body.append("secret", secret);
    body.append("response", token);
    if (remoteIp) body.append("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, { method: "POST", body });

    if (!res.ok) {
      console.error(
        `[turnstile] siteverify returned HTTP ${res.status} — allowing the booking (fail-open on transport error).`
      );
      return { ok: true, skipped: true };
    }

    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (data.success) return { ok: true };

    const codes = (data["error-codes"] ?? []).join(", ");
    console.warn(`[turnstile] rejected a submission: ${codes || "no reason"}`);
    return { ok: false, reason: codes || "verification failed" };
  } catch (err) {
    // Network/DNS failure — cannot reach Cloudflare. Fail open; see above.
    console.error(
      "[turnstile] could not reach siteverify — allowing the booking (fail-open):",
      err
    );
    return { ok: true, skipped: true };
  }
}
