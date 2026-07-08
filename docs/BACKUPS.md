# Backups and restore

Supabase runs automated daily backups on **every** paid tier and — as of writing — on the free tier too. This doc covers how to check them, download one, and restore.

---

## 1. Where backups live

Supabase Dashboard → your project → **Database** → **Backups**.

You'll see a list of automated backups going back 7 days (free tier) or 30 days (Pro). Each backup is a `.tar.gz` file — a `pg_dump` of the entire database at that point in time.

---

## 2. Download a backup

1. Backups page → pick a date → **Download**
2. You get a `.tar.gz` file. Keep it somewhere safe (an encrypted external drive is fine).

**Recommended:** download one manually every month and store it off Supabase. If Supabase itself becomes unavailable (rare), you still have your data.

---

## 3. Restore

There are two scenarios:

### A. Restore to the same project (undo a bad change)

Supabase Dashboard → **Database** → **Backups** → pick a date → **Restore**.

⚠️ This **overwrites the current database**. Any data added since that backup is gone. Only do this if you're absolutely sure.

### B. Restore into a fresh project (disaster recovery)

If the original project is lost or you're moving hosts:

1. Create a fresh Supabase project (same UK/EU region for GDPR).
2. Get the connection string: **Project Settings** → **Database** → **Connection string** → **URI** (this is the direct psql connection, not PostgREST).
3. On a machine with `psql` installed, run:
   ```bash
   pg_restore --clean --no-owner --no-privileges \
     -d "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
     path/to/backup.tar.gz
   ```
4. Re-run the app's migrations to make sure schema is in the shape the code expects:
   ```bash
   cd ~/groomies
   pnpm exec supabase link --project-ref NEW_PROJECT_REF
   pnpm exec supabase db push
   ```
5. Update `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Cloudflare env vars to point at the new project.
6. Redeploy.

---

## 4. What's in a backup (and what isn't)

**Included:**
- All tables and their rows: locations, dates, slots, bookings, services, profiles, business_settings, email counters
- All RPCs (`book_slot`, `admin_create_booking`, etc.)
- All RLS policies
- All pg_cron schedules
- All auth users (so admin logins survive a restore)

**Not included:**
- Cloudflare env vars — kept in the CF dashboard, unrelated to Supabase backups
- Resend / Stripe accounts — external services with their own account systems

If you're planning a full disaster-recovery drill: also grab the current Cloudflare env vars from the dashboard, since restoring the DB is useless without the site pointing at it.

---

## 5. Testing restores

The rule everyone forgets: **an untested backup is not a backup.** Once every few months, do a dry-run restore into a temporary "staging" Supabase project. Confirm the app can boot against it and read a booking. Then delete the staging project.

---

## 6. Common gotchas

- **Password:** The backup connection string uses your Supabase database password. If you've never set one, generate one in **Settings** → **Database** → **Reset password**. Save it in a password manager immediately.
- **Auth users after restore:** Auth users' emails and hashed passwords are in the backup. Two-factor / recovery emails may need re-verification depending on how far back the backup is.
- **pg_cron schedules:** Restored jobs pick up where they left off. If you're restoring an old backup, some scheduled jobs may run "catch-up" immediately — worth reviewing the `cron.job_run_details` table right after.
