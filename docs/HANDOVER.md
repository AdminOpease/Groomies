# Handover checklist

For when Groomies is transferred from the dev/setup account to the eventual business owner. Realistic time: ~1 hour end-to-end, most of it waiting for DNS.

---

## 1. Services set up in the dev account today

These were created during Phase 1–6 in `Admin@opease.co.uk`'s account. Each has one of three handover routes: **transfer**, **owner recreates**, or **share access**.

| Service | Identifier | Handover route |
|---|---|---|
| **GitHub repo** | `AdminOpease/Groomies` | *Best:* transfer ownership in Settings → Danger Zone → Transfer (30 sec). *Alternative:* add owner as admin, keep repo where it is. |
| **Supabase project** | Project ref `afbdldaqcibfcmocshvu`, org `AdminOpease's Org` | *Best:* fresh project in owner's Supabase org. Push migrations (`supabase db push`), export auth users, re-run `bootstrap_owner`. ~1 hour. *Alternative:* transfer the project between orgs if both use Supabase. |
| **Cloudflare Workers project** | `groomies` on Admin@opease.co.uk's account | Owner creates their own Cloudflare account, connects the (transferred) GitHub repo, pastes env vars. |
| **Cloudflare zone** `groomies.uk` | Same account, added 2026-07-21 | Owner adds the domain to their own account and recreates the records. **No one-click zone move on the Free plan.** See §1a. |
| **Domain `groomies.uk`** | Registered at **GoDaddy**, in Ozan's name | Registrar transfer — auth code + 5–7 days. **Start this first**, it's the only step that can't be rushed. |
| **`hello@groomies.uk`** | Cloudflare Email Routing → `groomiesltd@gmail.com` | Recreate in the owner's account (destination verify + one rule). Part of §1a. |

All free tier — no cost during handover except the domain renewal.

### 1a. Moving the Cloudflare zone — what's actually involved

Cloudflare offers no "transfer this zone to another account" button on Free, so
the owner rebuilds it. Everything needed is written down in
[DOMAIN_SETUP.md](./DOMAIN_SETUP.md) — this is transcription, not rediscovery.
Budget **30–60 minutes**.

Do it in this order, and **change the nameservers last** — the site and email
keep running on the old account until that final step, so there's no outage
window:

1. Owner creates a Cloudflare account, **Domains → Onboard a domain** → `groomies.uk`
2. Recreate the DNS records (Resend's DKIM + `send.` records, the `_dmarc` TXT)
3. Transfer the GitHub repo, connect it as a Worker, re-add build + runtime vars
4. Add custom domains `www.groomies.uk` and `groomies.uk` to the Worker
5. Recreate the apex→www redirect rule (template: *Redirect from root to WWW*)
6. Recreate Email Routing: verify the destination Gmail, add the `hello@` rule,
   let Cloudflare add its MX/SPF/DKIM
7. **Only now** point the registrar's nameservers at the owner's Cloudflare
8. Re-verify with the checks in DOMAIN_SETUP.md §9

**Why it isn't simpler:** the Cloudflare account is `Admin@opease.co.uk`, shared
with other opease projects, so handing over the account itself isn't an option.
Had Groomies been given its own Cloudflare account from the start, handover
would be a five-minute email change. Worth doing if handover is imminent;
otherwise the rebuild above is cheaper than redoing it now.

---

## 2. Services not yet created — owner should create in their own name

Wait to create these until handover. They belong in the owner's account from day one:

| Service | Purpose | Cost |
|---|---|---|
| **Resend** — https://resend.com | Booking confirmation emails + owner "new booking" alerts | Free: 3,000 emails/month. Pro: $20/mo above that. |
| **Stripe** — https://stripe.com | Deposits and full payments when the owner enables them | No monthly fee. ~1.5% + 20p per transaction. Owner needs business bank details to complete signup. Only needed when `business_settings.payments_enabled = true`. |
| **Cloudflare Turnstile** | Bot protection on the booking form | Free, unlimited. ⚠️ **Currently there is NO bot protection of any kind** — this row previously claimed "the honeypot in the form handles most abuse", but no honeypot exists in the code (checked 2026-07-21). The booking form is a public unauthenticated POST with no rate limit. Wire Turnstile before opening bookings. |
| ~~**Domain registrar**~~ | **Done — `groomies.uk` is registered and live**, at GoDaddy in Ozan's name. Needs a registrar transfer to the owner, not a fresh purchase. | renewal only |
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

### ⚠️ Connect the domain FIRST — it unblocks several other items

Several things are cheaper to do once, after the domain is live, than to set up
on `*.workers.dev` and redo:

| Item | Why it waits |
|---|---|
| **Cloudflare Web Analytics** | On a CF-proxied custom domain it works in *automatic* mode — no token, no script. On `workers.dev` it needs a token-based beacon that would then be redone, splitting stats across two hostnames. Code is already wired and env-gated on `NEXT_PUBLIC_CF_BEACON_TOKEN`; setting the var is all that's left. |
| **`NEXT_PUBLIC_SITE_URL`** | Sitemap + JSON-LD should point at the real domain |
| **Resend sending domain** | Emails from `hello@groomies.co.uk` rather than a shared sender — real deliverability difference |
| **Turnstile** | Site keys are domain-scoped |

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
| `NEXT_PUBLIC_SITE_URL` | The live domain — currently `https://www.groomies.uk`. **Build variable**, not a runtime one. | Public |
| `RESEND_API_KEY` | Resend → API Keys | **Secret** — server only |
| `RESEND_FROM` | The verified sender, currently `Groomies <hello@groomies.uk>`. Must be on a domain verified in Resend or every send 403s. Unset falls back to Resend's sandbox address, which delivers **only to the Resend account owner** — it looks fine in testing and reaches no customers. | Public-ish — server only |
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

**Start the registrar transfer days before the session** — see step 0. The rest
is a single sitting, ~1–1.5 hours.

The guiding rule: **the nameserver change is the last thing you do.** Until
then the live site and `hello@groomies.uk` keep running from the current
account, so a half-finished handover never takes the business offline.

0. **Registrar transfer (days ahead)** — unlock `groomies.uk` at GoDaddy, get
   the auth/EPP code, start the transfer to the owner's registrar. Takes 5–7
   days and cannot be hurried. Everything else waits on nothing.
1. **Cloudflare** — owner creates an account and adds `groomies.uk`
   (*Domains → Onboard a domain*). Records get recreated per
   [DOMAIN_SETUP.md](./DOMAIN_SETUP.md) §1a. **Do not change nameservers yet.**
2. **Supabase** — owner creates an org + project (UK/EU region for GDPR); dev
   pushes migrations (`supabase db push`); owner creates their admin auth user
   in Studio and calls `bootstrap_owner`
3. **GitHub** — transfer the repo to the owner's account
4. **Cloudflare Workers** — owner connects the repo, adds build vars
   (`NEXT_PUBLIC_*`) and runtime secrets, deploys
5. **Custom domains + redirect** — add `www.groomies.uk` and `groomies.uk` to
   the Worker, recreate the apex→www redirect rule
6. **Resend** — owner creates an account, adds `groomies.uk` as a sending
   domain, adds the DKIM + `send.` records, sets `RESEND_API_KEY` and
   `RESEND_FROM`
7. **Email Routing** — verify the destination Gmail, recreate the `hello@` rule,
   let Cloudflare add its MX/SPF/DKIM
8. **Stripe** (only if going live with deposits) — owner opens an account,
   connects a bank, adds keys, flips `business_settings.payments_enabled = true`
9. **Cut over** — point the registrar's nameservers at the owner's Cloudflare.
   This is the only step with any user-visible effect.
10. **Verify** — run the checks in DOMAIN_SETUP.md §9, then make a **test
    booking** and confirm both emails arrive. A green deploy is not proof.

Most of the wall-clock is waiting on DNS and Stripe verification; the clicking
is well under an hour.

---

## 6. Post-handover — what dev keeps

Once transferred, the dev/setup account has:
- No access to the site, database, or emails
- The GitHub repo transferred out
- No environment variables in Cloudflare
- No production API keys anywhere

Any dev work after handover is done against a **separate** dev Supabase project (owner's) with a **staging** deploy of the Worker — keeps live customer data untouched during development.
