# Groomies

Mobile-first booking platform for a mobile pet grooming business. The van travels to scheduled stops; customers book a slot at a stop, not at a salon.

> **You don't need to be a developer to set this up.** This README walks you through the one-time setup step by step. If anything here doesn't make sense, that's a bug — tell whoever set this up for you and they'll fix the README.

## What you're setting up

Three free services, talking to each other:

| Service | What it does | Free tier OK? |
|---|---|---|
| **Supabase** | The database that holds your stops, dates, and bookings | Yes (start here) |
| **Cloudflare Pages** | Hosts the public website and the admin dashboard | Yes |
| **Resend** | Sends booking confirmation emails (added later) | Yes — 100/day, 3,000/month |

You'll create accounts for these in your own name now, and we can transfer everything to the business owner's accounts later in ~1 hour.

---

## 1. One-time machine setup (for the person editing the code)

You need [Node.js 22+](https://nodejs.org/) and [pnpm](https://pnpm.io/installation). If you're not editing code, skip to section 2.

```bash
# install pnpm if you don't have it
npm install -g pnpm

# inside this folder
pnpm install
```

## 2. Create the Supabase project (5 minutes)

1. Go to https://supabase.com and sign in (free GitHub login is fine).
2. Click **New project**. Fill in:
   - **Name:** `groomies`
   - **Database password:** click "Generate a password" and save it somewhere safe — you only need it for direct DB access (rare)
   - **Region:** pick a **UK or EU region** (e.g. `West EU (London)` or `West EU (Ireland)`). **This matters** — UK customer data must stay in the UK/EU.
   - **Plan:** Free
3. Wait ~2 minutes for the project to spin up.
4. Once it's ready, click **Project Settings** (bottom-left gear icon) → **API**.
5. Copy two values:
   - **Project URL** (looks like `https://abcdefghi.supabase.co`)
   - **anon / public** key (a long string starting with `eyJ...`) — **not** the `service_role` key, that one must stay secret

## 3. Wire up your local environment (1 minute)

In this folder, copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Open `.env.local` in any text editor and paste your two Supabase values in. Save.

## 4. Run it locally

```bash
pnpm dev
```

Open http://localhost:3000 in a browser. You should see the Next.js starter page (we'll replace it in Phase 2).

To check the Cloudflare-style production build runs:

```bash
pnpm preview
```

This builds the site the way Cloudflare will and serves it on http://localhost:8788. Use this to catch deploy issues before pushing.

## 5. Connect the repo to Cloudflare Pages (10 minutes, one time)

> Cloudflare's current name for this product is shifting — "Pages" and "Workers Static Assets" are essentially the same thing. The instructions below use whatever the Cloudflare dashboard calls it today.

1. Go to https://dash.cloudflare.com and sign in.
2. **Workers & Pages** (left sidebar) → **Create** → **Pages** tab → **Connect to Git**.
3. Authorize Cloudflare to read your GitHub. Pick the **groomies** repo.
4. **Build configuration:**
   - Framework preset: **Next.js**
   - Build command: `pnpm run deploy` *(this also pushes to Cloudflare — for build-only use `pnpm exec opennextjs-cloudflare build`)*
   - Build output directory: `.open-next`
   - Root directory: leave blank
5. **Environment variables** — add the same two from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click **Save and Deploy**. First build takes 3–5 minutes.

When it's done, Cloudflare gives you a URL like `groomies.pages.dev` — that's your live site. Custom domain comes later from the same dashboard.

---

## Day-to-day commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run locally with hot reload |
| `pnpm build` | Build for production (Node, not Cloudflare) |
| `pnpm preview` | Build + serve via Cloudflare's local Workers runtime — closest to production |
| `pnpm deploy` | Build + deploy to Cloudflare from your machine (CI is the normal path) |
| `pnpm lint` | Check code style |

## Project layout (what to expect as we build this out)

```
groomies/
├── app/                      Next.js pages (public site + /admin)
├── lib/
│   └── supabase/
│       └── client.ts         Browser-side Supabase client
├── supabase/                 (added Phase 2) migrations, seed, RPCs
├── open-next.config.ts       Cloudflare build config
├── wrangler.jsonc            Cloudflare runtime config
└── .env.example              Template for your local secrets
```

## What's coming next

This is **Phase 1** — scaffold only. Phases per the build spec:

1. ✅ Scaffold (this)
2. Database schema + Row Level Security + booking RPC
3. Admin login + locations CRUD
4. Dates, slots, capacity
5. Public browse + live availability
6. Booking flow + confirmation emails
7. Admin bookings + business settings
8. Legal pages, polish, monitoring

## Help

If something here is wrong or unclear, that's a documentation bug — please flag it.
