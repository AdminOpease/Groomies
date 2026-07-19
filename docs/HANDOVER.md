# Handover checklist

For when Groomies is transferred from the dev/setup account to the eventual business owner. Realistic time: ~1 hour end-to-end, most of it waiting for DNS.

---

## 1. Services set up in the dev account today

These were created during Phase 1–6 in `Admin@opease.co.uk`'s account. Each has one of three handover routes: **transfer**, **owner recreates**, or **share access**.

| Service | Identifier | Handover route |
|---|---|---|
| **GitHub repo** | `AdminOpease/Groomies` | *Best:* transfer ownership in Settings → Danger Zone → Transfer (30 sec). *Alternative:* add owner as admin, keep repo where it is. |
| **Supabase project** | Project ref `afbdldaqcibfcmocshvu`, org `AdminOpease's Org` | *Best:* fresh project in owner's Supabase org. Push migrations (`supabase db push`), export auth users, re-run `bootstrap_owner`. ~1 hour. *Alternative:* transfer the project between orgs if both use Supabase. |
| **Cloudflare Workers project** | `groomies` on Admin@opease.co.uk's account | *Best:* owner creates their own Cloudflare account, connects the (transferred) GitHub repo, pastes env vars. 5 min. |

All three are on free tiers — no cost during handover.

---

## 2. Services not yet created — owner should create in their own name

Wait to create these until handover. They belong in the owner's account from day one:

| Service | Purpose | Cost |
|---|---|---|
| **Resend** — https://resend.com | Booking confirmation emails + owner "new booking" alerts | Free: 3,000 emails/month. Pro: $20/mo above that. |
| **Stripe** — https://stripe.com | Deposits and full payments when the owner enables them | No monthly fee. ~1.5% + 20p per transaction. Owner needs business bank details to complete signup. Only needed when `business_settings.payments_enabled = true`. |
| **Cloudflare Turnstile** | Bot protection on the booking form | Free, unlimited. Optional — the honeypot in the form handles most abuse. Enable if we see problems. |
| **Domain registrar** | e.g. `groomies.co.uk` | £8/year `.co.uk`, ~$10/year `.com`. Cheapest via Cloudflare Registrar (no markup). Register in the owner's name. |
| **UK address lookup** — see below | Postcode → address autocomplete on the booking form | ~£5/mo (getaddress.io) or ~2p per lookup (Ideal Postcodes). **Requires a paid account — there is no free option.** |

### UK address lookup (postcode → address)

Wanted so customers can type a postcode and pick their address instead of typing
it free-hand — fewer wrong addresses, and it gives us a clean postcode for the
geo-fencing rule (only accept bookings in the postcode areas the van is covering
that day).

There is **no free source of house-level UK addresses** — the data is Royal Mail
PAF and every provider licenses it. Options:

| Provider | Model | Notes |
|---|---|---|
| **getaddress.io** | ~£5/month | UK-only, simplest API, generous free trial. Best starting point. |
| **Ideal Postcodes** | ~2p per lookup | Pay-as-you-go, no monthly commitment. Better if volume is low. |
| **Loqate** | Enterprise pricing | Overkill at this size. |
| **Google Places** | Pay-per-use, needs a billing account | Works, but more setup and less UK-address-specific. |

Free alternative if the budget isn't there: **postcodes.io** validates a postcode
and returns its district/area for free. That's enough for the geo-fencing rule
(is this booking in LU?) but it can NOT return a list of addresses — the customer
still types their street and house number by hand.

Whichever is chosen, it needs an API key adding as `ADDRESS_LOOKUP_API_KEY`.

### Sending domain (Resend)

For real launch, verify the owner's own domain in Resend so emails come from e.g. `hello@groomies.co.uk` instead of Resend's shared sender. Verification is a few DNS records — quick if the domain is on Cloudflare too. Skip until domain is confirmed.

---

## 3. Recommended for launch, ~30 min each

Not in the codebase yet but standard operating equipment for a live consumer product:

| Service | Purpose | Cost |
|---|---|---|
| **Sentry** — https://sentry.io | Catches JS/server errors in production so bugs are visible, not silent | Free tier: 5,000 events/month |
| **Cloudflare Web Analytics** | Privacy-friendly page views, cookieless (no consent banner needed for a UK business) | Free, unlimited. One-line enable inside the CF dashboard |

Deliberately **not** on this list:
- **Google Analytics** — requires a cookie consent banner, which we've avoided
- **Twilio (SMS reminders)** — Phase 8+, spec calls it out as later work

---

## 4. Environment variables — where each lives

For each of the below, they live in **two** places once we're in production:
- **Local `.env.local`** — for the dev machine, never committed
- **Cloudflare Workers → Groomies → Settings → Variables** — for production

| Variable | Comes from | Public or secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings | Public (browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API Keys → publishable | Public (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys → secret | **Secret** — server only |
| `NEXT_PUBLIC_SITE_URL` | The live domain (e.g. `https://groomies.co.uk`) | Public |
| `RESEND_API_KEY` | Resend → API Keys | **Secret** — server only |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys | **Secret** — server only, when payments on |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → endpoint signing secret | **Secret** — server only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → API keys | Public |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile widget | Public |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile widget | **Secret** — server only |
| `ADDRESS_LOOKUP_API_KEY` | Chosen address provider (see §2) | **Secret** — server only, when address lookup is added |

⚠️ **`NEXT_PUBLIC_*` variables are baked in at BUILD time, not read at runtime.**
Setting one in Cloudflare only takes effect on the next build — and if deploys
are running from a local machine, it must be in `.env.local` too. Everything
else is read at runtime and takes effect immediately.

---

## 5. Handover session — running order

Single sitting with the owner, ~1 hour end-to-end.

1. **Domain** — either transfer the existing one to owner's registrar, or owner buys a fresh one via Cloudflare Registrar
2. **Cloudflare** — owner creates an account, verifies email, adds the domain, enables Cloudflare Web Analytics
3. **Supabase** — owner creates an org + project (UK/EU region, matches GDPR requirement); dev pushes migrations (`supabase db push`); owner creates their admin auth user via Studio and calls `bootstrap_owner`
4. **GitHub** — transfer the repo to the owner's GitHub account
5. **Cloudflare Workers** — owner connects the (now theirs) GitHub repo, pastes all env vars, deploys
6. **Resend** — owner creates account, adds sending domain (DNS records), gets API key, adds to Cloudflare env vars
7. **Stripe** (only if going live with deposits) — owner opens account, connects bank, gets keys, adds to Cloudflare env vars, flips `business_settings.payments_enabled = true`
8. **Custom domain** — connect the domain to the Worker in Cloudflare Pages settings; update `NEXT_PUBLIC_SITE_URL` env var to match

Total time depends mostly on DNS propagation (Resend domain verification, Stripe verification) — the clicking parts take <30 minutes.

---

## 6. Post-handover — what dev keeps

Once transferred, the dev/setup account has:
- No access to the site, database, or emails
- The GitHub repo transferred out
- No environment variables in Cloudflare
- No production API keys anywhere

Any dev work after handover is done against a **separate** dev Supabase project (owner's) with a **staging** deploy of the Worker — keeps live customer data untouched during development.
