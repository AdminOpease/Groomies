/**
 * Resend integration for transactional email.
 *
 * Everything here is best-effort — the booking must always succeed even when
 * email sending fails (spec §"Graceful degradation"). Callers should
 * `try { await sendXxx() } catch {}` or use Promise.allSettled.
 *
 * If RESEND_API_KEY is not set, functions log a warning and return without
 * throwing. That way local dev works without a Resend account, and the
 * booking flow ships unblocked.
 */

import { getSupabasePublic } from "./supabase/public";
import { getSupabaseService } from "./supabase/service";
import { formatDateLondon, formatTime } from "./format";

type SendResult = { ok: boolean; skipped?: boolean; message?: string };

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Resend's default sender for accounts without a verified domain. Fine for
// testing. Owner should verify their domain before real launch.
const DEFAULT_FROM = "Groomies <onboarding@resend.dev>";

async function resendSend(payload: {
  from: string;
  to: string;
  subject: string;
  html: string;
  reply_to?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(
      `[email] RESEND_API_KEY not set — would have sent "${payload.subject}" to ${payload.to}`
    );
    return { ok: true, skipped: true };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Resend ${res.status}: ${body}`);
      return { ok: false, message: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] send error:", err);
    return { ok: false, message: (err as Error).message };
  }
}

async function getBusinessContext() {
  // Public-safe fields (business name + contact) via anon key.
  const anon = getSupabasePublic();
  const { data: pub } = await anon
    .from("public_business_settings")
    .select("business_name, contact_email, contact_phone")
    .single();

  // Private field (owner_notification_email) needs the service-role key.
  // Falls back to contact_email if the service key isn't configured — this
  // means the customer's contact address doubles as the owner alert address
  // until SUPABASE_SERVICE_ROLE_KEY is added on Cloudflare.
  let ownerNotificationEmail: string | null = null;
  const service = getSupabaseService();
  if (service) {
    const { data: priv } = await service
      .from("business_settings")
      .select("owner_notification_email")
      .eq("id", true)
      .single();
    ownerNotificationEmail = priv?.owner_notification_email ?? null;
  }

  return {
    businessName: pub?.business_name ?? "Groomies",
    contactEmail: pub?.contact_email ?? null,
    contactPhone: pub?.contact_phone ?? null,
    ownerNotificationEmail:
      ownerNotificationEmail ?? pub?.contact_email ?? null,
  };
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// The get_booking_by_token RPC is anon-callable and returns everything we
// need for the confirmation email.
async function loadBookingForEmail(manageToken: string) {
  const supabase = getSupabasePublic();
  const { data, error } = await supabase.rpc("get_booking_by_token", {
    p_token: manageToken,
  });
  if (error || !data) return null;
  return data as {
    booking_reference: string;
    status: string;
    customer_name: string;
    customer_email: string;
    pet_name: string;
    service_address: string | null;
    location: { name: string; type: string; address: string | null };
    slot: { service_date: string; start_time: string; end_time: string };
    service?: { name: string; price_cents: number };
  };
}

// ---------------------------------------------------------------------------
// Customer confirmation
// ---------------------------------------------------------------------------

export async function sendConfirmationEmail(
  manageToken: string,
  customerEmail: string
): Promise<SendResult> {
  const [booking, business] = await Promise.all([
    loadBookingForEmail(manageToken),
    getBusinessContext(),
  ]);
  if (!booking) {
    return { ok: false, message: "Booking not found for email" };
  }

  const manageUrl = `${siteUrl()}/manage/${manageToken}`;
  const when = `${formatDateLondon(booking.slot.service_date)} at ${formatTime(
    booking.slot.start_time
  )}`;

  const html = `
<!doctype html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fafaf9;color:#1c1917;margin:0;padding:24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden;">
    <tr>
      <td style="padding:32px;">
        <p style="color:#059669;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Booking confirmed</p>
        <h1 style="margin:0 0 12px;font-size:24px;color:#1c1917;">You're all set, ${escapeHtml(
          booking.customer_name
        )}</h1>
        <p style="margin:0 0 20px;color:#57534e;font-size:15px;line-height:1.55;">
          ${escapeHtml(business.businessName)} will see ${escapeHtml(
    booking.pet_name
  )} on <strong>${escapeHtml(when)}</strong>.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;border-radius:12px;">
          <tr><td style="padding:16px 20px;">
            <p style="margin:0 0 4px;color:#78716c;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Reference</p>
            <p style="margin:0 0 12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:16px;color:#1c1917;font-weight:600;">${escapeHtml(
              booking.booking_reference
            )}</p>
            <p style="margin:0 0 4px;color:#78716c;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Where</p>
            <p style="margin:0 0 12px;font-size:14px;color:#1c1917;">${escapeHtml(
              booking.location.name
            )}${
    booking.service_address
      ? `<br/>${escapeHtml(booking.service_address)}`
      : booking.location.address
      ? `<br/>${escapeHtml(booking.location.address)}`
      : ""
  }</p>
            ${
              booking.service
                ? `<p style="margin:0 0 4px;color:#78716c;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Service</p>
                   <p style="margin:0;font-size:14px;color:#1c1917;">${escapeHtml(
                     booking.service.name
                   )}</p>`
                : ""
            }
          </td></tr>
        </table>
        <p style="margin:24px 0 8px;font-size:14px;color:#57534e;">Need to reschedule or cancel? Use your secure link:</p>
        <p style="margin:0 0 24px;">
          <a href="${manageUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:9999px;font-weight:600;font-size:14px;">Manage my booking</a>
        </p>
        <p style="margin:0;color:#a8a29e;font-size:12px;line-height:1.5;">
          Save this email — the link above is your only way to make changes without contacting us.
          ${
            business.contactEmail
              ? `Reply to this email or write to ${escapeHtml(
                  business.contactEmail
                )} for anything else.`
              : ""
          }
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return resendSend({
    from: DEFAULT_FROM,
    to: customerEmail,
    subject: `Your booking is confirmed — ${when}`,
    html,
    reply_to: business.contactEmail ?? undefined,
  });
}

// ---------------------------------------------------------------------------
// Owner new-booking notification
// ---------------------------------------------------------------------------

export async function sendOwnerNotification(
  bookingReference: string
): Promise<SendResult> {
  const business = await getBusinessContext();
  const to = business.ownerNotificationEmail;
  if (!to) {
    console.warn(
      "[email] No owner_notification_email or contact_email set — skipping owner alert"
    );
    return { ok: true, skipped: true };
  }

  const html = `
<!doctype html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fafaf9;color:#1c1917;margin:0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:24px;">
    <p style="margin:0 0 8px;color:#059669;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">New booking</p>
    <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:20px;font-weight:700;">${escapeHtml(
      bookingReference
    )}</p>
    <p style="margin:16px 0 0;color:#57534e;font-size:14px;">
      Log in to the admin dashboard to see the full details.
    </p>
    <p style="margin:16px 0 0;">
      <a href="${siteUrl()}/admin" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;font-size:13px;">Open admin</a>
    </p>
  </div>
</body>
</html>
  `.trim();

  return resendSend({
    from: DEFAULT_FROM,
    to,
    subject: `New booking · ${bookingReference}`,
    html,
  });
}
