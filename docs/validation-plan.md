# NexLex — Validation Plan

> **Status**: Living document. · **Last updated**: 2026-07-16
> The assumptions the company dies on, ranked by (risk × cheapness-to-test), each mapped to a concrete experiment with a pass/fail line written *before* the data exists.

---

## Assumptions, ranked

| # | Assumption | If wrong… | Tested by | Status |
|---|---|---|---|---|
| A-1 | Students/judiciary aspirants actively struggle with old⇄new section cross-referencing and will use a dedicated tool for it | The wedge is wrong; pivot | E-1, E-2, E-3 | **UNTESTED — the company-killer** |
| A-2 | They return weekly while studying (it's a tool, not a one-time lookup) | No retention → no product, only a utility page | E-3, E-6 | Untested |
| A-3 | Web reaches this audience despite mobile-first habits (until Play unlocks) | Learning stalls until Android ships | E-1, E-2 | Untested |
| A-4 | Clean, provenance-tracked text beats free PDFs/Indian Kanoon enough to switch | Corpus quality isn't a moat, just a cost | E-3 interviews | Untested |
| A-5 | Comprehension (not just access) is a top pain → AI explainer is wanted | V1.1 candidate A dies | E-5 fake door + interviews | Untested |
| A-6 | A section-grounded LLM can be accurate enough for exam-takers | AI layer unshippable at acceptable risk | E-7 eval set | Untested |
| A-7 | Some segment pays for a layer above the free corpus | No business; stays a public good | E-8 | Untested (deliberately last) |

## Experiments

**E-1 — Deploy and watch (V0.1).** 5 friendlies, scripted task ("find IPC 420's new section, read both"), think-aloud on a call. *Pass:* 5/5 complete unaided; at least 3 say a variant of "I'd use this during prep." *Fail action:* fix comprehension blockers before spending any recruitment capital.

**E-2 — Message test (V0.2).** Landing rebuilt around the mapping lookup; warm traffic from group chats. *Metric:* landing→lookup ≥40%, lookup→read ≥60%. *Fail action:* reframe (candidate alt-messages: "bare acts, readable, free" / "new-codes-ready study tool") and retest within the week — message iteration is free compared to feature iteration.

**E-3 — Beta cohort (V0.5, the big one).** 30–50 recruited users, 3-week window, weekly PostHog cohort review + ≥15 interviews. *Pass lines are in release-plan §V0.5 Go/No-Go.* This is where A-1/A-2/A-4 get their first real verdicts.

**E-4 — Continuous interviews.** 3–5/week from V0.5 onward, mom-test protocol ([user-feedback-plan.md](user-feedback-plan.md)). Interviews rank *problems*, analytics rank *behaviors*; G1 requires both to agree before money is spent.

**E-5 — Fake doors (V0.5–V1.0, D-010: honest "coming soon — tap to vote" copy).** Three doors: AI-explain (reader), Daily MCQ (home), Offline (Android). *Read:* relative CTR with ≥30 unique voters, cross-checked against interview pull at G1. Fake doors measure *curiosity*; interviews confirm *need*; neither alone picks V1.1.

**E-6 — SEO organic pull (V1.0+).** 3,118 indexed section pages + sitemap already built. *Metric:* Search Console impressions/clicks trend for "IPC 420 BNS", "BNS 103", etc. Validates durable demand independent of our pushing — the strongest A-1 evidence there is.

**E-7 — AI accuracy eval (pre-V1.1, only if candidate A wins).** 50 hand-checked Q/A pairs from the corpus *before* any UI work. *Pass:* ~0 factual errors on evals, <5% hallucination-style failures, every answer cites and displays the underlying section. *Fail action:* candidate B ships instead; no negotiation — this line exists because it will be tempting to bend.

**E-8 — Willingness-to-pay (pre-V2.0, G2-gated).** 10 pricing interviews (Van Westendorp-style bands) + a "support NexLex / early-supporter" soft CTA. Only after 4 weeks of stable WRR. Charging earlier just measures churn speed.

## Learning goals per release (what each release must TEACH, not ship)

- **V0.1:** Can a stranger operate it? Does anything embarrass us on a real phone browser?
- **V0.2:** Does the wedge message convert? Do people share it unprompted?
- **V0.5:** Do they come back (D7)? What do they reach for that isn't there? What do they say when asked to describe it to a friend (positioning in their words)?
- **V1.0:** Does cold traffic behave like the warm cohort? Does SEO pull exist? What breaks at 10× volume?
- **V1.1:** Does the chosen bet move retention for adopters, not just get clicked?
- **V2.0:** Will anyone pay, at what price, and do payers retain better?

## Pivot candidates (pre-registered at G1, so a bad result has a next move ready)

Triggered only by release-plan §V1.0 NO-GO (public D7 <5% AND no interview pull):

1. **MCQ-first:** daily new-codes MCQ as the front door; the corpus becomes the answer-explanation layer. (Same moat, habit-first packaging.)
2. **Advocate-first:** dual-regime practitioners (offence date decides IPC vs BNS) may have sharper pain than students; the mapping is the same asset. Test with 10 advocate interviews before any build.
3. **B2B2C:** coaching institutes/law colleges as channel — license the corpus + mapping into their LMS. Changes the sales motion, not the product.

A pivot review consumes 2 weeks max: interviews + one landing test per candidate. No code until one wins.

## What we are explicitly NOT validating yet

Advocate workflows, drafting, simulators, community dynamics, pricing elasticity beyond E-8 — no experiments exist for these because no near-term decision depends on them ([feature-priority.md](feature-priority.md) REMOVE bucket).
