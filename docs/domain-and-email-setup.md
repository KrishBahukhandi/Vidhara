# Domain + transactional email setup

Moving Vidhara from `vidhara-web-lyart.vercel.app` to **`vidhara.bahukhandi-labs.com`**,
and turning on real email so sign-in works (unblocks D-021 and D-041).

**Domain:** `bahukhandi-labs.com`, registrar **BigRock**, DNS on BigRock nameservers
(`dns1–4.bigrock.in`). The apex and `www` already serve the Bahukhandi Labs site
from a *different* Vercel project — nothing below touches them.

State of the zone before any of this (checked 2026-08-05):

| Record | Value |
| --- | --- |
| `A` apex | `216.198.79.1` (Vercel) |
| `CNAME www` | `1a23e4dae3eec2cc.vercel-dns-017.com` (Vercel) |
| `MX` | none |
| `TXT` | Google site verification only — **no SPF** |
| `_dmarc` | none |
| `vidhara` | does not exist |

No mail exists on this domain, so there is no SPF record to collide with. That is
why we verify the apex on Resend and send as `noreply@bahukhandi-labs.com`
rather than hiding behind a `mail.` subdomain.

---

## 1. Point the subdomain at the Vidhara project

**Vercel** → the **Vidhara** project (the one serving `vidhara-web-lyart.vercel.app`,
*not* the Bahukhandi Labs project) → Settings → Domains → Add
`vidhara.bahukhandi-labs.com`. Vercel then shows a CNAME target.

**BigRock** → Manage Orders → List/Search Orders → the domain → DNS Management →
Manage DNS → CNAME Records → Add:

| Field | Value |
| --- | --- |
| Host / Name | `vidhara` |
| Value | **whatever the Vidhara project showed** (usually `cname.vercel-dns.com`) |
| TTL | 3600 (or lowest offered, while testing) |

> **Do not copy the `www` CNAME value.** Vercel issues a different target per
> project. Reusing `1a23e4dae3eec2cc.vercel-dns-017.com` would make
> `vidhara.bahukhandi-labs.com` serve the Bahukhandi Labs site instead.

BigRock's panel sometimes appends the domain automatically — if it shows
`vidhara.bahukhandi-labs.com.bahukhandi-labs.com` after saving, re-enter the host
as just `vidhara`.

Verify (do not trust the dashboard's green tick alone):

```bash
dig +short vidhara.bahukhandi-labs.com @1.1.1.1
```

Then confirm the certificate and that it is *Vidhara* being served:

```bash
curl -sI https://vidhara.bahukhandi-labs.com | head -1
```

---

## 2. Verify the domain on Resend

Free tier: 3,000 emails/month, 100/day, one verified domain — well above a 30–50
user beta.

1. Create the account, then Domains → Add Domain → `bahukhandi-labs.com`.
   If it offers a region, pick the one nearest India; for OTP it barely matters.
2. Resend generates three records. **Copy them exactly from the dashboard** — the
   DKIM key is unique per domain and the SPF host is region-specific. Shapes:

| Type | Host | Purpose |
| --- | --- | --- |
| `MX` | `send` | bounce/complaint feedback |
| `TXT` | `send` | SPF (`v=spf1 include:amazonses.com ~all`) |
| `TXT` | `resend._domainkey` | DKIM public key (long `p=` value) |

   Note SPF and MX sit on the **`send`** subdomain, not the apex. That is Resend's
   design and it is why a future Google Workspace SPF on the apex will not conflict.

3. Add all three in BigRock's DNS Management, then hit Verify. Propagation on
   BigRock is usually minutes but the panel can lag; check independently:

```bash
dig +short TXT resend._domainkey.bahukhandi-labs.com @1.1.1.1
```

4. Add DMARC yourself — Resend does not create it. Start permissive:

| Type | Host | Value |
| --- | --- | --- |
| `TXT` | `_dmarc` | `v=DMARC1; p=none; rua=mailto:krishbahukhandi35@gmail.com` |

   `p=none` only reports; tighten to `p=quarantine` after a few weeks of clean
   reports. Going straight to `p=reject` before DKIM is confirmed working will
   silently bin your own sign-in emails.

5. API Keys → Create, scope **Sending access** only.
   **Paste it straight into Supabase (step 3). Never into chat, a commit, or a
   client-side env var.**

---

## 3. Point Supabase Auth at Resend

Supabase Dashboard → Project `eubyvglzkbzfeznocilg` → Authentication.

**SMTP Settings** → Enable custom SMTP:

| Field | Value |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` (if it fails, try `587`) |
| Username | `resend` — the literal word, not an email |
| Password | the Resend API key |
| Sender email | `noreply@bahukhandi-labs.com` |
| Sender name | `Vidhara` |

**Rate limits** → raise "Rate limit for sending emails" above the default 30/hour,
which is sized for Supabase's built-in service and will throttle a beta cohort.
Keep it at or under Resend's 100/day.

### The email template must send a code, not a link

`apps/mobile/src/features/auth/api.ts` requests a code and validates `/^\d{6}$/`
in `verifyOtp`. Supabase's stock **Magic Link** template sends
`{{ .ConfirmationURL }}` — a link. If it is left as shipped, the code the app is
waiting for is never in the email, and no amount of SMTP configuration fixes that.

Authentication → Emails → **Magic Link** → replace the body with something that
uses `{{ .Token }}`:

```html
<h2>Your Vidhara sign-in code</h2>
<p>Enter this code in the app:</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:600">{{ .Token }}</p>
<p>It expires in an hour. If you didn't ask for it, ignore this email.</p>
```

**URL Configuration** → Site URL `https://vidhara.bahukhandi-labs.com`. Redirect
URLs are not needed for code-based OTP, but set the Site URL anyway — password
reset and email-change flows use it.

---

## 4. Repoint the app

Three places read the site origin, each from an env var with the old Vercel URL as
fallback:

| Where | Variable | Set in |
| --- | --- | --- |
| `apps/web/src/lib/site.ts` | `NEXT_PUBLIC_SITE_URL` | Vercel → Vidhara project → Environment Variables (Production) |
| `apps/mobile/src/lib/site.ts` | `EXPO_PUBLIC_WEB_URL` | `apps/mobile/.env` + EAS build secrets |
| `supabase/functions/hearing-reminders/index.ts` | `SITE_URL` | Supabase → Edge Functions → Secrets |

All three to `https://vidhara.bahukhandi-labs.com`. The web one needs a redeploy
to take effect — env changes do not rebuild on their own.

The fallback literals in the source get updated in the same change, so local dev
and preview deploys generate correct absolute URLs too.

---

## 5. Afterwards

- **Redeploy web**, then confirm the sitemap emits the new origin:
  `curl -s https://vidhara.bahukhandi-labs.com/sitemap.xml | head -5`
- **Google Search Console** — the property changes. Verify
  `vidhara.bahukhandi-labs.com` and resubmit the sitemap. The pending action from
  D-052 was against the Vercel URL and is now moot.
- **Re-check OG cards** in a real link-preview debugger, which D-052 explicitly
  deferred until a custom domain existed.
- **Keep the Vercel URL working.** Vercel serves it alongside the custom domain;
  leave it as-is so already-shared links do not rot.
- **Send a real OTP to yourself** end to end, and check it lands in inbox rather
  than spam — with DKIM and SPF passing on a fresh domain it should, but a first
  send from a cold domain is worth eyeballing.
- **Rotate the service-role key** while you are in the Supabase dashboard —
  Settings → API → `service_role` → Reset. It was pasted in plaintext earlier and
  is still live. Then update `scripts/ingest/.env`.
