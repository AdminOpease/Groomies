"use client";

import Script from "next/script";

/**
 * Cloudflare Turnstile widget.
 *
 * Renders nothing unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so the booking
 * form is unchanged until the keys exist.
 *
 * Turnstile injects a hidden input named `cf-turnstile-response` into the
 * enclosing <form>, which is how the token reaches the server action — no
 * state wiring needed on our side. That name is fixed by Cloudflare; the
 * server reads the same string.
 *
 * NOTE: NEXT_PUBLIC_* is inlined at BUILD time, so setting the site key in
 * Cloudflare requires a redeploy before the widget appears. Setting it and
 * seeing no widget is expected until the next build.
 */
export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <div className="pt-2">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        // Matches the site's warm palette rather than Turnstile's default dark.
        data-theme="light"
        // Most visitors are never challenged; this keeps the widget from
        // taking up space when it has nothing to show.
        data-appearance="interaction-only"
      />
      <noscript>
        <p className="mt-2 text-sm text-amber-700">
          JavaScript is required to complete this booking. If you'd rather not
          enable it, please email or call us and we'll book you in.
        </p>
      </noscript>
    </div>
  );
}
