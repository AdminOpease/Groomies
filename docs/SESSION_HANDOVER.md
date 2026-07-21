# Session handover — Groomies

For picking the project back up (or handing off to a new Claude Code session). Everything a fresh session needs to be productive in the first 5 minutes.

For the eventual business-owner handover (accounts, transfer, DNS), see [HANDOVER.md](./HANDOVER.md). For the DB restore procedure see [BACKUPS.md](./BACKUPS.md).

---

## 1. What Groomies is

Mobile pet grooming booking platform. Van travels to scheduled stops or covers service areas door-to-door on scheduled days; customers book a slot at a specific stop/date. Not a salon.

Being built in Ozan's own accounts (GitHub, Supabase, Cloudflare) as a solo project. Everything is designed to be transferable to an eventual business owner later — schema in migrations, env vars for all secrets, no manual dashboard-only config.

---

## 2. Current state — top-line

| # | Phase | Status | Commit |
|---|---|---|---|
| 1 | Scaffold (Next.js 16 + TS + Tailwind v4 + OpenNext Cloudflare) | ✅ | `9384c2b` |
| 2 | Schema + RLS + book_slot RPC + 19 security tests | ✅ | `bb94b36` |
| 3 | Admin auth + Locations CRUD | ✅ | `333de4a` |
| 4 | Dates + slots + recurring generator | ✅ | `d2aef23` |
| 5 | Public site + live availability | ✅ | `2145337` |
| 6 | Booking flow + manage-by-token + Resend + Stripe stubs | ✅ | `ed1c829` |
| 7 | Admin bookings + services + business settings | ✅ | `1531d10` |
| 8 | Legal pages + GDPR erasure + usage widget + backups doc | ✅ | `612a9f9` |
| — | Search + slot-count toggle | ✅ | `f3cbe46` |
| — | Design pass 1 (olive palette, Fraunces serif, hero photos, sections) | ✅ | `3b57471` |
| — | Logo/header polish + "from" pricing flag | ✅ | `558012b` |
| — | Size-tiered pricing (real price list + book-by-size) | ✅ | `a5616dd` |
| — | Booking add-ons + running total | ✅ | `76192fe` |
| — | Pricing-guard regression tests (29 total) | ✅ | `0731477` |
| — | Breed type-ahead + crosses, 30% deposits | ✅ | `8f51e43` |
| — | Postcode geo-fencing (area level) | ✅ | `8e80e8d` |
| — | Drop 13-arg book_slot shim | ✅ | `beb5d88` |
| — | Cloudflare Web Analytics (env-gated, dormant) | ✅ | `3906d8c` |
| — | Booking form: require groom, split extras, drop species | ✅ | `f5f45f3` |

**Everything works. Real bookings could be taken today. Design pass is ongoing.**

Live URL: `https://groomies.billowing-firefly-f15a.workers.dev` (Cloudflare Workers).  
GitHub: https://github.com/AdminOpease/Groomies  
Supabase project ref: `afbdldaqcibfcmocshvu`  
Local path: `/Users/ozanulasan/Projects/groomies/`  

Pushing to `main` triggers a Cloudflare build and deploys. `pnpm deploy` is the
manual fallback. Either way, **verify the live site afterwards** — a green build
can still ship a site that can't reach the database. See §8 — this was broken
for most of 2026-07-20 and silently left the live site behind `main`.

---

## 3. What's OPEN right now

**Design polish — mid-flight.** Owner said the site was "too plain, more for old people". We pivoted to editorial-minimalist:

- Full split hero (bold display type left, single big cinematic photo right)
- Killed laurels, killed ornate circular seal
- Fraunces serif for display type, cream body background, olive brand
- Local hero photo at `/Image Groomies.png` (owner's file, dropped into `public/`)
- Real logo at `/Groomies Logo.png` (transparent PNG) rendered by header/footer via `business_settings.logo_url`

**Reversal to know about:** Luxury Spa Upgrades and VIP Club were cut in design
pass 1 as "too old-people", then explicitly asked back in when the real printed
price list arrived. Both now live on `/services`. Don't "helpfully" remove them
again on the strength of the older note.

**Logo — settled (don't re-litigate without being asked).** The source PNG had
huge *uneven* transparent padding: artwork was only 33% of the image height and
sat off-centre (bottom pad 415px vs top 267px). That's why it looked small and
crooked, and why enlarging it grew the whole header. Fixed by trimming the PNG
to its artwork and re-padding evenly (31px all round), committed over the same
path so no DB change was needed.
- Header: fixed `h-16` bar, logo `h-10 sm:h-12` — `_components/Header.tsx`
- Footer: logo `h-12 sm:h-14` — `_components/Footer.tsx`
- Hero: logo `h-20 sm:h-24` above the eyebrow — `app/(public)/page.tsx`
- The original untrimmed PNG is recoverable via `git show 558012b^:"public/Groomies Logo.png"`

**Pricing model — read this before touching services or booking.**

Grooming is priced by dog size, so one `services.price_cents` was never enough.

- `service_variants` = size tiers (`label`, `price_cents`, `price_from`, `sort_order`).
  A service with **no** active variants keeps its flat `services.price_cents`
  (all the add-ons, Puppy Introduction). A service **with** variants is priced
  per size and its own `price_cents` is only a fallback.
- `services.category` = free-form price-list section heading. `/services` groups
  by it, ordering sections by the lowest `sort_order` in each. Uncategorised
  services fall into a trailing "More services" group rather than vanishing.
  Sections are therefore owner-editable — **do not hardcode section names.**
- `price_from` (on both services and variants) renders "From £45" instead of "£45".
  Per the printed list: Full Groom is "From" on every size; Bath & Freshen Up is exact.
- `bookings.service_variant_id` + `bookings.price_cents` — the price is
  **snapshotted at booking time**, so changing a price later never rewrites what
  a past customer was quoted. Read the booking's own `price_cents`, never the
  service's current price.
- `book_slot` requires a size when the service has tiers (`VARIANT_REQUIRED`,
  P0007) and rejects a size belonging to a different service (`VARIANT_INVALID`,
  P0008) — so a Large groom can't be booked at the Small price. Resolved *before*
  the capacity check so a bad size never consumes a slot.
- Owner manages tiers at `/admin/services/[id]` (Size tiers panel) and the
  section heading via the "Price-list section" field.

Source of truth for the numbers is the owner's printed price list (Full Groom
£45/£55/£70/£85 from; Bath & Freshen £30/£40/£50/£60 exact).

**Add-ons.** `booking_addons` holds extras attached to a booking; each row
snapshots the service's price AND name, so a later rename or deletion never
rewrites history. `bookings.total_cents` = main + extras, also a snapshot. An
extra must be an active service with no size tiers and can't repeat the main
service (`ADDON_INVALID`, P0009); duplicates are deduped, not double-charged.

**⚠️ The `sort_order >= 100` rule is load-bearing.** It decides whether a
service is a bookable groom or an optional extra:

| sort_order | Where it appears |
|---|---|
| under 100 | the booking form's **service dropdown** (a groom you book) |
| 100 or over | the **"Add extras"** tick-boxes |

It also drives the old signature/add-on split. Before this was enforced, both
lists were wrong in *both* directions — every spa extra appeared as a bookable
service, and Puppy Introduction / Hand Stripping / De-Matting appeared as
tick-on extras. The admin's sort-order hint now spells this out; keep it that
way if you change the rule.

**Deposits.** `business_settings.deposit_percent` (default 30). `book_slot`
computes the deposit from the booking's own total and snapshots it onto
`bookings.deposit_cents`. Two switches that mean different things:

- `deposit_mode` (`off` / `deposit` / `full`) — what is **owed**
- `payments_enabled` — whether we **collect** it

They're deliberately separate, which is what makes "works the moment Stripe is
connected" true: the amount is already calculated, stored and displayed
everywhere. **Currently `deposit_mode = 'deposit'` at 30%, `payments_enabled =
false`** — so customers see "Deposit (30%) £25.50 · payable on the day".

**Geo-fencing.** `locations.postcode_areas text[]` — allowed postcode **AREAS**
(letters only: `{LU}`). Empty = no restriction. `bookings.postcode` stores the
normalised postcode separately from the free-text address, because you cannot
fence reliably on an address blob. Errors: `POSTCODE_REQUIRED` (P0010),
`POSTCODE_INVALID` (P0011), `POSTCODE_OUT_OF_AREA` (P0012), all checked before
the capacity check so a rejection never consumes a slot.

**Area level, not district — this was a deliberate call.** A town does not map
to one postcode: Dunstable is LU5 **and** LU6, and LU6 itself spills into
Buckinghamshire and Dacorum (verified against postcodes.io). Area level also
avoids a silent bug — with district rules, naive prefix matching makes `MK4`
match `MK46` too, accepting a booking 20 miles away. Comparing only the letters
cannot fail that way. **Dunstable is currently fenced to `LU`.**

**Breeds.** `lib/dog-breeds.ts` — 188 breeds bundled locally (no API, no cost,
can't break the form if a third party is down), including the crossbreeds that
matter most to a groomer. Native `<datalist>` type-ahead; anything off-list can
still be typed. "It's a cross of two breeds" reveals a second field, stored as
one value via `combineBreeds()` → `"Cockapoo × Poodle"`. Deliberately NOT a new
column: breed is informational, and this avoided a fourth `book_slot` signature
change. Species is always `dog` (hidden field) — the selector was removed.

### ⚠️ Two live issues to resolve before taking real money

**1. The cancellation message promises a refund that nothing issues.**

`app/(public)/manage/[token]/_components/CancelButton.tsx` tells a customer
cancelling inside the refund window:

> "Your deposit will be refunded automatically — allow a few business days for
> it to land."

**Nothing triggers a refund.** The Stripe checkout route and webhook are both
stubs returning 501. `payment_status` can hold `'refunded'` but nothing sets it.

Harmless today (payments are off, no money is taken) but **the moment Stripe is
connected this becomes a false promise to paying customers** — the kind that
produces chargebacks. Either wire refunds up, or reword to "we'll process your
refund manually". Owner was told; not yet actioned.

**2. Payments state, accurately:**

| | |
|---|---|
| Booking reference | ✅ exists — `GR-XXXXX`, ambiguous characters excluded so it reads over the phone |
| Receipts | ❌ none from us. Stripe can send its own (dashboard → Customer emails). Our confirmation email exists but is dormant and doesn't itemise price/deposit. |
| Refunds | ❌ not implemented. Manual via Stripe Dashboard is fine at this volume — money returns to the original card automatically; we never see or store card/bank details. |

### ⚠️ Domain: `groomies.uk` has LIVE email and a live site — do not touch DNS yet

Checked 2026-07-20. The domain is registered at **GoDaddy** (`ns55/ns56.domaincontrol.com`) and is **actively in use**:

```
MX      groomies-uk.mail.protection.outlook.com   ← Microsoft 365, LIVE
TXT     NETORGFT20373999.onmicrosoft.com          ← M365 tenant (GoDaddy-resold)
SPF     v=spf1 include:secureserver.net -all
DMARC   v=DMARC1; p=quarantine; …
CNAME   autodiscover → autodiscover.outlook.com
SRV     _sip._tls → sipdir.online.lync.com
A       76.223.105.230 / 13.248.243.5  → GoDaddy Website Builder site (HTTP 200)
```

**Pointing nameservers at Cloudflare moves ALL DNS.** Without recreating those
records first, **the owner's email stops arriving instantly** — and email
failure is silent, so nobody notices until customers complain.

Owner wants "everything directed to their Gmail", which could mean either:
- **Keep M365**, forward to Gmail (set up inside M365, not DNS). Nothing breaks.
- **Drop M365**, use Cloudflare Email Routing → Gmail (free). Mailbox stops
  receiving; anything in it must be exported first, and the GoDaddy
  subscription cancelled.

**Questions the owner must answer before any DNS change** (asked 2026-07-20,
answers pending):
1. Do you use the `@groomies.uk` mailbox? Is there mail worth keeping?
2. Are you paying for that Microsoft 365 subscription?
3. Keep M365 + forward, or switch to free forwarding?
4. What address should people write to, and which Gmail should it land in?
5. The GoDaddy site will be replaced — anything on it worth keeping?
6. Is `groomies.uk` on any printed material (van, flyers)?

**Not yet done (nice-to-haves, not blockers):**
- Supabase Storage bucket + admin upload UI for logo/photos (owner uploaded logo + hero via `public/` for now; Storage is planned so they can swap via /admin)
- Real customer photos throughout the site (still using Unsplash placeholder + owner's one hero photo)
- Real testimonials (currently 2 placeholder quotes on home)
- Sentry error tracking (mentioned in HANDOVER.md but not wired)
- Cloudflare Web Analytics — CODE IS ALREADY WIRED, env-gated on
  `NEXT_PUBLIC_CF_BEACON_TOKEN` (renders nothing without it). Deliberately
  waiting for the custom domain: on a CF-proxied domain it works in automatic
  mode with no token or script at all, so doing it now on workers.dev would be
  redone and would split stats across two hostnames.
- Verified Resend sending domain (for real launch — currently sends from `onboarding@resend.dev` placeholder)

**Two setup items owner still needs to do (not blocking):**
- Set `contact_email` in `/admin/settings` (falls back to nothing → owner alert emails skip)
- Add `RESEND_API_KEY` to Cloudflare env vars (emails currently log-and-skip)
- Optional: set `NEXT_PUBLIC_SITE_URL` in Cloudflare env to the live workers.dev URL so sitemap/JSON-LD are accurate

---

## 4. Tech stack

Locked by the original build spec (`/Users/ozanulasan/Downloads/mobile-grooming-platform-prompt_1.md`) — read that for the "why" behind any decision.

- **Next.js 16** App Router · TypeScript · **Tailwind v4**
- **@supabase/supabase-js** + **@supabase/ssr** (browser talks to Supabase directly with anon key; RLS is the security boundary)
- **@opennextjs/cloudflare** adapter → Cloudflare Workers Static Assets (the URL is `.workers.dev`; product is what used to be Cloudflare Pages)
- **middleware.ts** (NOT `proxy.ts` — Next.js 16's new proxy runtime is Node-only, and Cloudflare Workers only support Edge. Middleware is deprecated but works and stays Edge.)
- **Resend** for transactional email (env-gated on `RESEND_API_KEY`)
- **Stripe** scaffolding present but dormant (env-gated on `STRIPE_SECRET_KEY`)
- **Framer Motion** for entrance animations (respects `prefers-reduced-motion`)
- **Fraunces** (Google Fonts, variable) as `--font-fraunces` / `--font-display` for headings
- **Geist Sans** for body
- **pnpm** — `packageManager: "pnpm@11.1.2"` pinned so Cloudflare builds use the same as local
- **Vitest** for RLS/security tests

---

## 5. Where things live

### Repo layout
```
groomies/
├── app/
│   ├── (public)/              marketing pages + booking + manage
│   │   ├── page.tsx           home (redesigned editorial version)
│   │   ├── locations/         /locations + /locations/[slug]
│   │   ├── book/[slotId]/     booking form
│   │   ├── manage/[token]/    view/cancel own booking
│   │   ├── services/, about/, contact/, privacy/, terms/, refund/
│   │   └── _components/       Header, Footer, FadeIn, BrandIcons
│   ├── admin/
│   │   ├── login/             public
│   │   ├── (authed)/          auth-gated layout + dashboard + all admin
│   │   └── actions.ts         signOut server action
│   ├── api/stripe/            checkout + webhook (dormant)
│   ├── sitemap.ts, robots.ts, globals.css, layout.tsx (root)
├── lib/
│   ├── supabase/
│   │   ├── browser.ts         @supabase/ssr client component client
│   │   ├── server.ts          @supabase/ssr server component/action client
│   │   ├── public.ts          plain anon client for static/ISR pages
│   │   └── service.ts         service-role client, null if key not set
│   ├── email.ts               Resend integration, best-effort
│   └── format.ts              date/time/money helpers (Europe/London)
├── middleware.ts              session refresh + admin auth gate
├── supabase/
│   ├── config.toml
│   └── migrations/            SQL, timestamp-prefixed, all applied to remote
├── public/                    static assets — Groomies Logo.png, Image Groomies.png, etc.
├── tests/                     vitest security tests
├── docs/
│   ├── HANDOVER.md            owner-transfer checklist
│   ├── BACKUPS.md             DB restore procedure
│   └── SESSION_HANDOVER.md    ← this file
├── next.config.ts             includes `images.unsplash.com` in remotePatterns
├── open-next.config.ts, wrangler.jsonc
├── pnpm-workspace.yaml        approves build scripts (esbuild/sharp/workerd/unrs)
└── .env.example
```

### Migration files
All applied to remote Supabase (some via CLI, some pasted directly into Studio when the CLI hung). Idempotent guards on the ones that got applied twice.

```
20260707230000_core_helpers_and_profiles.sql
20260707230100_locations_dates_slots.sql
20260707230200_bookings.sql
20260707230300_rls_policies.sql
20260707230400_book_slot_rpc.sql
20260707230500_manage_by_token_rpcs.sql
20260707230600_scheduled_jobs.sql
20260707230700_bootstrap_owner.sql
20260708000000_location_slugs.sql
20260708100000_admin_booking_rpcs.sql
20260708100100_completed_no_show_status.sql
20260708200000_phase8_hardening.sql
20260708220000_slot_count_visibility.sql
20260710120000_service_price_from.sql        # "From £X" display flag
20260710170000_service_size_tiers.sql        # service_variants, category,
                                             # booking price snapshot,
                                             # tier-aware book_slot (+ old-
                                             # signature compat shim)
20260719200000_booking_addons.sql            # booking_addons, total_cents
20260719220000_drop_book_slot_shim.sql       # dropped the 12-arg shim
20260719230000_deposit_percentage.sql        # deposit_percent + deposit maths
20260720000000_postcode_geofence.sql         # postcode_areas, bookings.postcode
20260720010000_drop_book_slot_13arg_shim.sql # dropped the 13-arg shim
```

---

## 6. Env vars

Set in `.env.local` (gitignored, local dev). Production versions live in Cloudflare Workers env.

Required for the app to run at all:
- `NEXT_PUBLIC_SUPABASE_URL` — `https://afbdldaqcibfcmocshvu.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the publishable key
- `SUPABASE_SERVICE_ROLE_KEY` — the secret key (server-only, needed by security tests + owner-email lookup)

Optional but wired:
- `RESEND_API_KEY` — enables real email sending; without it emails log-and-skip
- `NEXT_PUBLIC_SITE_URL` — canonical URL for sitemap/robots/JSON-LD; falls back to `http://localhost:3000`

Not yet wired (Stripe on-ramp):
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Not yet wired (bot protection):
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`

See `.env.example` for the full template.

---

## 7. Common commands

```bash
cd ~/groomies

# Dev
pnpm dev                      # localhost:3000, hot reload
pnpm build                    # local production build
pnpm exec opennextjs-cloudflare build   # what CF runs; use to catch CF-only errors

# Tests
pnpm test:security            # RLS + booking-race + hold-expiry + manage-token tests
                              # Runs against the REAL Supabase project — needs SERVICE_ROLE_KEY

# Supabase migrations
pnpm exec supabase db push --linked --yes   # HANGS SOMETIMES — see gotcha below
# When it hangs, paste the migration into the Studio SQL editor instead.
# Handy: pbcopy < supabase/migrations/<file>.sql   → then ⌘V into Studio

# Deploy — pushing to main builds automatically; these are the manual fallback
pnpm exec wrangler login      # once per machine
pnpm deploy                   # build + deploy to Cloudflare
pnpm preview                  # build the CF bundle and serve locally first
```

---

## 8. Gotchas (order of "would have wasted an hour on this")

### Never `pkill` a user-facing app (this closed Ozan's browser)

`pkill -f "Google Chrome"` was used to clear stuck **headless** Chrome
processes. It matches the real browser too, and force-quit Ozan's actual
windows and tabs mid-work. Don't do it.

If a headless browser hangs: launch it with its own
`--user-data-dir=$(mktemp -d)` and kill only that, or just leave it. Better
still, prefer `curl` + parsing — a real browser is only needed when JavaScript
must actually run (e.g. availability, which is client-side rendered).

### Don't run `pnpm build` / `pnpm deploy` while `pnpm dev` is running

They share the `.next` directory. The production build corrupts the dev
server's state and Turbopack panics with `Next.js package not found`. Symptom:
the dev server still answers requests, but the browser reloads endlessly
because hot-reload is broken.

Fix: `pkill -f "next dev"`, `rm -rf .next`, restart. Stop the dev server before
any build.

### Server HTML ≠ what the user sees

Availability (dates, slots, `/book/` links) is fetched **client-side**. So
`curl` on `/locations/dunstable` legitimately shows "Loading available dates…"
and zero `/book/` links — that is **not** a bug. Twice this was misread as a
broken site. To check availability you must actually run JavaScript, or just
ask the user to look.

Conversely `/services` is server-rendered, so it can look fine while the
client-side booking flow is broken. Checking only one proves nothing about the
other.

### The Supabase CLI hangs on `db push`
Sometimes hangs at "Initialising login role..." with no error. Workaround that always works:
1. Open https://supabase.com/dashboard/project/afbdldaqcibfcmocshvu/sql/new
2. Copy the migration SQL body directly into the SQL editor
3. Click Run
4. Also mark it applied by adding to `supabase_migrations.schema_migrations` if you want the CLI to stay in sync — usually not necessary because we make migrations idempotent

Migrations 012 and 013 in this repo have both been applied through Studio at some point — they're written with `if not exists` / `create or replace` so re-running is safe.

### Filenames with spaces in `public/`
Files like `Image Groomies.png` and `Groomies Logo.png` work but are fragile. Next.js handles URL encoding when you reference them in JSX (`src="/Image Groomies.png"`). Fine locally; may cause issues on some CDN configurations. If we hit any weirdness, rename to kebab-case.

### Deploys: `git push` works, but verify — and know the manual fallback

Cloudflare Workers Builds **is** connected to `AdminOpease/Groomies` and builds
on push to `main`. Confirmed working 2026-07-20: a push produced a build and a
new deployment, and the live site still reached Supabase afterwards.

**It was broken for most of that day**, which is worth knowing because the
failure is silent:

- The GitHub App authorization had lapsed — Settings showed a connected repo and
  build config, but no builds fired. A banner said *"This project is
  disconnected from your Git account."* **Reconnecting via Manage/Disconnect →
  reconnect fixed it.**
- While broken, `main` ran several commits ahead of the live site with no
  indication anything was wrong.
- **Reconnecting clears the build variables.** They must be re-added or the next
  build compiles with an undefined Supabase URL.

**Where builds appear:** a "Recent builds" section on the Worker (there is no
top-level "Builds" tab — don't read its absence as "not connected", that
misdiagnosis cost time).

**Build variables** (Settings → Build) — separate from the Worker's runtime
"Variables and secrets", and required because `NEXT_PUBLIC_*` is inlined at
build time:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`

**Manual deploy** still works and is the fallback if a build fails:
```bash
pnpm exec wrangler login   # once per machine
pnpm deploy
```

**Always verify after deploying, however it deployed.** A build can pass and
still ship a site that cannot reach the database — "green" is not proof:
```bash
curl -s https://groomies.billowing-firefly-f15a.workers.dev/services | grep -c "Full Groom Packages"
```
Note `/services` and `/` use `revalidate = 3600` (ISR), so a stale page can
persist briefly even after a good deploy.

### Migrations that change an RPC signature need a compatibility shim

The live Worker keeps calling the OLD function signature until a new build is
deployed. Dropping/replacing a signature in the same migration breaks live
bookings for that whole window.

Pattern used for `book_slot` when adding `p_service_variant_id`: create the new
signature, and keep the old one as a thin wrapper forwarding to it with the new
arg null. PostgREST resolves overloads by the argument names in the request
body, so both coexist. Drop the old one only after the new build is confirmed
live. See `20260710170000_service_size_tiers.sql`.

### Cloudflare deploy: `proxy.ts` vs `middleware.ts`
Next.js 16 introduced `proxy.ts` as a middleware replacement, but proxy is **Node.js-only by design**. Cloudflare Workers only support Edge runtime. We use the deprecated-but-Edge `middleware.ts`. Do NOT rename to proxy.ts — CF build fails.

### `type="url"` HTML5 validation
The Logo URL field in `/admin/settings` was silently blocking submission because relative paths like `/Groomies Logo.png` don't validate as URLs. Fixed by switching to `type="text"`. If you hit similar "form scrolls but doesn't save" behaviour elsewhere, check for HTML5 input types.

### Emerald → Olive colour override
The whole site uses `bg-emerald-*` / `text-emerald-*` classes but the actual colours are olive. `app/globals.css` overrides the Tailwind emerald scale via `@theme inline` — single source of truth. Do NOT set literal hex values on components; use the emerald classes and the palette flows.

### Unsplash 404s
Not every Unsplash photo ID is stable. When picking a placeholder, verify with `curl -I` first. Verified working IDs recorded in commit messages.

### React 19 form action reset
`useActionState` resets form fields on submit by default. On error paths we echo the submitted values back in the state so the form doesn't blank out. Pattern is on the booking form (`app/(public)/book/[slotId]/actions.ts`) — copy that pattern for any new user-facing form.

### Preview server (harness detail)
This project lives at `/Users/ozanulasan/Projects/groomies/` but the Claude harness's `preview_start` MCP has been scoped to a different directory (`opease-frontend`). Do NOT use `preview_start` — it'll try to boot the wrong project. Use `pnpm dev` in a background Bash task and `curl` / `open http://localhost:3000` to verify.

For screenshots without the preview MCP, headless Chrome works well:
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1280,2000 --screenshot=/tmp/shot.png http://localhost:3000/
```
It occasionally hangs — `pkill -f "Google Chrome"` and retry. For content checks
(is a section/price on the page?), curl + a regex over the HTML is faster and
more reliable than a screenshot.

The user has a memory note about this too:
> "Keep separate projects separate — don't touch opease while working on another project, even if harness prompts (e.g. preview server) suggest it"

---

## 9. Design language — where we've landed

### ⚠️ Olive branches — attempted and REVERTED, needs a reference before retrying

Owner asked for "olive branches on the sides of each page" (echoing the leaf
motif on the printed price list). Two attempts were made and both rejected:

1. `fixed` position, 7% opacity, behind content — rejected: "not the design I
   wanted nor the way it's moving with the page" (fixed made them hover while
   the page scrolled).
2. `absolute`, 25% opacity, z-10 above the section backgrounds — rejected:
   "even worse".

**Both were reverted** (nothing committed; the Services hero laurel was
restored). `PageBranches.tsx` no longer exists.

One real constraint learned: the page sections have solid full-width
backgrounds (`bg-white`, `bg-emerald-50`), so anything placed *behind* them is
invisible regardless of opacity. Decoration has to overlay (with
`pointer-events-none`) or live inside a section.

**Do not retry from a guess.** Get a screenshot or reference first, and
establish: placement (top corners vs full-length sides), prominence (graphic vs
watermark), and whether the existing `LaurelIcon` artwork itself is wrong — it
is a stiff symmetrical spray, whereas the price list uses a looser natural
olive branch. The shape may be the actual problem, not the position.


Fluid, but the direction so far:
- **Palette:** olive brand (`#6d7042` primary, `#545732` strong, `#f5f1e0` soft cream) + stone neutrals + warm cream body (`#f8f4e6`). Tailwind's `emerald` scale is remapped to this olive in `app/globals.css`.
- **Type:** Fraunces (variable serif) for display — usually italic-inflected, uppercase eyebrows with tracking `[0.22em]`. Geist for body.
- **Motifs:** minimal. Owner explicitly rejected the ornate laurel/circular seal direction ("too old-people"). We're on editorial-minimalist: bold display type, one big cinematic photo, generous whitespace, no bunting.
- **Sections:** hero → dark-olive trust strip → statement → How it works (three cards with big italic "One / Two / Three" watermarks) → services teaser → dark-olive studio moment → areas → testimonials → dark-olive CTA band.
- **Animations:** `FadeIn` component wraps sections, gentle fade+rise on scroll, respects `prefers-reduced-motion`.

---

## 10. Preview server pattern (for a fresh Claude session)

```bash
# From project root
cd /Users/ozanulasan/Projects/groomies

# Start (backgrounded)
pnpm dev &

# Verify
curl -sf -o /dev/null http://localhost:3000/ && echo UP || echo DOWN

# Open in browser
open http://localhost:3000/

# Stop
pkill -f "next dev"
```

If a change is code-only (no UI), skip the dev server and just `pnpm build` to catch type errors.

---

## 11. Memory context (persisted across Claude sessions)

The user has this in Claude's auto-memory (`~/.claude/projects/.../memory/`):
- `project_groomies.md` — running snapshot of the build, paths, decisions, current phase
- `feedback_separate_projects.md` — do NOT touch the opease worktree when working on Groomies, even if harness tools suggest it
- `MEMORY.md` — index

If picking up in a fresh session, those load automatically.

---

## 12. Immediate next steps (if the user asks "what next?")

Current settings state (checked 2026-07-20): geo-fence **ON** (Dunstable = LU),
deposits **ON** (30%, `payments_enabled=false`), `contact_email` **NOT SET**,
`RESEND_API_KEY` **NOT SET**, Stripe **NOT SET**.

1. **`contact_email` in `/admin/settings`** — 30 seconds. Right now the footer
   shows no way to reach the business and owner alert emails have nowhere to go.
2. **Domain (`groomies.uk`)** — but ONLY after the owner answers the email
   questions in §3. It unblocks four things at once: CF Web Analytics
   (automatic mode, code already wired), `NEXT_PUBLIC_SITE_URL`, the Resend
   sending domain, and Turnstile.
3. **Resend + `SUPABASE_SERVICE_ROLE_KEY`** as an encrypted Cloudflare runtime
   secret. Today a real booking notifies **nobody** — not the customer, not the
   owner. Biggest functional gap.
4. **Fix the refund promise** in `CancelButton.tsx` (see §3) before Stripe.
5. **Real photos + testimonials** — the genuine launch blockers. The two
   homepage quotes are invented, which is not OK on a live business site.
6. **Stripe** — everything up to the connection is built.
7. **Address lookup** — owner needs to pick a paid provider (~£5/mo
   getaddress.io or ~2p/lookup Ideal Postcodes). Options and costs are in
   HANDOVER.md. The postcode field already exists, so this is autofill only.
8. **Olive branches** — see §9; needs a visual reference first.

Anything larger (Supabase Storage, Sentry, WCAG audit, Turnstile) should be a
fresh explicit conversation.
