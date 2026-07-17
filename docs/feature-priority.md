# NexLex — Feature Priority

> **Status**: Living document. · **Last updated**: 2026-07-16
> Every feature from the long-term vision, forced into exactly one bucket. The five product questions (why exist / what problem / launchable without? / how do we detect demand? / success metric) are answered inline — condensed where the answer is obvious, expanded where the call is contentious. Buckets change only via a [decision-log.md](decision-log.md) entry.

**Bucket meanings.** MUST = the product is meaningless without it. SHOULD = scheduled, earns its slot in a named release. NICE = built only if users ask and it's cheap. FUTURE = parked with an explicit unlock condition ([future-ideas.md](future-ideas.md)). REMOVE = off the roadmap entirely; revisiting requires new evidence, not new enthusiasm.

---

## MUST HAVE

### Bare Acts (V0.1 — already built)
The reading surface everything else hangs on. **Problem:** authoritative, readable statute text vs scanned PDFs and ad-ridden sites. **Launch without it?** No — it is the product. **Demand signal:** already validated externally (India Code's traffic, bare-act book sales); ours is sections/session. **Success:** ≥5 sections/active session.

### Old⇄New Law Mapping (V0.1 — already built)
**The wedge.** 1,271 official NCRB-sourced mappings nobody else surfaces this cleanly. **Problem:** every textbook, senior's notes, coaching material and old judgment cites IPC/CrPC/IEA; exams and courts now run BNS/BNSS/BSA. The cross-reference is a daily, unavoidable need with a shelf-life — urgency peaks now. **Launch without it?** Technically yes, strategically no: without it we're a worse Indian Kanoon. **Demand:** mapping_lookup volume + landing conversion (E-2). **Success:** ≥3 lookups/user/week; mapping cards viewed in ≥50% of reading sessions.

### Search (V0.1 basic, V0.2 polish — already built)
Structured parser ("302 IPC") + FTS. **Problem:** nobody browses to §420 through a chapter tree. **Launch without?** No — it's how a 3,118-section corpus is entered. **Success:** search→section click-through ≥70%; zero-result rate <15%.

## SHOULD HAVE

### Share / Export-as-links (V0.2)
WhatsApp/Telegram share + OG cards per section. **Why now:** the audience organizes in group chats; a shared "BNS 103 = old IPC 302" card is free distribution *and* a demand test. **Launch without?** Could, but we'd be blind on the cheapest growth channel. **Success:** ≥5% of readers share; measurable inbound from shared links. *(Full "Export to PDF/notes" is FUTURE — different, heavier need.)*

### Bookmarks (V0.5 — local-first)
**Problem:** aspirants revisit the same 50–100 sections for months. **Why local-first:** an account wall in front of an unproven product measures signup friction, not feature demand (D-007). **Launch without?** V0.1 yes; retention measurement wants it by beta. **Success:** ≥30% of WAU have ≥1 bookmark; bookmark-owners' D7 > non-owners'.

### Recents / Continue Reading (V0.5)
Cheapest possible return-visit aid; also an instrument (resumed sessions are a retention diagnostic). **Success:** ≥25% of return sessions start from recents.

## NICE TO HAVE (build only on explicit user pull + cheap)

### Notes · Highlights
Plausible for study, but paper notebooks, coaching modules and PDF annotators already fill this; syncing/editor UX is deceptively expensive. **Detect demand:** interviews + "what did you do right after reading?" observation. **Unlock:** ≥5 unprompted interview requests. Until then: no.

## FUTURE (parked with unlock conditions — see future-ideas.md for detail)

### AI Tutor → first as "Explain this section" probe (V1.1 candidate A)
The vision's centerpiece and the biggest trap. Wrong legal answers to exam-takers are trust-fatal; a general tutor also has unbounded scope. So: **fake door at V0.5**, and if chosen at G1, a *scoped* section-grounded explainer with a pre-launch eval set (release-plan §V1.1). The full tutor unlocks only if the probe shows adoption ≥30% WAU + retention lift. **Not** in the MVP: the corpus without AI is already differentiated; AI without proven retention is an expensive demo.

### AI Quiz / Daily MCQs (V1.1 candidate B — merged, one habit loop)
Strong habit mechanics for the exam segment, zero hallucination risk if hand-authored from the corpus. Fake door at V0.5; wins V1.1 on CTR + interview pull. Flashcards (below) only make sense downstream of this path.

### Offline (V1.1 candidate C, Android)
Real pain (data costs, spotty campus networks) but the highest build cost of the three candidates; needs the strongest signal to win G1. Fake door on the Android beta build.

### Flashcards
Anki exists; only viable as an extension of a *winning* MCQ loop. Unlock: MCQ path validated first.

### Study Planner
Generic planners lose to Google Calendar + coaching schedules. Unlock: interviews reveal a planning pain *specific to statute coverage* (e.g. "track which acts I've finished") — that would be a progress-tracker, not a planner.

### News
Commodity — LiveLaw/Bar&Bench own it, and it drags the product toward content-ops (a different company). Unlock only as a thin retention hook (e.g. "amendments affecting your bookmarked acts") after retention exists.

### Case Law Search
A second product with a giant incumbent (Indian Kanoon) and a different corpus economics. Unlock: post-PMF expansion toward advocates, earliest post-V2.0.

### Sync (cross-device)
Waits for accounts to earn existence: unlock when local bookmarks hit ≥30% WAU usage and users hit the two-device wall in interviews.

### Subscriptions (V2.0, gated on G2)
Not a feature — the business test. Charging before retention measures how fast users leave. Pricing hypothesis retired until pricing interviews (release-plan §V2.0).

## REMOVE (off the roadmap; parked in future-ideas.md with hard unlock conditions)

**The test applied:** "If we remove this, will users care?" — for everything below, there are no users to care, and each is either a *different startup*, a *post-PMF luxury*, or *gamification without a game*.

- **Advocate Workspace** — different customer (advocates), different job (practice management), different sales motion. This is startup #2. Unlock: PMF on students + advocate pull evidenced by organic advocate usage of the mapping.
- **AI Drafting** — startup #3 (professional tooling, liability exposure, different buyer). The vision keeps it; the roadmap doesn't.
- **AI Courtroom Trial Simulator / AI Moot Court / AI Judge** — spectacular demos, unproven retention, highest LLM cost and highest wrongness risk in the whole vision. These are what you build *from* a moat, not *toward* one. Unlock: PMF + revenue + a validated pedagogy partner.
- **Virtual Internship** — a marketplace/credentialing product needing institutional partnerships. Startup #4.
- **Community** — cold-start death: the audience already has WhatsApp/Telegram communities; we *use* those (user-feedback-plan) instead of competing with empty rooms. Unlock: organic user-to-user behavior appears inside the product (e.g. shared bookmark lists being requested).
- **Leaderboards · Achievements** — gamification layered on a habit loop that doesn't exist yet. Revisit only atop a validated MCQ/streak loop, and even then skeptically (exam-takers need trust, not badges).
- **Calendar** — Google Calendar exists; no statute-specific angle. 
- **User-facing Analytics ("your study stats")** — needs months of per-user data volume to be meaningful; meaningless at current n. Downstream of MCQ/planner validation, if ever.

---

## Reference table

| Feature | Bucket | Release | One-line why |
|---|---|---|---|
| Bare Acts | MUST | V0.1 ✅ | The product |
| Law Mapping | MUST | V0.1 ✅ | The wedge |
| Search | MUST | V0.1 ✅ /V0.2 | Corpus entry point |
| Share links (Export-lite) | SHOULD | V0.2 | Free distribution in group chats |
| Bookmarks (local) | SHOULD | V0.5 | Retention machinery + measure |
| Recents | SHOULD | V0.5 | Cheapest return aid |
| Notes | NICE | — | Only on unprompted pull ≥5 |
| Highlights | NICE | — | Ditto |
| AI Tutor (scoped probe first) | FUTURE | V1.1 cand. A | Fake door → eval-gated probe |
| AI Quiz + Daily MCQs | FUTURE | V1.1 cand. B | Habit loop, zero AI risk |
| Offline | FUTURE | V1.1 cand. C | Real pain, high cost, needs strongest signal |
| Flashcards | FUTURE | — | Only downstream of MCQ win |
| Study Planner | FUTURE | — | Only as statute progress-tracker |
| News | FUTURE | — | Only as amendment alerts, post-retention |
| Case Law Search | FUTURE | post-V2.0 | Second product; incumbent |
| Sync | FUTURE | — | When bookmarks earn accounts |
| Subscriptions | FUTURE | V2.0 (G2-gated) | Business test, not feature |
| Advocate Workspace | REMOVE | parked | Startup #2 |
| AI Drafting | REMOVE | parked | Startup #3 |
| Trial Simulator / Moot Court / AI Judge | REMOVE | parked | Post-PMF flagships |
| Virtual Internship | REMOVE | parked | Startup #4 |
| Community | REMOVE | parked | Cold-start; use existing groups |
| Leaderboards / Achievements | REMOVE | parked | Gamification without a game |
| Calendar | REMOVE | parked | Google Calendar |
| User Analytics | REMOVE | parked | No data volume to analyze |
