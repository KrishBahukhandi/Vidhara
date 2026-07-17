# NexLex — Launch Checklists

> **Status**: Living document. · **Last updated**: 2026-07-16
> Run top-to-bottom per release; check items off in a copy pasted into the release's decision-log entry. The smoke script and rollback plan live here because they're rehearsed, not improvised.

---

## Smoke script (15 min — run on every release, desktop + one real Android phone)

1. `/` loads <3s on 4G; no console errors.
2. `/acts` → open IPC → chapter tree renders → open §420.
3. Reader: serif statute text, marginal note, mapping card (§420 → BNS 318 merged) → tap through to BNS 318 → back.
4. Mapping tab / landing lookup: "302 IPC" → BNS 103 card; "154 crpc" (lowercase) → BNSS 173; nonsense ("999 XYZ") → graceful not-found.
5. Omitted/new rendering: IPC 497 (omitted → "No corresponding provision"), BNS 304 (new provision).
6. Search: "cheating" → results → click-through; "dowry death" → IPC 304B & BNS 80 present.
7. Share a section link → open in incognito → renders + OG preview correct (WhatsApp link debugger).
8. Feedback widget submits (verify row in Supabase).
9. Force a test error → appears in Sentry with correct release tag.
10. PostHog live events: confirm `section_viewed`, `mapping_lookup`, `via` values sane.

## V0.1 checklist (target Fri 2026-07-18)

**Code side (DONE 2026-07-16, verified in local preview + prod build):**
- [x] Analytics module `apps/web/src/lib/analytics.tsx` — PostHog cookieless, event schema v1, no-ops without key; `$pageview` / `act_opened` / `section_viewed`(+`via`) / `mapping_card_viewed` verified firing
- [x] Sentry wired (client/server/edge configs + `global-error.tsx`), errors-only, no-ops without DSN; source-map upload activates on Vercel env
- [x] Disclaimer footer + `/privacy` page (plain-language, matches analytics-plan posture)
- [x] Landing honesty pass (no phantom AI tutor, real CTAs, wedge-first copy)
- [x] Deploy hardening: section pages on-demand ISR (was: 3,118-page builds); /mapping index previews 40/pair with exact counts (was: 1,271 panels + silent 1,000-row truncation); **sitemap fixed — was silently capped at 1,000 of 3,129 URLs** (PostgREST default limit; now paginated)
- [x] `.env.example` documents all observability vars
- [x] Repo pushed to GitHub (`KrishBahukhandi/Vidhara`)

**Founder-account side (READY — blocked only on account creation):**
- [ ] **Vercel**: import the GitHub repo → *Root Directory: `apps/web`* (framework auto-detects Next.js; pnpm workspace handled automatically — "Include files outside root directory" stays ON). Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (the deploy URL), then PostHog/Sentry vars as created below.
- [x] **PostHog** (DONE 2026-07-17): project on **EU** cloud; publishable key baked into analytics.tsx (localhost-gated so dev never pollutes); **verified live** — config.js loads with the key, events POST to `eu.i.posthog.com/e/`. Remaining: build the "Vidhara Core" dashboard (analytics-plan §Dashboards) in the PostHog UI.
- [ ] **Sentry**: create project (Next.js) → paste `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` for source maps) → force a test error → verify
- [ ] **UptimeRobot**: monitors on `/` and `/api/v1/health`
- [ ] Smoke script on the LIVE URL (desktop + Android Chrome)
- [ ] 5 friendly walkthroughs scheduled
- [ ] Tag `v0.1.0`; decision-log entry with this checklist's final state

## V0.2 checklist (target 2026-07-24)

**Code side (DONE 2026-07-16, verified in local preview):**
- [x] Landing lookup hero (`landing-lookup.tsx`): shared `parseSectionRef` ("u/s 302 ipc" → IPC §302 verified in-browser), inline hints on bad input, 4 example chips
- [x] Per-section share (`section-share.tsx`): WhatsApp/Telegram/copy with mapping-first text ("IPC §302 — Punishment for murder (now BNS §103)"), links carry `?via=share`
- [x] OG image per section (`opengraph-image.tsx`, verified 200 image/png) — spot-check previews in WhatsApp/Telegram debuggers once LIVE (needs public URL)
- [x] Feedback widget + migration `0005_feedback.sql` applied: anon INSERT 201 ✓, anon SELECT 401 ✓, score-constraint 400 ✓, UI submit → DB row ✓ (test rows cleaned)
- [x] Fonts: Source Serif 4 + Inter via next/font, wired to token classes (visual check ✓) — app-side expo-font lands with the V0.5 Android build
- [x] Events live in code: `landing_lookup_submitted`, `share_clicked`, `feedback_submitted`
- [x] DB types regenerated (migrations 0001–0005)

**Founder-account side (blocked on accounts):**
- [ ] Play Console account (₹25 one-time) → app created → closed-testing track → 12 testers enrolled + opted in → EAS build installed by all 12 → **clock start date recorded in decision-log**
- [ ] OG preview spot-check on the live URL (WhatsApp + Telegram debuggers) after Vercel deploy
- [ ] Smoke script on live URL; tag `v0.2.0`

## V0.5 checklist (freeze 2026-08-01, cohort in by 2026-08-03)

**Web code (DONE 2026-07-16, verified in preview):**
- [x] Local library (`lib/local-library.ts`): recents (capped 12, deduped) + bookmarks in localStorage, no auth (D-007); same-tab + cross-tab sync; SSR-safe (populates post-hydration, no mismatch)
- [x] Recents → "Continue reading" on home (`continue-reading.tsx`); verified viewing §420 surfaces it, link carries `?via=recents`
- [x] Bookmarks: `☆ Save`/`★ Saved` toggle on section pages + `/saved` list page + "Saved" nav link; `bookmark_added`/`bookmark_removed` fire
- [x] Fake doors (`fake-door.tsx`, honest "Coming soon · tap if you want this" → "Thanks — noted"): AI-explain (section), Daily MCQ (home); `fake_door_clicked {feature}` verified. Offline door is Android-only (ships with the app build)
- [x] All events fire in dev debug stream; `via` values thread through recents/bookmark links

**Founder / account side (blocked):**
- [ ] Cohort tagging: PostHog is now live so the code path is active (`?c=beta-1` → `vidhara_cohort` → `cohort` on every event). Still verify once end-to-end in the PostHog UI **before any invite goes out**.
- [ ] Beta WhatsApp group created; add its link (a beta-welcome banner is deliberately NOT built yet — pointless without the group URL; ~20 min once the link exists)
- [ ] Recruitment posts sent per user-feedback-plan §channels; 30+ committed before freeze
- [ ] Interview calendar: ≥3/week booked for weeks 1–3
- [x] **Mobile V0.5 parity built** (2026-07-17): apps/mobile has recents ("Continue reading" on Library), local bookmarks (Save on reader + Saved tab, was Notes), 3 fake doors (ai_explain reader / daily_mcq Library / offline Saved), all AsyncStorage local-first; renamed to Vidhara (app.json + strings; package com.vidhara.app); analytics is a stub (posthog-react-native to wire before the cohort). Verified in Expo web preview: view → recents, Save → Saved persists, fake doors vote. Typecheck green.
- [ ] Android beta build shipped to closed track (founder: `expo run:android` on device first, then EAS build → Play closed track)
- [ ] Monday metrics ritual: PostHog "Vidhara Core" dashboard exists; first `docs/metrics-log.md` entry template ready
- [ ] Smoke script on live URL; tag `v0.5.0` (after cohort tagging verified)

## V1.0 checklist (week of 2026-09-01)

**Content trust**
- [ ] Random 50-section QA vs bundle artifacts (`scripts/ingest/bundles/*.json` are the artifacts of record) — zero text diffs tolerated
- [ ] Omitted/new/split/merged mapping rendering spot-check (497, 377, 124A, 498A→85+86, BNS 304)

**Play production**
- [ ] Closed test: 12 testers × 14 continuous days complete; production access application submitted ≥1 week before target
- [ ] Store listing: title/short/full description (wedge-first copy), 6 screenshots (mapping lookup first), feature graphic, content rating questionnaire, data-safety form (matches analytics-plan §Privacy)
- [ ] Staged rollout plan: 20% → monitor 48h (Sentry + vitals) → 100%
- [ ] `minSupportedAppVersion` boot check tested (point health endpoint at a higher version on staging config, verify upgrade screen)

**Web/SEO**
- [ ] Search Console verified; sitemap submitted; 10 sample section URLs render statute text with JS disabled (SSG check)
- [ ] Meta/OG audit on the 5 page types; empty/error states audited (act with no chapters, 404 section, offline fetch failure)

**Ops**
- [ ] **Rollback drill executed** (see below) and timing recorded
- [ ] Sentry alert rules: crash spike + new-issue-in-release
- [ ] Launch posts drafted (Telegram/WhatsApp/LinkedIn) + press notes to Lawctopus/LiveLaw/Bar&Bench with a demo GIF
- [ ] Smoke script both platforms; tag `v1.0.0`; decision-log launch entry

## Rollback plan (rehearsed at V1.0, valid for every release after)

**Web (minutes):** Vercel → Deployments → previous production deploy → *Promote to Production*. No build wait; DNS untouched. Drill: promote previous, verify site, re-promote current, record elapsed time (target <5 min).

**Android:** Play staged rollouts can be **halted** (not recalled) → halt at current %, ship fixed `versionCode`+1 through the same track, resume staged. Users already on the bad build: if crash-on-boot severity, use server kill-switch (`minSupportedAppVersion` bump) — reserved for security/data-integrity/boot-crash only, because it force-blocks users.

**Database:** expand→migrate→contract discipline (standing rule) means app rollbacks never race schema: contractions only ship after the release that stopped needing the old shape is at 100%. Never a destructive migration during a rollout window. Point-in-time recovery: Supabase daily backups (~7-day window on free tier) — content is additionally reconstructible from committed bundles via the ingest pipeline (the real disaster recovery for the corpus).

**Content:** a wrong-text report = Sev-0 → verify against bundle + source PDF → fix via ingest republish path (edge-function pattern) → decision-log postmortem line. The corpus artifacts in git make any content state reproducible.

**Instrumentation:** analytics breakage = outage (a blind week costs a week of learning). PostHog event volume checked in the Monday ritual; sudden drops investigated same-day.

## Versioning

Semver git tags on `main` (`v0.1.0`…); web deploys continuously, tags mark release states; Android `versionCode` monotonic integer, `versionName` = semver; Sentry releases keyed to tags. No release branches until there's a team.
