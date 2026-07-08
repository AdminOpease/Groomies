import { NextResponse } from "next/server";

/**
 * Stripe webhook receiver.
 *
 * DORMANT until payments are switched on. On checkout.session.completed we'll
 * flip the corresponding booking from 'pending' to 'confirmed' and mark payment
 * status. Verifies the signature with STRIPE_WEBHOOK_SECRET (never trust the
 * event body without it).
 *
 * Returns 200 for unknown/dormant events so Stripe doesn't retry indefinitely
 * while payments are switched off in dev.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    // Silently 200 so Stripe doesn't spam retries when the payments feature is off.
    return NextResponse.json({ received: true, dormant: true });
  }

  // TODO (Phase 6.5 wire-up):
  //   1. Read the raw body + stripe-signature header.
  //   2. Verify using STRIPE_WEBHOOK_SECRET.
  //   3. On checkout.session.completed:
  //        - Extract bookingId from metadata.
  //        - Use the service role client to flip status to 'confirmed',
  //          payment_status to 'paid', amount_paid_cents, payment_provider_ref.
  //   4. Send the customer confirmation email if not already sent.
  await request.text(); // drain body
  return NextResponse.json({ received: true });
}
