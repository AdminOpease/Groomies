import { NextResponse } from "next/server";

/**
 * Stripe Checkout session creation.
 *
 * DORMANT until payments are switched on. When business_settings.payments_enabled
 * is true, the booking flow will POST here to get a redirect URL. The webhook
 * (see ./webhook/route.ts) flips the booking to 'confirmed' on payment success.
 *
 * The current booking flow (book_slot RPC + business_settings.payments_enabled=false)
 * confirms immediately in the DB and never hits this endpoint. This handler is
 * scaffolded so enabling deposits later is a wire-up, not a rebuild.
 */

export const dynamic = "force-dynamic";

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      {
        error: "PAYMENTS_NOT_CONFIGURED",
        message:
          "Stripe keys are not set. Add STRIPE_SECRET_KEY to Cloudflare env vars and toggle business_settings.payments_enabled = true.",
      },
      { status: 501 }
    );
  }

  // TODO (Phase 6.5 wire-up):
  //   1. Validate that the caller's booking is 'pending' and holds are still valid.
  //   2. Compute amount from business_settings.deposit_mode + service price.
  //   3. Create a Stripe Checkout session with success_url and cancel_url.
  //   4. Return the Checkout URL to the client.
  return NextResponse.json(
    { error: "NOT_IMPLEMENTED", message: "Stripe checkout wiring coming next." },
    { status: 501 }
  );
}
