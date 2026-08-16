# Vidhara — Backlog

> **Status**: Living document — the single list of what is not done. · **Last updated**: 2026-08-16
> Compiled from decision-log D-001…D-063, launch-checklist, roadmap and a live check of the
> deployed site, DNS and Edge Functions on 2026-08-16. Where the docs and reality disagreed,
> reality won and the discrepancy is noted.
>
> Companion docs: [decision-log.md](decision-log.md) (why) · [launch-checklist.md](launch-checklist.md)
> (per-release gates) · [roadmap.md](roadmap.md) (calendar, now slipped — see §9).

---

## What is actually live (verified 2026-08-16, not read from docs)

| Thing | State |
|---|---|
| `https://vidhara.bahukhandi-labs.com` | **200**, sitemap emits the new origin |
| `https://vidhara-web-lyart.vercel.app` | still 200 — kept alive so shared links do not rot |
| `/api/v1/health` | `{"ok":true,"service":"vidhara-web","minSupportedAppVersion":"0.1.0"}` |
| Corpus | **36 acts / 5,594 sections**, content-qa **0 SEV1**, SEV2 29 |
| `hearing-reminders?action=status` | `{"configured":false}` — **no SMTP secrets exist** |
| Git tags | `v0.1.0`, `v0.2.0` — no `v0.5.0` |
| DNS: Resend DKIM / SPF / MX | all three resolve ✓ (domain verified) |
| DNS: `_dmarc` | **absent** |

---

## 1. Email + auth — the unblocker

D-021 parked email-OTP sign-in. The root cause is **Supabase configuration, not code**:
`requestOtp`/`verifyOtp` in `apps/mobile/src/features/auth/api.ts` are correct and expect a
6-digit `{{ .Token }}`. Full runbook: [domain-and-email-setup.md](domain-and-email-setup.md).

- [x] Domain `vidhara.bahukhandi-labs.com` live on Vercel
- [x] Resend account created; `bahukhandi-labs.com` verified (DKIM + SPF + MX resolve)
- [ ] **`_dmarc` TXT record** — `v=DMARC1; p=none; rua=mailto:krishbahukhandi35@gmail.com`.
      Start at `p=none`; going to `p=reject` before DKIM is proven bins your own sign-in mail.
- [ ] Resend API key, scoped **Sending access only**. Straight into Supabase — never into chat,
      a commit, or a client-side env var.
- [ ] Supabase → Auth → SMTP Settings: host `smtp.resend.com`, port 465 (fallback 587),
      username the literal word `resend`, sender `noreply@bahukhandi-labs.com`, name `Vidhara`
- [ ] **Rewrite the Magic Link template to emit `{{ .Token }}`.** This is the actual defect —
      the stock template sends `{{ .ConfirmationURL }}`, a link, and no amount of SMTP config
      puts a code in it. Do **Confirm signup** as well.
- [ ] Auth → Rate limits: raise email sending above the default 30/hour (sized for Supabase's
      built-in service; it will throttle a beta cohort). Stay at or under Resend's 100/day.
- [ ] URL Configuration → Site URL `https://vidhara.bahukhandi-labs.com`
- [ ] Send a real OTP end to end on a device; confirm it lands in inbox, not spam
- [ ] Edge Function secrets: `SMTP_*` + `REMINDERS_CRON_SECRET`; schedule the daily
      `hearing-reminders` POST (~18:00 IST)

**Unblocks:** sign-in · cross-device sync · diary sync · hearing reminders (built, inert, and
currently hidden from the UI by design — D-030, D-041) · any account-gated feature.

## 2. Security

- [ ] **Rotate the Supabase `service_role` key**, then update `scripts/ingest/.env`.
      It was pasted in plaintext during the ingest publishes and is still live. This appears as
      a closing line on roughly twenty consecutive decision entries, **D-032 through D-063** —
      the most-repeated open item in the project.

## 3. Founder-account items (launch critical path)

- [x] Vercel deploy + custom domain
- [x] PostHog project live on EU cloud, events verified reaching `eu.i.posthog.com/e/`
- [ ] PostHog **"Vidhara Core" dashboard** (analytics-plan §Dashboards) — never built
- [ ] **Cohort tagging verified end-to-end** in the PostHog UI (`?c=beta-1` → `vidhara_cohort` →
      `cohort` on every event). Must be proven **before any invite goes out**, or the beta
      produces uncohorted data.
- [ ] **Sentry** — project never created, DSN never pasted. There is currently **no crash
      reporting on either surface.** Needs `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_ORG`,
      `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` for source maps), then force a test error.
- [ ] **UptimeRobot** monitors on `/` and `/api/v1/health`
- [ ] **Google Search Console** — the property changed with the domain. Verify
      `vidhara.bahukhandi-labs.com` and resubmit the sitemap. The pending D-026 action against
      the Vercel URL is moot.
- [ ] **Re-check OG cards** in a real link-preview debugger (WhatsApp + Telegram). D-026 deferred
      this until a custom domain existed; that condition is now met.
- [ ] **Play Console** account (₹25) → app created → closed-testing track
- [ ] **12 testers × 14 continuous days** — the clock has never started and is the long pole.
      Calendar time; it cannot be compressed. Record the start date in the decision log.

## 4. Android / mobile

- [ ] **`apps/mobile/src/lib/analytics.ts` is a stub** (`TODO(beta)` at line 42) — logs in dev,
      no-ops in release. Every screen already calls `track()`; wiring `posthog-react-native` is
      one file. Without it the Android cohort generates **zero** product data.
- [ ] No Sentry in the RN app at all
- [ ] `expo run:android` on the physical device, then EAS build → Play closed track
- [ ] **Untested paths** (D-048): the **camera** and **DocumentPicker** flows for case documents.
      A simulator has no camera. The gallery path is verified down to the filesystem; these two
      share `adopt()` with it but their pickers are unproven.
- [ ] Permission usage strings unverified in situ — Expo Go shows its own wording, so the strings
      added in D-047 have never been seen by a user. Check on the first EAS build.
- [ ] Case documents have **no dedupe and no size cap** — one 1.3 MB photo per attach, growing
      unbounded in the app sandbox
- [ ] Mobile renders no schedules (D-036) — the Limitation Schedule browse page is web-only
- [ ] Serif font not bundled via expo-font; native falls back to the system font (cosmetic)

## 5. Content / corpus

Corpus is **36 acts / 5,594 sections at 0 SEV1**. Remaining work is characterised, not unknown.

- [ ] **29 SEV2 findings** (down from 174 in D-063): ~7 are correct as they stand, ~8 are footnote
      residue in acts that print footnotes at body height, ~14 are illustration text the print
      itself mangles
- [ ] **Two parser defects blocked on inputs, not effort** (D-056). The ICA footnote-as-section
      case needs a signal the text layer does not carry — a rule line, a font-name change, or the
      sub-7pt amendment superscript — so it is a *source acquisition* problem. The cross-heading
      case needs the act's own arrangement of sections read first. D-063 solved part of the second
      by deciding at flush time rather than as lines stream.
- [ ] The Constitution still cannot be re-parsed wholesale — the parser appends cross-headings to
      its bodies, and its committed bundle is cleaner than a fresh parse
- [ ] **State amendments**: blocks printed without a `[Vide …]` citation are dropped rather than
      guessed (correct), which makes them invisible; and nothing surfaces a State's amendments as
      a set, only per section (D-053)
- [ ] Transfer of Property's Schedule is not ingested; only the Limitation Act has table modelling
      (D-050)
- [ ] The Indian Succession source PDF carries a third-party collector's watermark on every page —
      it is what India Code serves; take a cleaner edition if one appears (D-062)
- [ ] **V1.0 content QA**: random 50 sections diffed against `scripts/ingest/bundles/*.json` (the
      artifacts of record), zero text diffs tolerated; plus the omitted/new/split/merged rendering
      spot-check (IPC 497, 377, 124A, 498A→BNS 85+86, BNS 304)
- [ ] Breadth is the growth lever (D-049) — 36 acts against competitors' 880–1,500. Expansion
      should be **demand-driven off the report-a-miss rows**, not guessed.

## 6. Product gaps named in their own entries

- [ ] No on-demand `revalidatePath` route → content fixes lag up to 1h behind the ISR cache (D-017)
- [ ] Diary **sync** — genuinely needs accounts; the JSON export is the manual bridge (D-044)
- [ ] s.12(3)'s separate judgment-copy exclusion is folded into one interval; an advocate who
      obtained copies separately must add the difference by hand (D-046)
- [ ] No way to save a section from `/cite` onto a case without going through the diary's own
      attach flow (D-043)
- [ ] `ChapterListItem` and its grouping logic are duplicated web/mobile — the rule of three says
      the next consumer moves it into `packages/shared` (D-040)
- [ ] Advocate surfaces need re-framing as a companion rather than the pitch (D-049)

## 7. Beta / go-to-market — none of this has started

- [ ] Beta WhatsApp group created; welcome banner is deliberately unbuilt until the URL exists
      (~20 min once it does)
- [ ] Recruitment posts per user-feedback-plan §channels; 30+ committed before freeze
- [ ] Interview calendar: ≥3/week for weeks 1–3
- [ ] 5 friendly walkthroughs
- [ ] Monday metrics ritual — **`docs/metrics-log.md` does not exist yet**
- [ ] Play store listing: title/short/full description, 6 screenshots (mapping lookup first),
      feature graphic, content rating questionnaire, data-safety form
- [ ] Staged rollout plan (20% → 48h watch → 100%); test the `minSupportedAppVersion` boot gate
      against a staging health endpoint
- [ ] **Rollback drill** executed and timed (target <5 min) — rehearsed, not improvised
- [ ] Sentry alert rules: crash spike + new-issue-in-release
- [ ] Launch posts (Telegram/WhatsApp/LinkedIn) + press notes to Lawctopus/LiveLaw/Bar&Bench
- [ ] Tag `v0.5.0`, then `v1.0.0`

## 8. Technical debt

- [ ] **No real ESLint config anywhere** — every workspace's `lint` script is `tsc --noEmit`.
      Accepted at scaffold time for velocity; never paid off.
- [ ] No error boundaries or logger convention in either app
- [ ] `packages/db` types are hand-maintained: `gen:types` targets `--local` and the stored access
      token lacks the types endpoint (D-030)

## 9. Docs drift — worth an hour

- `roadmap.md`, `release-plan.md`, `launch-checklist.md` are dated **2026-07-16** and **every
  calendar target has slipped.** V1.0 was set for the week of 2026-09-01 — about two weeks out —
  with the Play clock not yet started, and that alone needs 14 continuous days plus a review pass.
  The ladder needs re-dating against the real constraint (SMTP → cohort → Play clock), not
  quietly ignored.
- `decision-log.md`'s header says last-updated 2026-07-19; it carries entries through 2026-08-08.
- Gates **G1 and G2 cannot be run** — they are pre-registered against cohort data that does not
  exist, because no cohort exists.
- Docs still say "NexLex" in prose (D-014 left the cosmetic sweep deliberately undone).
- `phases.md` remains as a historical build log, superseded by the roadmap for forward planning.

---

## The one real dependency chain

```
rotate service key ─┐
                    ├─► SMTP + {{ .Token }} template ─► sign-in works ─► sync + reminders buildable
DMARC + API key ────┘
                                   │
Sentry DSN + PostHog dashboard + mobile analytics wired ─► a cohort is worth recruiting
                                   │
Play Console + 12 testers × 14 days (calendar time, start NOW, runs in parallel) ─► V1.0 Android
```

Recruiting a cohort before instrumentation is wired spends the scarcest resource — warm users —
on a week that produces no measurements.
