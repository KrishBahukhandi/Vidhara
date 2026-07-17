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

- [ ] Vercel project created; `apps/web` builds green in Vercel CI (monorepo root config: `pnpm turbo build --filter=web`)
- [ ] Env vars: `NEXT_PUBLIC_SUPABASE_URL`, anon/publishable key ONLY (grep the client bundle for `service_role` as paranoia check)
- [ ] Domain: `*.vercel.app` acceptable; custom domain if already owned (do not spend a day on DNS)
- [ ] PostHog project + cookieless config + V0.1 events instrumented; events verified live
- [ ] Sentry web wired, source maps uploading, test error visible
- [ ] UptimeRobot monitors on `/` and `/api/v1/health`
- [ ] Disclaimer footer + `/privacy` page (plain language, analytics posture from analytics-plan)
- [ ] Smoke script passes (desktop + Android Chrome)
- [ ] 5 friendly walkthroughs scheduled (calendar invites sent — scheduling IS a checklist item because it slips otherwise)
- [ ] Tag `v0.1.0`; decision-log entry with checklist copy

## V0.2 checklist (target 2026-07-24)

- [ ] Landing lookup: 3 example chips work; mobile keyboard behavior sane (numeric-friendly input)
- [ ] OG images render for 5 spot-checked sections (WhatsApp + Telegram preview debuggers)
- [ ] Migration `0005_feedback.sql` applied via migration file (not dashboard SQL); advisors re-checked; RLS: anon INSERT-only, no SELECT
- [ ] Fonts: Source Serif 4 + Inter bundled (next/font web, expo-font app); visual check on low-end Android
- [ ] Play Console: app created, closed-testing track, 12 testers' emails added, **opt-in link confirmed by all 12** (chase individually — the 14-day clock needs them IN)
- [ ] EAS build installed by all 12 (verify in Play Console stats); clock start date recorded in decision-log
- [ ] New events live: `landing_lookup_submitted`, `share_clicked`, `feedback_submitted`
- [ ] Smoke script; tag `v0.2.0`

## V0.5 checklist (freeze 2026-08-01, cohort in by 2026-08-03)

- [ ] Recents + local bookmarks work across restarts (web localStorage, app AsyncStorage)
- [ ] Fake doors live with honest copy; `fake_door_clicked` verified
- [ ] Cohort tagging: click an invite link with `?c=beta-1` → confirm property on events end-to-end **before any invite goes out**
- [ ] Beta WhatsApp group created; onboarding screen links to it
- [ ] Recruitment posts sent per user-feedback-plan §channels; 30+ committed before freeze
- [ ] Interview calendar: ≥3/week booked for weeks 1–3
- [ ] Android beta build shipped to closed track (same features)
- [ ] Monday metrics ritual: PostHog "NexLex Core" dashboard exists; first `docs/metrics-log.md` entry template ready
- [ ] Smoke script both platforms; tag `v0.5.0`

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
