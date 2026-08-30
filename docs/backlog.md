# Vidhara — Backlog

> **Status**: Living document — the single list of what is not done. · **Last updated**: 2026-08-25 (D-078; web perf + the heading repairs — corpus at 0 defective divisions of 478)
> Compiled from decision-log D-001…D-070, launch-checklist, roadmap and a live check of the
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
| `/api/v1/health` | `{"ok":true,…,"db":"up"}` — now a real readiness check (D-066 session) |
| Corpus | **36 acts / 5,594 sections**, content-qa **0 SEV1**, SEV2 **14** (D-067) |
| Division headings | **478 divisions, 0 defective** (D-078) — verified on lone letters, single-letter titles, missing titles, keyword-in-title and run-together words |
| `/api/v1/revalidate` | **503** — `REVALIDATE_SECRET` unset in Vercel; see §6 for the two-minute fix |
| `hearing-reminders?action=status` | `{"configured":false}` — Edge Function secrets still unset |
| Git tags | `v0.1.0`, `v0.2.0` — no `v0.5.0` |
| DNS: Resend DKIM / SPF / MX | all three resolve ✓ (domain verified) |
| DNS: `_dmarc` | ✅ `v=DMARC1; p=none` on all four nameservers |

---

## 1. Email + auth — the unblocker

**Web sign-in is live and confirmed working (D-065).** D-021 diagnosed this as configuration-only;
that was half right. The templates did need rewriting to emit `{{ .Token }}` — but both clients
also hardcoded a **6**-digit code against a project that issues **8**, so mail alone would not have
produced a working sign-in on either surface. Both are fixed; the schema now lives in
`packages/shared` and accepts Supabase's whole 6–10 range.
Runbook: [domain-and-email-setup.md](domain-and-email-setup.md).

- [x] Domain `vidhara.bahukhandi-labs.com` live on Vercel
- [x] Resend account created; `bahukhandi-labs.com` verified (DKIM + SPF + MX resolve)
- [x] Resend API key into Supabase → Auth → SMTP (`smtp.resend.com`, user `resend`)
- [x] **Magic Link + Confirm signup templates emit `{{ .Token }}`** — the actual defect
- [x] Auth rate limit raised; Site URL set
- [x] Real OTP delivered end to end, **inbox not spam** on a cold domain
- [x] **Web sign-in / sign-up shipped and confirmed working by the founder** (D-065) — mode
      toggle, "no account uses that email yet", name + role + exam targets on sign-up
- [x] OTP length bug fixed on **both** surfaces — both validated `/^\d{6}$/` against this
      project's 8-digit codes, so the app could never have signed in either (D-065)
- [x] **`_dmarc` TXT record** added and verified on all four BigRock nameservers plus Cloudflare
      and Google. Mail auth is now complete: DKIM + SPF + MX + DMARC. Tighten to `p=quarantine`
      after a few weeks of clean `rua` reports; do not jump to `p=reject`.
- [ ] Edge Function secrets: `SMTP_*` + `REMINDERS_CRON_SECRET`; schedule the daily
      `hearing-reminders` POST (~18:00 IST). **A separate store from Auth SMTP** — the function
      still reports `{"configured":false}`, so reminders remain dark and the control stays hidden.
- [ ] **Verify sign-in on the Android app.** Fixed in code, never run on a device — the build is
      blocked by §10.

**Unblocks:** ✅ sign-in · cross-device sync (not built) · diary sync (not built) · hearing
reminders (built, still inert — needs the Edge Function secrets above).

## 2. Security

- [x] **Supabase `service_role` key rotated** (2026-08-16) and `scripts/ingest/.env` updated.
      Verified: the new key authenticates as service_role against a table with no SELECT policy,
      and the Edge Functions picked it up automatically from Supabase's injected env. This closed
      the item that had trailed every decision entry from **D-032 to D-063**.

## 3. Founder-account items (launch critical path)

- [x] Vercel deploy + custom domain
- [x] PostHog project live on EU cloud, events verified reaching `eu.i.posthog.com/e/`
- [ ] PostHog **"Vidhara Core" dashboard** (analytics-plan §Dashboards) — never built
- [ ] **Cohort tagging verified end-to-end** in the PostHog UI (`?c=beta-1` → `vidhara_cohort` →
      `cohort` on every event). Must be proven **before any invite goes out**, or the beta
      produces uncohorted data.
- [x] **Sentry live on web** — DSN set, error delivery proven (`flush()` returned true, event
      `ef65e96b…`, environment `production`, release `0.1.0`). This also closed V0.1's last unmet
      success criterion. **Gotcha:** `NEXT_PUBLIC_*` vars are compiled into the bundle, so Vercel's
      default "Use existing Build Cache" silently ships the old one — the first redeploy did
      nothing. Source-map upload (`SENTRY_ORG`/`PROJECT`/`AUTH_TOKEN`) still not configured, so
      stack traces are minified.
- [x] **Sentry on the RN app** — added in D-070; see §4 (never run on a device yet).
- [x] **UptimeRobot** monitors on `/` and `/api/v1/health`. The health endpoint was a static
      `ok:true` that never touched Supabase, so the monitor would have stayed green through a total
      database outage; it now returns a real `db` readiness field and the keyword watches
      `"db":"up"`. Both the up and down paths were exercised before trusting it.
- [x] **Google Search Console** — domain property `sc-domain:vidhara.bahukhandi-labs.com`
      verified (isolated from the apex Bahukhandi Labs property), sitemap submitted. Already
      serving: 278 impressions, avg position 38.8, impressions climbing. Sitemap now carries
      `lastmod` on 5,630 URLs, and section pages emit `BreadcrumbList`.
      **Check the sitemap flipped from "Couldn't fetch" to Success.**
- [~] **OG cards technically verified** — 1200×630, `image/png`, absolute URLs, every page type
      covered, and D-026's tofu-box fix confirmed holding by rendering the images. **Still needs a
      human with the apps**: WhatsApp, Telegram, and the Facebook Sharing Debugger's *Scrape Again*
      (which also flushes previews cached from the old Vercel origin).
- [ ] **Play Console** account (₹25) → app created → closed-testing track
- [ ] **12 testers × 14 continuous days** — the clock has never started and is the long pole.
      Calendar time; it cannot be compressed. Record the start date in the decision log.

## 4. Android / mobile

- [x] **Mobile analytics wired** (D-070) — `posthog-react-native`, same project as the web, dev
      never sends. No native module added (all peer deps optional, AsyncStorage already present).
      ⚠️ **Never run on a device** — the first `expo run:android` is the verification.
      ⚠️ Mobile persists its distinct_id; the **web does not** (`persistence: "memory"`), so
      retention is measurable on Android and not on the web. Still unsettled — see §3.
- [x] **Sentry in the RN app** (D-070) — errors only, no screenshots or view hierarchy (the diary
      holds privileged matter), inert without a DSN, disabled in dev. ⚠️ **Never run on a device.**
- [ ] `expo run:android` on the physical device, then EAS build → Play closed track
- [ ] **Untested paths** (D-048): the **camera** and **DocumentPicker** flows for case documents.
      A simulator has no camera. The gallery path is verified down to the filesystem; these two
      share `adopt()` with it but their pickers are unproven.
- [ ] Permission usage strings unverified in situ — Expo Go shows its own wording, so the strings
      added in D-047 have never been seen by a user. Check on the first EAS build.
- [x] **Case documents bounded** (D-070) — 25 MB per file, 250 MB total, refused before the copy;
      the same file attached twice reuses the stored bytes, and deletion is reference-aware so
      removing one record cannot destroy another's document.
- [ ] Mobile renders no schedules (D-036) — the Limitation Schedule browse page is web-only
- [ ] Serif font not bundled via expo-font; native falls back to the system font (cosmetic)

## 5. Content / corpus

Corpus is **36 acts / 5,594 sections at 0 SEV1**. Remaining work is characterised, not unknown.

- [x] **Category A cleared (D-066): SEV2 29 → 19.** Ten bodies carried appended non-statute text —
      cross-headings, footnote apparatus, and the entire First Schedule inside CRPC §484 "Repeal and
      savings" (1,747 chars). Repaired bundle-first and republished; 1,271 mappings intact.
- [x] **Illustration continuations restored (D-067): SEV2 19 → 14.** Four acts print an
      illustration's first line at body height and its wrap at footnote height, so the block closed
      on its own opening line and continuations were dropped — invisible to every check, because a
      cut after a full stop still ends like a sentence. Fixed in the parser and regressed across
      2,240 sections: 0 notes changed, 0 text lost, 11 bodies restored, 2 watermark removals.
      **All seven source PDFs are now on disk** (`scripts/ingest/.sources/`, gitignored) and
      verified against provenance, so the next parser change can be regressed without re-fetching.
- [x] **Chapter/part headings repaired (D-074): 25 mangled → 1.** Two parser failures, both in
      heading extraction only. (a) A title carrying the print's amendment apparatus was recovered
      by neither height test, because the recovery used a stricter pattern than the one that
      decides downstream whether a line IS a title — IPC Ch. VII reached the database as
      `O O R A, N A F`. (b) pdftotext's fixed advance-width rule cannot read these acts'
      letter-spaced caps, so it emitted every glyph as its own word in some titles and dropped the
      space between words in others. Fixed by re-deriving word boundaries from the gaps
      themselves, per line, since tracking is constant within a line but not across acts.
      Where BOTH printings of a title ran words together, the repair keys on the title's LETTERS
      alone — so it can move a space and can never change a word — and takes the spacing from
      whichever of the act's two printings has it, falling back to the act's own prose as the
      witness for a split. **29 of 30 checked titles now exact**, 24 spacing-only repairs,
      2 full recoveries, 0 regressions, 9 section bodies incidentally repaired
      (`money s o expended` → `money so expended`). Published to IPC/NI/TP.
- [x] **NI sections 61–77 were filed under the wrong chapter** — found by the same fix. Chapter V
      "OF PRESENTMENT" was invisible while its heading was letter-spaced, so its eighteen sections
      (§61 *Presentment for acceptance* onward) sat under Chapter IV "Of Negotiation". The act now
      has its full 17 divisions.
- [x] **ITA re-fetched and repaired (D-075): 6 broken divisions → 0.** D-074 reported one; its
      scan only looked for headings with two or more lone letters, so it missed single-letter
      titles, missing titles and the keyword-in-title case. A four-signature re-scan put the real
      corpus figure at **46 suspect divisions**. ITA's six are fixed and published, every title
      verified against the source's own text.
- [ ] **India Code has migrated to `indiacode.gov.in`** — every `handle/123456789/…` URL recorded
      in a bundle's provenance now 504s or reports "No item found", so the provenance trail of the
      whole corpus points at dead URLs. The DSpace 7 REST API is the reliable route
      (`/server/api/discover/search/objects`, filter `f.identifier_collection=ACT,equals`), and a
      title search returns State adoptions first — the central Act is reached via their
      `dc.identifier.refact` pointer. **Worth a sweep to re-record every act's source URL.**
- [x] **ISA's 39 chapters named (D-076).** That act sets its chapter titles in sentence case flush
      with the left margin, so neither the all-caps nor the centred test could see them — while its
      11 Parts, set in caps, were named correctly all along. Recognised now by the geometry the
      print itself uses: a heading and its title share a left edge the body does not. **Corpus
      goes from 46 suspect divisions to 1.**
- [x] **NDPS Chapter VA named (D-077) — the corpus is at 0 suspect divisions of 478.** Re-fetched
      like ITA. Also fixed the stamp filter, which required a stamp to be TALLER than the body:
      true for ITA (9.94pt body) but not NDPS (12.22pt), so the stamp's smallest run sat under it
      and reached 38 bodies. The test is now "any size but the body's".
- [x] **The last two headings decided (D-078) — corpus at 0 defective divisions of 478.** ITA
      Ch. V takes the contents-page reading ("RECORDS AND SECURE"); IPC Ch. XIV gains its space in
      "DECENCY AND". Both are reviewed corrections in
      `scripts/ingest/src/repairs/repair-heading-typos.mjs`, cited in provenance, and neither
      loosened the cross-printing rule. **Correction to D-074's framing:** measuring per-glyph
      advance widths shows the IPC's fused headings are fused in the PRINT, not by pdftotext — so
      that class of defect will always need a second printing or a decision, never a better parser.
- [ ] **CPC's 38 missing illustration lines did NOT come back** — that act fails for a different
      reason D-067's fix does not reach. Measure it next; the source is on disk.
- [ ] **ISA §281 still truncated** — needs D-062's `--rule-delimited` mode, not run in D-067.
- [ ] **14 SEV2 remain, and they split by what they need, not by severity:**
      - **3 are missing statute text** — TP §126 ends "the right to take back at", ISA §281 at
        "declare that", NI §52 mid-illustration. **Blocked on source PDFs**, which are not on disk.
        The words cannot be written from recall (D-011; D-031 records that going wrong).
      - **~6 lack only a full stop**, in illustrations the print itself mangles — cosmetic.
      - the rest are dup-body / bracket-count / genuinely-short articles, characterised in D-063.
- [ ] **Parser fix for the trailing-heading rule** — D-066 measured exactly why it missed these
      (tail capture excludes `.` so heading markers like "B.—A" never match; 60-char cap too short
      for CPC §67's 84-char heading). **Blocked on the same source PDFs**: without them the
      old-vs-new regression cannot run, and D-056 is the record of widening these rules unmeasured.
- [ ] **Re-fetch source PDFs for TP, ISA, NI, CPC, CRPC** — unblocks both items above. Provenance
      in each bundle records byte counts and SHA-256, so a re-fetch is verifiable (D-037 did this).
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

- [x] **Offence classification is LIVE (D-079/D-080/D-082) — 827 rows, 766 stating one answer.**
      The one fact a bare-act reader cannot get from the section's own text, now on every IPC and
      BNS section page: whether the police may arrest without a warrant, whether bail is a matter
      of right, and which court tries it. 440 BNS rows from the BNSS First Schedule, 387 IPC rows
      from the CrPC's. Migration 0021 applied; verified as `anon` through
      `v_offence_classifications` and rendered on IPC 302, 109 and BNS 318.
      Conditional rows ("According as offence abetted is…") and sections whose rows disagree show
      the schedule's own words with no verdict — 61 rows are held back that way on purpose.
- [x] **Zero empty schedule rows (D-083).** IPC 376A and 507 were not two stubborn rows but a
      wrong idea about what a line is: a cell is set vertically centred against its row, so a short
      one lands a few points off the row's first line. Raising the line tolerance to 6pt (leading is
      9.24pt in the CrPC, 12.6pt in the BNSS) fixed both — and revealed that IPC 373 and 374 had
      been carrying each other's bail status, which no empty-row count would ever have shown.
- [x] **Part II of both schedules is LIVE (D-084) — both schedules are now complete.** The
      "offences against other laws" table, keyed by punishment band rather than by section. It is
      the only classification the other 34 Acts here have: Part I covers the BNS and the IPC, Part
      II covers NDPS, POCSO, the PC Act, and the NI Act whose s. 138 fills more cause lists than
      anything else in the country. 6 bands live (3 BNSS, 3 CrPC) via migration 0022.
      **Stored as a rule and applied by the reader, never by us.** Placing a section in a band
      means reading its punishment clause and classifying it — NDPS 20 alone spans all three bands
      — which is model inference dressed as data (ADR-6/D-011). The panel shows the rule beside
      the punishment the reader can already see, collapsed by default, with a link to s. 5 of both
      codes, which saves any special or local law providing to the contrary.
      The two prints parse to identical bands despite different column geometry and the CrPC's use
      of Ditto; the UI says so only because it checks it at render time.
- [ ] Residual rule shows on BSA and IEA section pages, which create no offences to classify.
      Harmless while collapsed; scope it if an "Act creates offences" fact ever comes from source.

- [x] **Inline footnotes are out of the statute text (D-085) — 68 sections → 1.** Amendment
      footnotes were being spliced mid-sentence into bodies across nine Acts. The cause was that
      `MIN_BODY_HEIGHT = 8.6` had been measured on three PDFs whose body is 9–10pt; the NDPS and CPC
      set body at 12.22pt and footnotes at 9.96pt, so their footnotes read as body type and could
      never arm the footnote latch, which only fires on small type. Now scaled to the document's own
      modal height, per page, and never below the measured 8.6 — eight of ten local prints parse
      byte-identically.
      **The damage was not cosmetic.** NDPS §2 had lost every definition from (iva) on, including
      "commercial quantity" and "small quantity"; NDPS §3 was missing outright; CPC §3's body was 21
      characters; and §§3, 4, 5, 6, 8 of the CPC plus §4 of the NDPS and MV carried footnote
      fragments ("Subs", "Ins") as marginal notes. Also fixed: bracketed repealed sections being
      stripped (CPC §48), a bracket cutting inside a repeal citation (TP §130A), and a run-in dash
      with no preceding full stop matching nothing (10 sections, 4 acts).
      Six acts were re-fetched — India Code has migrated to indiacode.gov.in and split every Act
      into per-section items; whole-Act PDFs are in the CENTRAL community's "Acts" collection.
- [ ] **Constitution is the last act with inline footnotes** (1 section). Fixing it means
      re-ingesting from the **2026 English consolidation** now on India Code, which would also close
      the 105th/106th Amendment gap recorded above — worth doing deliberately, not as a side effect.
- [ ] **MV §217A, SCST §23 and PCA §31 absorb their Act's trailing Statement of Objects and
      Reasons.** The last section of an act runs on into the appendix. HMA §30 was fixed by D-085's
      re-ingest; these three remain.

## 6. Product gaps named in their own entries

- [~] **On-demand revalidation** — `POST /api/v1/revalidate` is built, bounded and secret-gated,
      and it is **still returning 503 in production** because `REVALIDATE_SECRET` was never set.
      This is the last founder-only item on the content path, and it is not cosmetic: every
      content repair currently waits behind ISR's hourly timer, which cost six separate
      cache-waits during the D-074…D-078 heading work alone. For a corpus where a wrong section
      is a Sev-0 (D-011), an hour of knowingly serving wrong text is the wrong default.

      **To switch it on** (≈2 minutes, and nothing in the repo needs to change):
      1. Generate a secret locally — `openssl rand -hex 32`. Do not paste it into a chat, a
         commit, or an issue; it is a cache-eviction primitive.
      2. Vercel → the Vidhara project → Settings → Environment Variables → Add.
         Name **`REVALIDATE_SECRET`**, value from step 1, scope **Production** (Preview too if
         you want to test there). **No `NEXT_PUBLIC_` prefix** — that prefix is what would
         compile it into the client bundle and hand it to every visitor.
      3. Redeploy, and **untick "Use existing Build Cache"** — env vars are read at build time,
         and D-068 lost a Sentry rollout to exactly this.
      4. Verify: a POST with a wrong secret must return **401**, and with no secret **503**.
         Once it returns 401 rather than 503, the route is live.
      After that a publish can invalidate the pages it touched instead of waiting an hour:
      `POST /api/v1/revalidate` with header `x-revalidate-secret` and body
      `{"paths":["/acts/ipc"]}` (≤100 paths per call).
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

- [x] **ESLint runs for both apps** (D-070) — narrow by design; the rule worth its keep forbids
      referencing a server-only secret from anywhere that can ship to a browser.
- [ ] No error boundaries or logger convention in either app
- [ ] **Refactor localStorage/AsyncStorage hooks to `useSyncExternalStore`** — nine call sites read
      storage inside an effect to stay SSR-safe (local-library, case-diary, cite-cache, useSession,
      and the mobile equivalents). `react-hooks/set-state-in-effect` is switched OFF for exactly
      those; `useSyncExternalStore` is the right primitive and the rule should come back on after.
      A seven-file refactor with real regression risk, so it is its own piece of work (D-070).
- [ ] `packages/db` types are hand-maintained: `gen:types` targets `--local` and the stored access
      token lacks the types endpoint (D-030)

## 5b. CPC Orders and Rules — done (D-068)

- [x] **57 Orders, 728 rules published** to `act_orders` / `act_order_rules` (migration 0017) and
      rendered at `/acts/cpc/orders`. "Order 7 Rule 11" now resolves to the rule instead of seven
      sections matched on the digit. 78% of that Act, previously absent.
- [x] **The Appendices are ingested (D-069)** — 9 appendices, 213 forms, rendered at
      `/acts/cpc/appendices` with their line breaks and dotted blanks preserved.
- [x] **Forms are in full-text search** (migration 0020, `search_appendix_forms`). Third result
      group on /search, alongside sections and rules.
- [ ] **Appendix A's sub-sections are unmodelled** — its numbering restarts (49 plaints, then
      defences from No. 1) and the print marks the groups with no heading the parser can rely on,
      so two forms cited "Appendix A, No. 1" are told apart only by position.
- [x] **Orders are in full-text search** (migration 0018, `search_order_rules`). "rejection of
      plaint" returns Order VII rr.11–13; "temporary injunction" returns Order XXXIX r.1. Shown as
      their own group, not merged into sections — a rule is cited and routed differently. Verified
      the RPC uses the GIN index (`Bitmap Index Scan`, ~6ms) rather than a seq scan.
- [ ] **TP's and CrPC's schedules** could now use this same pattern.

## 10. The repo lives inside iCloud Drive — it corrupts builds

Confirmed by inode, not inferred: `docs/backlog.md` is the same file at `~/Documents/…` and at
`~/Library/Mobile Documents/com~apple~CloudDocs/Documents/…`, and two merge-conflict folders sit
beside the project.

iCloud writes conflict copies (`… 2.bin`, `… 3.xml`) **inside** `node_modules` and Gradle output
dirs. Gradle hashes everything in its own snapshot directories, so it dies on files it did not
create and cannot read. Three Android builds failed this way on 2026-08-16, one after 27m54s.
468 artifacts were cleared and **102 came back within two minutes** — a 10-30 minute build cannot
win that race. `next dev` and `tsc` wedge on the same cause, sleeping at 0.2% CPU rather than
failing outright, which reads as "slow" and is not.

- [x] `node_modules`, workspace `node_modules`, `.turbo` protected — created **empty**, marked
      with `com.apple.fileprovider.ignore#P`, *then* populated. A full `pnpm install` under that
      regime produced zero duplicates. Retrofitting the attribute onto an already-synced tree does
      **not** work and briefly makes files unreadable.
- [ ] `apps/mobile/android` is **not** protected — the next Gradle run will churn again. This
      affects the founder's own `expo run:android`, not just an agent's.
- [ ] **Decide the real fix** (founder's call, both touch the machine rather than the repo):
      turn off System Settings → iCloud → iCloud Drive → Options → *Desktop & Documents Folders*,
      or move the repo somewhere unsynced (`~/dev/NexLex`). Nothing else makes long builds reliable.

## 9. Docs drift — worth an hour

- [x] **Reconciled 2026-08-16.** `roadmap.md`, `release-plan.md`, `launch-checklist.md`,
  `feature-priority.md`, `validation-plan.md`, `analytics-plan.md`, `success-metrics.md` and
  `user-feedback-plan.md` now carry dated status blocks stating what actually happened. The
  pre-registered go/no-go criteria were **not** edited — their value is that they predate the
  data (D-012) — so releases that shipped without evaluating their gate are marked unevaluated
  rather than retrofitted into a pass.
- [ ] **Re-date the ladder once the Play Console account exists.** Every date from V0.5 rightward
  descends from that clock; re-dating before it exists would just produce a second fiction.
- [x] `decision-log.md` header corrected (was 2026-07-19 against entries running to D-065).
- Gates **G1 and G2 cannot be run** — they are pre-registered against cohort data that does not
  exist, because no cohort exists.
- [x] Docs prose swept to "Vidhara" (2026-08-16). Preserved on purpose: the on-disk directory `NexLex/`, D-014's own entry, and the internal `@nexlex/*` package names.
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
