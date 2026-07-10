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

**Everything works. Real bookings could be taken today. Design pass is ongoing.**

Live URL: `https://groomies.billowing-firefly-f15a.workers.dev` (Cloudflare Workers).  
GitHub: https://github.com/AdminOpease/Groomies  
Supabase project ref: `afbdldaqcibfcmocshvu`  
Local path: `/Users/ozanulasan/groomies/`  

---

## 3. What's OPEN right now

**Design polish — mid-flight.** Owner said the site was "too plain, more for old people". We pivoted to editorial-minimalist:

- Full split hero (bold display type left, single big cinematic photo right)
- Killed laurels, killed ornate circular seal, killed Luxury Spa Upgrades tile, killed VIP Club section
- Fraunces serif for display type, cream body background, olive brand
- Local hero photo at `/Image Groomies.png` (owner's file, dropped into `public/`)
- Real logo at `/Groomies Logo.png` (transparent PNG) rendered by header/footer via `business_settings.logo_url`

**Last thing being iterated:** logo sizing/positioning in the header.
- Header uses `flex items-center py-3` (no fixed height) — flexes to fit
- Logo is `h-14 sm:h-20 w-auto` (56/80px)
- If the owner comes back saying "too big" or "too small", tweak the `h-*` classes on `<img>` in `app/(public)/_components/Header.tsx:30` and `Footer.tsx:24`

**Not yet done (nice-to-haves, not blockers):**
- Supabase Storage bucket + admin upload UI for logo/photos (owner uploaded logo + hero via `public/` for now; Storage is planned so they can swap via /admin)
- Real customer photos throughout the site (still using Unsplash placeholder + owner's one hero photo)
- Real testimonials (currently 2 placeholder quotes on home)
- Sentry error tracking (mentioned in HANDOVER.md but not wired)
- Cloudflare Web Analytics (enable via CF dashboard, ~2 min)
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
```

---

## 8. Gotchas (order of "would have wasted an hour on this")

### The Supabase CLI hangs on `db push`
Sometimes hangs at "Initialising login role..." with no error. Workaround that always works:
1. Open https://supabase.com/dashboard/project/afbdldaqcibfcmocshvu/sql/new
2. Copy the migration SQL body directly into the SQL editor
3. Click Run
4. Also mark it applied by adding to `supabase_migrations.schema_migrations` if you want the CLI to stay in sync — usually not necessary because we make migrations idempotent

Migrations 012 and 013 in this repo have both been applied through Studio at some point — they're written with `if not exists` / `create or replace` so re-running is safe.

### Filenames with spaces in `public/`
Files like `Image Groomies.png` and `Groomies Logo.png` work but are fragile. Next.js handles URL encoding when you reference them in JSX (`src="/Image Groomies.png"`). Fine locally; may cause issues on some CDN configurations. If we hit any weirdness, rename to kebab-case.

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
This project lives at `/Users/ozanulasan/groomies/` but the Claude harness's `preview_start` MCP is scoped to a different directory (`opease-frontend`). Do NOT use `preview_start` — it'll try to boot the wrong project. Use `pnpm dev` in a background Bash task and `curl` / `open http://localhost:3000` to verify. Same pattern used throughout this session.

The user has a memory note about this too:
> "Keep separate projects separate — don't touch opease while working on another project, even if harness prompts (e.g. preview server) suggest it"

---

## 9. Design language — where we've landed

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
cd /Users/ozanulasan/groomies

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

Likely in this order — but wait for user input, don't just push:

1. **Finish the header/logo iteration** — user was mid-fine-tuning size and position when we pushed
2. **Set business_settings.contact_email** (via /admin/settings) so owner alerts have somewhere to land
3. **Add RESEND_API_KEY** to `.env.local` and Cloudflare env — start actually sending emails
4. **Supabase Storage bucket + upload UI** — so owner can manage logo/photos from the admin (not `public/`)
5. **Real photos throughout** — currently just hero. Studio-moment, testimonials, and areas would benefit
6. **Continue design polish** — user was cycling through opinions; small increments, not big passes

Anything larger (Stripe wire-up, Turnstile, Sentry, WCAG audit, real launch prep) should be a fresh explicit conversation.
