# Domain + Email Setup — `groomies.uk`

Runbook for taking the site live on the real domain and getting
`hello@groomies.uk` sending (via Resend) and receiving (via Cloudflare Email
Routing, forwarded to Gmail).

**Decisions made 2026-07-21:**
- Public address: `hello@groomies.uk`
- Enquiries forward to: `groomiesltd@gmail.com`
- Canonical site: `https://www.groomies.uk` (apex redirects to www)
- Microsoft 365: **cancel it.** The mailbox has never been logged into and the
  password is unknown, so the "keep it as a rollback" plan is void — restoring
  the MX record would deliver mail to an inbox nobody can open. Nothing to
  preserve, nothing to lose.

---

## DNS baseline — captured 2026-07-21T18:19Z, before any change

This is the complete pre-migration state, verified by `dig` against the live
GoDaddy nameservers. **It is the rollback reference** — if anything goes wrong
at any step, these records restore the starting state exactly.

```
NS      @                          ns55.domaincontrol.com
NS      @                          ns56.domaincontrol.com
A       @                          76.223.105.230
A       @                          13.248.243.5
CNAME   www                        groomies.uk
MX      @                    0     groomies-uk.mail.protection.outlook.com
TXT     @                          v=spf1 include:secureserver.net -all
TXT     @                          NETORGFT20373999.onmicrosoft.com
TXT     _dmarc                     v=DMARC1; p=quarantine; adkim=r; aspf=r;
                                   rua=mailto:dmarc_rua@onsecureserver.net;
CNAME   autodiscover               autodiscover.outlook.com
CNAME   lyncdiscover               webdir.online.lync.com
SRV     _sip._tls            100 1 443   sipdir.online.lync.com
SRV     _sipfederationtls._tcp  100 1 5061  sipfed.online.lync.com
```

No AAAA records. No CAA records — nothing blocking certificate issuance.

⚠️ **`lyncdiscover` and `_sipfederationtls._tcp` are not in the older handover
notes.** They were found only by querying directly. Treat this block, not the
handover, as the authoritative list when checking Cloudflare's import.

---

## Status

| Step | State |
|---|---|
| 1. Zone on Cloudflare | ✅ done 2026-07-21 |
| 2. Nameservers → Cloudflare | ✅ `maria` + `nolan.ns.cloudflare.com` |
| 3. Worker custom domains | ✅ `www.groomies.uk` + `groomies.uk` |
| 4. Apex → www redirect | ✅ 301, path + query preserved |
| 5. Email Routing | ✅ `hello@groomies.uk` → Gmail, delivery confirmed |
| 6. Resend sending domain | ⬜ next |
| 7. DMARC tighten | ⬜ |
| 8. Cloudflare env vars | ⬜ **site still builds with the old URL until this is done** |
| 9. End-to-end verify | ⬜ |

**Live at https://www.groomies.uk.** The old `*.workers.dev` URL still resolves
and is still what `NEXT_PUBLIC_SITE_URL` says until step 8.

Deviations from the plan, worth knowing if this is ever repeated:
- Cloudflare's DNS import missed nothing, but two records (`autodiscover`,
  `lyncdiscover`) came in **proxied**, which breaks them. Left broken
  deliberately — see the M365 note below.
- Email Routing refused to enable while the Microsoft MX and the
  `secureserver.net` SPF were present. Both had to be deleted by hand first.
  Between deleting them and clicking *Add missing records* the domain has **no
  MX at all** — do those two actions back to back.

---

## The one thing to understand before starting

A domain has exactly **one** set of MX records. They decide where inbound mail
goes, and only one service can own them.

So "keep Microsoft 365 running alongside Cloudflare" is not a configuration
that exists. The moment step 5 switches MX to Cloudflare, the M365 mailbox
stops receiving — paid subscription or not. Keeping the subscription is still
worth it for a few weeks because **restoring the old MX record takes about two
minutes** and gets you back to exactly where you started. That is a rollback,
not redundancy.

This is safe here only because the mailbox has **never been used** — there is
no mail to lose and no one currently writing to it. Do not reuse this runbook
on a domain with a live mailbox without exporting it first.

### How sending and receiving stay out of each other's way

The reason this works at all:

| Records | Owner | Purpose |
|---|---|---|
| `groomies.uk` MX | Cloudflare Email Routing | **inbound** — enquiries → Gmail |
| `groomies.uk` TXT (SPF) | Cloudflare Email Routing | authorises the forwarder |
| `resend._domainkey` TXT | Resend | **outbound** DKIM — proves the mail is really you |
| `send.groomies.uk` MX + TXT | Resend | outbound bounce handling + envelope SPF |

Resend keeps its MX and SPF on the **`send.` subdomain**, so it never competes
for the root MX. DKIM is what aligns outbound mail to `groomies.uk` for DMARC,
and DKIM is just a TXT record — no conflict. Both directions coexist.

---

## Step 1 — Add the zone to Cloudflare (nothing breaks yet)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → left sidebar **Domains**
   → **Onboard a domain** → `groomies.uk` → choose the **automatic DNS scan**
   option → **Free** plan.

   > **The button is not called "Add a site".** Cloudflare renamed the flow to
   > *Domains → Onboard a domain*; almost every tutorial still says "Add a
   > site" and there is no such button any more. Also make sure you are at
   > **account level** — if the left sidebar is showing Worker settings, click
   > your account name to back out first, or Domains won't be listed.

   **Free plan is deliberate, not a cost compromise.** Pro's headline feature
   is the WAF, but a WAF protects a web tier that trusts its inputs — and this
   app's security boundary is Supabase RLS, enforced in Postgres and covered by
   the security tests. Cloudflare never sees those queries. Worse, WAF managed
   rules false-positive on free-text form posts, so it could silently block
   real bookings. For form spam the answer is **Turnstile (free**, already
   env-gated on `NEXT_PUBLIC_TURNSTILE_SITE_KEY`), not Pro. Free covers
   everything this project actually relies on: DDoS, SSL, CDN, DNS, Email
   Routing, Workers custom domains, Redirect Rules, Web Analytics.

2. Cloudflare scans the existing GoDaddy DNS and imports what it finds.
3. **Check the import against the DNS baseline block above** — all 13 records.
   Cloudflare's scanner is good but not exhaustive, and anything it misses
   disappears the moment nameservers flip, with nothing left to say what it was.
   Add any missing record by hand *now*, while the old nameservers are still
   authoritative and the values are still recoverable.

   Pay particular attention to `lyncdiscover` and `_sipfederationtls._tcp` —
   scanners commonly miss SRV records, and these two were absent from the
   project's own notes.

4. Cloudflare shows you two nameservers (e.g. `xxx.ns.cloudflare.com`). Copy them.

## Step 2 — Switch nameservers at GoDaddy

GoDaddy → **My Products** → **Domains** → `groomies.uk` → **Manage DNS** →
**Nameservers** → **Change** → *I'll use my own nameservers* → paste the two
Cloudflare ones.

Propagation is usually minutes but can take up to 24h. Cloudflare emails you
when the zone goes active. **Wait for that email before step 3.**

Verify from a terminal — tell me when you've done it and I'll run this:

```bash
dig +short NS groomies.uk    # expect the two Cloudflare nameservers
dig +short MX groomies.uk    # expect outlook.com STILL — proves the import held
```

## Step 3 — Point the Worker at the domain

1. Cloudflare → **Workers & Pages** → the `groomies` Worker → **Settings** →
   **Domains & Routes** → **Add** → **Custom Domain**.
2. Add `www.groomies.uk`. Add `groomies.uk` as well.
3. Cloudflare creates and manages the DNS records automatically. **Delete the
   old GoDaddy A records** (`76.223.105.230`, `13.248.243.5`) if they survived
   the import — those point at the GoDaddy Website Builder site and will
   otherwise fight the Worker.

The old GoDaddy landing page stops resolving at this point. That is the intent.

## Step 4 — Redirect apex → www

Since `www.groomies.uk` is canonical, serving both hostnames unredirected would
split SEO across two identical sites.

Cloudflare → **Rules** → **Redirect Rules** → **Create rule**:
- If: `hostname` equals `groomies.uk`
- Then: **Dynamic** redirect, status **301**, expression:
  `concat("https://www.groomies.uk", http.request.uri.path)`
- Preserve query string: on

## Step 5 — Email Routing (⚠️ this is the email cutover)

**This is the irreversible-feeling step.** After it, M365 stops receiving.

1. Cloudflare → the `groomies.uk` zone → **Email** → **Email Routing** →
   **Get started**.
2. **Destination address first.** Add `groomiesltd@gmail.com` as the
   destination. Cloudflare sends it a verification email — **click that link
   before going further**, or routing silently drops mail.
3. Custom address: `hello@groomies.uk` → forward to `groomiesltd@gmail.com`.
4. Optionally add a catch-all → same Gmail, so a typo'd address still reaches you.
5. Enable Email Routing. Cloudflare replaces the MX records and updates SPF.
6. **Remove the now-dead M365 records:** the `secureserver.net` SPF TXT, the
   `autodiscover` CNAME, the `_sip._tls` SRV. Leave the `NETORGFT…` tenant TXT
   until you actually cancel the subscription.

**There is no useful rollback, and that's fine.** Restoring the M365 MX would
route mail to a mailbox with an unknown password. The old setup was never
reachable, so any working inbox is a strict improvement. Don't burn time
preserving it.

The `autodiscover` and `lyncdiscover` records were left proxied (broken) for
the same reason — they only serve Outlook clients connecting to that
unreachable mailbox. Delete them along with the other M365 records.

Test it: send a mail from your phone to `hello@groomies.uk` and confirm it
lands in Gmail.

## Step 6 — Resend sending domain

1. [resend.com](https://resend.com) → **Domains** → **Add Domain** →
   `groomies.uk`. Choose the **EU (Ireland)** region — UK business, keeps
   customer data in-region for GDPR.
2. Resend shows three records. Add each in Cloudflare DNS with the proxy
   **OFF (grey cloud)**:

   ```
   TXT   resend._domainkey   p=MIGfMA0GCSq…        (DKIM — long, copy exactly)
   MX    send                feedback-smtp.eu-west-1.amazonses.com   pri 10
   TXT   send                v=spf1 include:amazonses.com ~all
   ```

   Note both the MX and SPF go on **`send`**, not the root. That is precisely
   what keeps step 5's inbound routing intact.

3. Click **Verify**. Usually under a minute; can take up to 72h.
4. Resend → **API Keys** → create one with **Sending access** only.

## Step 7 — Tighten DMARC

The inherited record points its reports at GoDaddy and enforces
`p=quarantine`. During cutover that risks quarantining your own legitimate
mail before DKIM has bedded in.

Set `_dmarc` TXT to:

```
v=DMARC1; p=none; rua=mailto:hello@groomies.uk; adkim=r; aspf=r;
```

Then **after two weeks** of clean delivery, raise it back to `p=quarantine`.
Going straight to enforcement is how legitimate booking confirmations end up
in spam on day one.

## Step 8 — Cloudflare environment variables

Two separate places (handover §8 — mixing them up costs an hour):

**Settings → Build** (inlined at build time, needed because of `NEXT_PUBLIC_*`):
```
NEXT_PUBLIC_SITE_URL = https://www.groomies.uk
```

**Settings → Variables and secrets** (runtime, encrypt these):
```
RESEND_API_KEY           = re_…
RESEND_FROM              = Groomies <hello@groomies.uk>
SUPABASE_SERVICE_ROLE_KEY = eyJ…
```

`RESEND_FROM` is read by `lib/email.ts`. Leave it unset and emails fall back to
Resend's sandbox sender, which only delivers to the Resend account owner — it
will look like it works in testing and silently reach no customers.

Redeploy after setting these (a push to `main`, or `pnpm deploy`).

## Step 9 — Verify end to end

```bash
dig +short NS groomies.uk                        # Cloudflare
dig +short MX groomies.uk                        # Cloudflare Email Routing
dig +short MX send.groomies.uk                   # amazonses
dig +short TXT resend._domainkey.groomies.uk     # DKIM present
curl -sI https://groomies.uk | head -1           # 301
curl -s https://www.groomies.uk/services | grep -c "Full Groom Packages"   # non-zero
```

**Check `robots.txt` survived.** The onboarding flow has a *"Block training in
robots.txt"* toggle (left ON) which makes Cloudflare inject AI-crawler
directives into `robots.txt`. But this app generates its own via
`app/robots.ts`, carrying the sitemap pointer and the `/admin`, `/book`,
`/manage`, `/api` disallows. If Cloudflare replaces rather than appends, those
are silently lost:

```bash
curl -s https://www.groomies.uk/robots.txt
```

Expect to see BOTH the app's `Disallow:` lines and `Sitemap:
https://www.groomies.uk/sitemap.xml`, alongside whatever Cloudflare added. If
the app's rules are gone, turn the toggle off (zone → **AI Crawl Control**) and
handle AI bots in `app/robots.ts` instead, so there is one source of truth.

Then the real test: **make a test booking** and confirm both emails arrive —
the customer confirmation and the owner alert. Check the confirmation lands in
the inbox rather than spam.

Then set `contact_email` in `/admin/settings` to `hello@groomies.uk`.

---

## After it's all working

- Cancel the GoDaddy/M365 subscription (rollback path no longer needed), then
  delete the `NETORGFT…` tenant TXT.
- Cloudflare Web Analytics now works in **automatic mode** — no token needed on
  a CF-proxied domain. The code is already wired and env-gated.
- Turnstile becomes available for bot protection on the booking form.
