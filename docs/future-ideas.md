# NexLex — Future Ideas (Parking Lot)

> **Status**: Living document. · **Last updated**: 2026-07-16
> Everything cut from the roadmap lives here **with an explicit unlock condition** — the evidence that would justify revisiting it. Nothing leaves this file on enthusiasm; only on evidence, via a [decision-log.md](decision-log.md) entry. The long-term vision is preserved here, not abandoned — it's sequenced.

**Rule 9 reminder:** nothing in this file may slow a current release. No "small hooks for later", no speculative schema columns, no abstractions-in-waiting.

---

## Gated features (FUTURE bucket — have a plausible path back)

| Idea | Unlock condition (evidence, not vibes) | Earliest slot |
|---|---|---|
| **AI Tutor (full)** | "Explain this section" probe: adoption ≥30% WAU + retention lift + eval-clean for 4 weeks | post-V1.2 |
| **AI Quiz / Daily MCQ (full bank)** | MCQ wins G1 and its V1.1 metric | V1.2 |
| **Offline library** | Offline fake-door wins G1 (strongest signal of the three, given build cost) | V1.1/V1.2 |
| **Flashcards** | MCQ loop validated AND spaced-repetition demand appears in interviews | post-V1.2 |
| **Notes / Highlights** | ≥5 unprompted interview requests + observed workaround behavior (users copying text out) | any minor release |
| **Sync + accounts** | Local bookmarks ≥30% WAU AND two-device pain appears in interviews | V2.0 (accounts arrive with payments anyway) |
| **Study planner → statute progress-tracker** | Interviews reveal coverage-tracking pain specifically (not generic scheduling) | post-G2 |
| **News → amendment alerts** | Retention proven AND users ask "tell me when my acts change" | post-G2 |
| **Remaining acts ingestion (Transfer of Property, Specific Relief, state acts…)** | Search zero-result queries + interview demand name specific acts — **the pipeline is built; each act is now days, demand decides order** | any release, content-ops |
| **Case-law search** | PMF on statutes + advocate segment pull; needs its own corpus-economics plan | post-V2.0 |
| **Subscriptions** | Gate G2 criteria (success-metrics) | V2.0 |
| **Hindi / regional language layer** | Interviews from non-NLU tiers show English text as an adoption blocker (watch for this early — it may outrank every feature above) | re-prioritized the moment evidence appears |

## Removed features (REMOVE bucket — different startups or post-PMF luxuries)

| Idea | Why removed | What would reopen it |
|---|---|---|
| **Advocate Workspace** | Different customer, job, and sales motion — startup #2 | Organic advocate usage of the mapping shows up in analytics/interviews at meaningful volume |
| **AI Drafting** | Startup #3: professional tooling + liability; different buyer | Advocate segment validated first (above), then its own discovery cycle |
| **AI Courtroom Simulator / AI Moot Court / AI Judge** | Flagship demos built *from* a moat, not toward one; highest cost × highest wrongness-risk in the vision | PMF + revenue + a law-school pedagogy partner who co-designs it |
| **Virtual Internship** | Marketplace/credentialing product; needs institutional partnerships — startup #4 | Not on any current horizon |
| **Community** | Cold-start vs existing WhatsApp/Telegram; we borrow those instead | In-product social behavior emerges organically (e.g. users asking to share bookmark lists) |
| **Leaderboards / Achievements** | Gamification without a habit loop to gamify | A validated MCQ/streak loop, and even then skeptically |
| **Calendar** | Google Calendar exists; no statute-specific angle | Never as a calendar; maybe as exam-date-aware nudges post-planner evidence |
| **User-facing analytics** | Nothing meaningful to show at current usage volume | Downstream of MCQ/tracker validation |
| **PDF export** | Share links cover the observed job (send a section to a group) | Interview evidence of a print/annotate workflow that links can't serve |

## Vision continuity (how today's wedge becomes the OS)

The sequence, if every gate passes: **corpus + mapping** (trust) → **retention layer** (habit: MCQ or AI-explain) → **accounts + payments** (business) → **segment expansion** (advocates via the same corpus) → **workflow products** (research, drafting) → **flagships** (simulator/moot court, from a position of trust, distribution and revenue). Same destination as the original vision — the difference is that each step is paid for by evidence from the previous one instead of by hope.
