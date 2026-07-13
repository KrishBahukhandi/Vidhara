# NexLex — Product Requirements Document (PRD)

> **Status**: Living document · **Version**: 0.2.0 · **Last updated**: 2026-07-13
> **Owner**: Product (NexLex core team)
> Update this document whenever features, scope, users, or strategy change.

---

## 1. Vision

To become **the operating system for legal learning and legal work in India** — the single platform where a first-year law student, a judiciary aspirant, and a practicing advocate all find the tools, content, and AI assistance they need daily.

## 2. Mission

Make Indian law **understandable, searchable, practicable, and practicable-at-scale** by combining authoritative legal content (bare acts, case law, the new criminal law transition) with AI systems purpose-built for Indian legal reasoning — tutoring, drafting, and courtroom simulation.

## 3. The Moment (Why Now)

1. **The new criminal laws** (BNS 2023, BNSS 2023, BSA 2023 — in force since 1 July 2024) replaced the IPC 1860, CrPC 1973, and Indian Evidence Act 1872. Every student, aspirant, judge, police officer, and advocate in India must now work bilingually between old and new codes. **No product owns this mapping experience.**
2. **AI is finally good enough** for Socratic legal tutoring, structured drafting, and adversarial simulation — but existing Indian legal AI products target enterprise research budgets, not students.
3. **Legal education in India is exam-driven and underserved** — judiciary coaching is expensive, offline, and non-interactive.

## 4. Target Users

| Segment | Size (approx.) | Primary need |
|---|---|---|
| Law students (3yr/5yr LLB) | ~1.5M enrolled | Understand subjects, pass semester exams, moot prep |
| Judiciary aspirants (PCS-J etc.) | ~500K+ active | Bare act mastery, old⇄new law mapping, answer writing, mains/prelims prep |
| CLAT PG / AIBE candidates | ~100K+/yr | Structured revision, MCQ practice |
| Young advocates (0–5 yrs practice) | ~500K | Drafting, quick section lookup, case law search |
| Legal professionals / in-house | smaller, higher ARPU | Drafting assistant, research, news |

## 5. Personas

### P1 — "Ananya", 2nd-year BA LLB student (Tier-2 city NLU aspirant-turned-student)
- 20, studies on her phone, patchy internet, price-sensitive (₹0–₹300/month budget).
- Problems: dense bare act language, no one to ask "why", confused by IPC vs BNS in different textbooks.
- Needs: plain-language explanations, section-by-section mapping, bookmarks, offline reading.

### P2 — "Rohit", 26, judiciary aspirant (3rd attempt, self-study)
- Full-time preparation, 8–10 hrs/day, needs structure and accountability.
- Problems: coaching costs ₹1.5–2L; revision of 20+ acts; mains answer writing feedback is unavailable; new criminal laws doubled his syllabus anxiety.
- Needs: progress tracking, spaced revision, AI answer evaluation, authoritative old⇄new mapping, mock oral/viva practice (trial simulator).

### P3 — "Adv. Meera", 29, independent advocate, district court practice
- Time-poor, drafts bail applications/notices/plaints weekly, bills clients modestly.
- Problems: drafting from stale templates, quick lookup of BNSS procedure mid-hearing, keeping up with judgments.
- Needs: drafting assistant with Indian formats, instant section search (works offline in court basements), curated legal news.

### P4 — "Prof. Iyer", 45, law faculty (secondary persona)
- Needs: reliable teaching aids, classroom moot/trial simulation, verified mapping tables.

## 6. User Problems (ranked)

1. Bare acts are hard to read, search, and cross-reference; official sources (India Code) have poor UX.
2. The IPC⇄BNS / CrPC⇄BNSS / IEA⇄BSA transition has no trustworthy, instant, bidirectional lookup.
3. No affordable, interactive way to *practice* law — argumentation, examination, procedure — before real stakes.
4. Judiciary/exam prep lacks personalized feedback loops (answer evaluation, weak-topic detection).
5. Legal drafting knowledge is gatekept in seniors' offices and stale template books.
6. Case law search tools are either free-but-crude or enterprise-priced.
7. Study material is scattered: notes in one app, bare acts in another, news in a third.

## 7. Product Goals

- **G1**: Be the fastest, most pleasant way to read and search Indian bare acts (< 300 ms perceived search).
- **G2**: Own the "old law ⇄ new law" mapping category — the canonical free utility.
- **G3**: Ship AI features that are *pedagogically honest*: cite sections, admit uncertainty, never hallucinate case names.
- **G4**: Build daily-habit mechanics (streaks, progress, revision queues) that make NexLex the first app opened each study day.
- **G5**: Reach sustainable unit economics via a freemium model priced for Indian students.

## 8. Non-Goals (current cycle)

- ❌ Enterprise legal research (competing with SCC Online / Manupatra head-on).
- ❌ Lawyer–client marketplace or legal advice to laypersons (regulatory risk; BCI advertising rules).
- ❌ Multi-country / non-Indian law.
- ❌ iOS app in MVP (Android-first launch; iOS later from the same React Native codebase). The web surface at MVP is marketing + SEO content pages, not the full app.
- ❌ User-generated content marketplace (notes selling etc.) — future consideration only.
- ❌ Providing "legal advice" — NexLex is an education and productivity tool; disclaimers throughout.

## 9. Feature Inventory

### 9.1 Content Core
| Feature | Description | Tier |
|---|---|---|
| Bare Acts Library | Structured, searchable, hierarchical (Act → Part → Chapter → Section) reader for central acts | Free |
| New Criminal Law Mapping | Bidirectional IPC⇄BNS, CrPC⇄BNSS, IEA⇄BSA lookup with change annotations (renumbered / modified / new / omitted) | Free (core), premium annotations |
| Case Law Search | Search + read judgments (metadata + text), citator basics | Freemium |
| Legal News | Curated daily legal news digest, tagged by area of law | Freemium |

### 9.2 Study Tools
| Feature | Description | Tier |
|---|---|---|
| Bookmarks | Bookmark any section/case/article with folders | Free (limits) |
| Notes | Rich-text notes linked to sections/cases; standalone notebooks | Free (limits) |
| Progress Tracking | Reading progress per act, streaks, revision queue (spaced repetition) | Freemium |
| Offline Support | Downloaded acts + notes available offline (on-device SQLite in the Android app) | Premium |

### 9.3 AI Suite
| Feature | Description | Tier |
|---|---|---|
| AI Legal Tutor | Socratic chat tutor grounded in bare-act context; explains, quizzes, evaluates answers | Freemium (daily quota) |
| AI Courtroom Trial Simulator | Role-play full trial stages (framing of charges, examination-in-chief, cross, arguments, judgment) with AI judge/opposing counsel; scoring + feedback | Premium (flagship) |
| AI Drafting Assistant | Guided generation of Indian legal drafts (bail application, legal notice, plaint, written statement, agreements) with clause explanations | Premium |

### 9.4 Platform
| Feature | Description | Tier |
|---|---|---|
| User Profiles | Role (student/aspirant/advocate), interests, exam targets | Free |
| Premium / Subscriptions | Razorpay-powered subscription management | — |
| Analytics | Product analytics (privacy-respecting) + user-facing study analytics | — |
| Admin Dashboard | Content management (acts, mappings, news), user management, AI usage monitoring | Internal |

## 10. MVP Scope (Phases 0–3; see phases.md)

**In**: **Android app on the Play Store** with auth + profiles, Bare Acts Library (priority acts: BNS, BNSS, BSA, IPC, CrPC, IEA, Constitution, Contract Act, plus ~10 exam-priority acts), full-text search, New Criminal Law Mapping (all three pairs), bookmarks, notes, AI Legal Tutor v1 (grounded chat with daily free quota); **web** ships in parallel as marketing site + SEO read-only act/mapping pages on the same backend.

**Out (post-MVP)**: Trial Simulator, Drafting Assistant, Case Law Search, News, offline downloads, payments, admin dashboard v2, iOS app, full interactive web app.

**MVP success bar**: A judiciary aspirant can, in one session — look up BNS §103, see it maps from IPC §302 with a change note, read the full section, bookmark it, ask the AI tutor "distinguish murder from culpable homicide with section citations", and save the explanation to notes.

## 11. Future Scope

- iOS app from the same Expo/React Native codebase; full interactive web app (same monorepo).
- Hindi + regional language UI and content layer.
- MCQ/test-series engine with All-India ranks.
- Moot court mode (appellate simulation) for law school competitions.
- State amendments layer on bare acts.
- Judgment summarization + headnote generation.
- Institutional (college/coaching) licensing.
- Community: study groups, shared notebooks.

## 12. User Stories & Acceptance Criteria (MVP)

### Epic A — Bare Acts
- **A1**: As a student, I can browse a list of acts grouped by category so I can find any act in ≤ 2 taps.
  - AC: acts list loads < 1 s cached; grouped by category; searchable by name/abbreviation/year.
- **A2**: As a student, I can read an act section-by-section with its hierarchy visible.
  - AC: section view shows chapter context, marginal note (title), full text, illustrations/explanations distinctly styled; prev/next navigation; deep-linkable URL per section.
- **A3**: As an aspirant, I can search across all acts and within one act.
  - AC: results ranked (exact section number match first, then title, then body); highlights matched terms; "§302 IPC"-style queries resolve directly.

### Epic B — Law Mapping
- **B1**: As an aspirant, I can enter any IPC/CrPC/IEA section and instantly see its BNS/BNSS/BSA counterpart(s), and vice versa.
  - AC: bidirectional; handles 1→many and many→1 mappings; shows change type (unchanged / renumbered / modified / new / omitted) and a short change note; both full texts viewable side-by-side.
- **B2**: As a student, when reading any mapped section in the reader, I see an inline mapping chip linking to the counterpart.

### Epic C — Bookmarks & Notes
- **C1**: Bookmark any section from the reader; organize into folders; free tier capped (e.g., 50), premium unlimited.
- **C2**: Attach a note to any section; notes support rich text; notes list is searchable and filterable by act/tag.

### Epic D — AI Legal Tutor
- **D1**: As a student, I can ask legal-concept questions and get explanations that cite specific sections which link into the library.
  - AC: responses stream; every substantive legal claim cites act + section; cited sections are validated against the DB before display (invalid citations flagged); refuses personal legal advice with a helpful redirect.
- **D2**: As an aspirant, I can paste my mains answer and receive structured evaluation (issue-spotting, structure, citation accuracy, suggested score band).
- **D3**: Free users get a daily message quota; usage is metered and displayed.

### Epic E — Accounts
- **E1**: Sign up/in with email OTP or Google; select role + exam targets during onboarding; profile editable.
- **E2**: All my data (bookmarks, notes, chats) syncs across devices.

## 13. Functional Requirements (summary)

- FR-1: Content pipeline to ingest, version, and publish bare acts (source: India Code / official gazette texts) with human review.
- FR-2: Mapping dataset stored as first-class relational data with provenance and review status — never AI-generated-then-unverified.
- FR-3: AI responses must pass an output-validation layer (citation checker, safety filter) before rendering.
- FR-4: All user-generated data behind row-level security; content data public-read.
- FR-5: Every AI interaction logged (prompt version, tokens, latency, model) for evaluation and cost control.
- FR-6: Rate limiting on all API routes; stricter on AI routes.
- FR-7: Feature flags for gradual rollout of AI features.

## 14. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | App cold start < 2 s on mid-range Android; AAB download ≤ 40 MB; search < 300 ms server time; web SEO pages P75 LCP < 2.5 s |
| Availability | 99.5% monthly (MVP); graceful degradation when AI provider is down |
| Scalability | Architecture supports 100K MAU without redesign (see architecture.md) |
| Security | OWASP ASVS L1 minimum; RLS on all user tables; secrets never client-side |
| Privacy | DPDP Act 2023 compliant: consent, purpose limitation, data export & deletion |
| Accessibility | WCAG 2.1 AA for reader and core flows |
| Localization-ready | All UI strings externalized from day one (Hindi planned) |
| Cost | AI gross margin ≥ 60% on premium tier; per-user AI cost caps enforced |

## 15. Monetization Strategy

**Freemium subscription** (India-priced):

| Tier | Price (indicative) | Includes |
|---|---|---|
| Free | ₹0 | Full bare acts + mapping, limited bookmarks/notes, AI tutor 10 msgs/day |
| NexLex Plus | ~₹149/mo or ₹999/yr | Unlimited bookmarks/notes, offline downloads, AI tutor 100 msgs/day, answer evaluation |
| NexLex Pro | ~₹399/mo or ₹2,999/yr | Everything + Trial Simulator, Drafting Assistant, priority models |

- Payments via **Razorpay** (UPI-first). Student verification discounts later.
- Keep the mapping utility free forever — it is the acquisition engine and SEO moat.
- Future: institutional licenses, sponsored placements in news (clearly labeled).

## 16. Competitive Analysis

| Competitor | Strength | Gap NexLex exploits |
|---|---|---|
| Indian Kanoon | Free case law, SEO dominance | Dated UX, no learning layer, no AI tutoring |
| SCC Online / Manupatra | Authoritative research | ₹₹₹ enterprise pricing; not for students |
| EBC Reader / bare-act apps | Print-brand trust | Static PDFs, no mapping UX, no AI |
| Testbook / PW / coaching apps | Exam-prep scale | Generic ed-tech; weak primary-source integration |
| LawBhoomi / blogs | Free notes SEO | Unstructured; no tooling |
| Lexlegis.AI / CaseMine | Legal AI research | Practitioner-priced; no pedagogy, no simulation |

**Positioning**: "The serious student's legal platform" — primary sources + AI practice, priced for India.

## 17. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI hallucination of sections/cases | High | High (trust-fatal) | Grounded generation (RAG over our DB), citation validator, visible confidence, feedback flags |
| Content accuracy (acts/mappings) | Medium | High | Official sources only, versioned ingestion, human review queue, errata process |
| "Legal advice" regulatory exposure | Medium | High | Education-only framing, disclaimers, refusal patterns in guardrails, no lawyer-client features |
| AI cost blowout | Medium | Medium | Quotas, model tiering (small models for cheap tasks), caching, per-user caps |
| Copyright (case law/news sources) | Medium | Medium | Bare acts are public domain (s.52(1)(q) Copyright Act); judgments public; news = summaries + links, no scraping walled content |
| Low willingness-to-pay | Medium | Medium | UPI micro-pricing, annual discounts, free tier generous on content but gated on AI |
| Solo-dev bus factor / scope creep | High | Medium | phases.md discipline, ruthless MVP, docs-as-memory |
| Supabase/vendor lock-in | Low | Medium | Repository pattern around data access; standard Postgres; exportable |

## 18. Success Metrics

**North star**: Weekly Active Learners (users with ≥ 3 meaningful actions/week).

| Metric | MVP target (T+3 mo post-launch) |
|---|---|
| Signups | 10,000 |
| WAU/MAU | ≥ 35% |
| D7 retention | ≥ 25% |
| Mapping lookups/day | 5,000 |
| AI tutor CSAT (👍 rate) | ≥ 80% |
| Citation validity rate | ≥ 99% |
| Free→paid conversion | ≥ 2% |
| Play Store rating | ≥ 4.3 ★ |
| App cold start (P75) | < 2 s |

## 19. Technical Constraints

- Solo/small-team development velocity → boring, well-documented technology; minimal service count; **one language (TypeScript) across app, web, and server** (monorepo, ADR-9).
- **Android-first**: primary product is a native Android app (Expo/React Native, Play Store); low-end devices + intermittent connectivity dominate → on-device SQLite offline, small AAB, aggressive caching.
- Web (same monorepo) serves marketing + SEO content pages at MVP; full web app later.
- AI provider: Anthropic Claude family (primary); abstraction layer to allow fallback models.
- Budget: near-zero fixed infra until revenue (Supabase free/pro tier, Vercel hobby/pro, EAS free tier initially).
- Play Store constraints: review cycles gate native releases (EAS Update for JS-only fixes); new personal developer accounts need a 12-tester × 14-day closed test before production — built into Phase 3 runway.
- Content ingestion is manual-first (scripts + review), automated later.

## 20. Product Roadmap (summary — detail in phases.md)

1. **Phase 0** — Foundation: docs, monorepo scaffold (Android app + web), design system, auth, CI/EAS. *(current)*
2. **Phase 1** — Content Core: Bare Acts Library + search + Law Mapping (app) + SEO content pages (web).
3. **Phase 2** — Study Layer: bookmarks, notes, profiles/onboarding, progress v1.
4. **Phase 3** — AI Tutor v1 → **Play Store production launch**.
5. **Phase 4** — Case Law Search + Legal News.
6. **Phase 5** — Monetization: payments, premium gating, offline downloads.
7. **Phase 6** — AI Drafting Assistant.
8. **Phase 7** — AI Courtroom Trial Simulator (flagship).
9. **Phase 8** — Admin dashboard v2, analytics depth, hardening, iOS groundwork.

---

*Change log*
- 2026-07-13 · v0.2.0 · **Android-first pivot** (founder directive): MVP launch surface = native Android app (Expo/React Native) on Play Store; web = marketing + SEO content pages in same monorepo; iOS moved to future scope; NFRs and metrics updated for app targets.
- 2026-07-13 · v0.1.0 · Initial PRD created (pre-implementation).
