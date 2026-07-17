# NexLex — User Feedback Plan

> **Status**: Living document. · **Last updated**: 2026-07-16
> How users are recruited, interviewed, and synthesized into decisions. Interviews are the founder's primary job from V0.5 through G1 — code is the side job in that window. Protocol is Mom-Test throughout: past behavior, not opinions about the future; their words, not our pitch.

---

## Channels (in recruitment order)

1. **Personal network** (V0.1–V0.2): law-student friends + their classmates. Fastest, warmest, most biased — fine for usability, useless for demand. Label accordingly.
2. **Judiciary-prep Telegram groups** (V0.5): several large exam-prep groups exist (search "judiciary exam", "PCS-J", state-specific groups). Etiquette: ask admins first, offer the tool free, never spam. One good admin relationship > 10 drive-by posts.
3. **Law-college WhatsApp groups** (V0.5): via network's juniors; target 2–3 colleges (mix NLU + non-NLU tiers — pain and alternatives differ by tier).
4. **LinkedIn** (V0.5–V1.0): founder posts build-in-public style + law-student groups.
5. **Campus ambassadors** (V1.0, only if 1–2 enthusiastic beta users emerge organically): a motivated senior sharing before exam season beats any ad spend. Keep informal — no "program" to run.
6. **Feedback widget + beta WhatsApp group** (always on): the widget catches drive-by signal; the group is the research panel.

## Recruitment scripts (short, honest, no marketing voice)

**Telegram/WhatsApp (beta):**
> Built a free tool for the IPC→BNS transition problem — type any old section (e.g. 420 IPC) and instantly get the new section with both full texts, all 8 major acts included, based on the official government mapping tables. Looking for 30 students/aspirants to use it during actual prep for 3 weeks and tell me what's broken or missing: {link}?c=beta-1 — no signup, free.

**Interview ask (to active beta users):**
> Saw you've been using NexLex — could I get 20 minutes on a call this week to watch how you actually study with it? I'm deciding what to build next and your usage would decide it. (Happy to send ₹200 UPI for your time.)

Incentives: early access + named thanks by default; ₹200 UPI for 30-min calls with strangers post-V1.0. Never pay for beta cohort participation itself (paid users fake retention).

## Interview guide (30 min, semi-structured — Mom-Test rules)

**Rules:** past behavior only; no pitching until the last 5 minutes; "would you…" questions are banned; silence is a tool; record with consent, else notes.

1. **Context (5m):** What are you preparing for / studying? Which exam, when? What did you study *yesterday*? (Anchor everything to concrete recent behavior.)
2. **The problem, unprompted (10m):** Walk me through the last time you needed to check a specific section's text. What did you do, step by step? What about the last time old-vs-new codes confused you or cost marks/time? What do you use today — bare-act book, PDFs, Indian Kanoon, coaching modules? What do you *pay* for today (books, coaching, apps)?
3. **Product observation (10m, screenshare/in person):** "Do the thing you'd normally do with it — think aloud." Watch: entry path, dead ends, what they *try* that doesn't exist (this is the V1.1 signal — write every attempted action down verbatim).
4. **Positioning + wrap (5m):** How would you describe this to a classmate? (Their words become our copy.) What would make you come back tomorrow? If this disappeared next week, what would you do? Anyone else I should talk to? (Snowball every interview.)

**Segment-specific probes:** judiciary aspirants — mains answer-writing workflow, where section citations come from under time pressure. LLB students — internal exams vs university exams, whether professors have switched to new codes yet.

## Cadence & synthesis

- **Cadence:** 3–5 interviews/week from V0.5 through G1; ≥15 by V0.5 end, ≥20 cumulative by G1. Booked in advance (checklist item — scheduling slips otherwise).
- **Notes:** one markdown file per interview in `docs/interviews/` (gitignored if any personal data; template: context / verbatim quotes / attempted-actions / pains ranked / follow-up permission).
- **Weekly synthesis (Friday, 30 min):** update a single running table in `docs/interviews/themes.md`: theme × mention-count × strength (unprompted > probed) × representative quote. A theme needs **≥5 unprompted mentions** before it can justify code (feature-priority NICE unlock rule).
- **At G1:** themes table + fake-door CTRs + retention diagnosis go into one decision memo (decision-log). Where analytics and interviews disagree, interviews win on *what the problem is*, analytics win on *whether behavior actually changed*.

## What feedback does NOT do

- Feature requests are inputs to problem-ranking, not a queue. "Add notes" is recorded as "wants to retain something at read-time — investigate," not as a ticket.
- The beta WhatsApp group's loudest voice is one datapoint. The Monday numbers keep the vibes honest; the interviews keep the numbers explained.
- No surveys before V1.0 (n too small to beat 5 conversations; surveys measure the questionnaire, interviews discover the question).
