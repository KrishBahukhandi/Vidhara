import type { Metadata } from "next";
import Link from "next/link";

import { ContinueReading } from "@/components/continue-reading";
import { FakeDoor } from "@/components/fake-door";
import { LandingLookup } from "@/components/landing-lookup";
import { Reveal } from "@/components/reveal";
import { MAIN_CONTENT_ID } from "@/lib/nav";
import { SITE_URL } from "@/lib/site";
import {
  countPublishedMappings,
  countPublishedSections,
  listActs,
} from "@/features/acts/queries";

// The corpus grows; the homepage's claims about it must not be typed by hand.
// They were, and drifted badly — the page advertised 8 acts and 3,118 sections
// long after the library had reached 36 and 5,594, i.e. it undersold the
// product by more than four times on the number a visitor is most likely to
// judge it by. Read them instead, and let ISR keep them a hour fresh.
export const revalidate = 3600;

const STEPS = [
  {
    n: "1",
    title: "Type any section",
    body: "Old or new — “420 IPC”, “BNS 103”, even “u/s 154 CrPC”. However your notes wrote it.",
  },
  {
    n: "2",
    title: "Read the real text",
    body: "The full, official bare-act text — not a summary — in a reader built for actually reading.",
  },
  {
    n: "3",
    title: "See what changed",
    body: "The matching section in the other code sits right beside it, with a note on what moved.",
  },
];

const nf = new Intl.NumberFormat("en-IN");

// The homepage had no canonical of its own, so the root URL was left to be
// inferred — and this site is reachable at two origins (the Vercel one still
// serves links shared before the domain cutover).
export const metadata: Metadata = { alternates: { canonical: "/" } };

/**
 * The questions people actually type, answered on the page rather than only in
 * the product.
 *
 * Each one is a real query shape — "is bare act text official", "which BNS
 * section replaced IPC 420", "IPC to BNS converter free" — and each answer
 * links into the part of the site that answers it in full. That is the point:
 * a homepage that only advertises gives a reader nowhere to go and a crawler
 * nothing to follow.
 */
const FAQS = [
  {
    q: "Which BNS section replaced IPC Section 420?",
    a: (
      <>
        Cheating is now <strong className="font-semibold text-text">BNS Section 318</strong>. Every
        such pairing comes from the government&rsquo;s own concordance — open the{" "}
        <Link href="/mapping" className="font-medium text-brand hover:underline">
          IPC ⇄ BNS mapping
        </Link>{" "}
        for the whole table, or type a section into the box above to jump straight to it with both
        texts side by side.
      </>
    ),
  },
  {
    q: "Is the bare-act text here official?",
    a: (
      <>
        It is reproduced from the Gazette of India and India Code, with the source recorded on every
        act and shown at the foot of every section. It is a reference, not a certified copy — verify
        against the Gazette before you rely on it in court.{" "}
        <Link href="/verification" className="font-medium text-brand hover:underline">
          How we verify, and the mistakes we have fixed
        </Link>
        .
      </>
    ),
  },
  {
    q: "Does it cover CrPC → BNSS and the Evidence Act → BSA as well?",
    a: (
      <>
        Yes — all three transitions, in both directions, with a note on what changed. So do the
        other central acts in the{" "}
        <Link href="/acts" className="font-medium text-brand hover:underline">
          library
        </Link>
        : the Constitution, the Contract Act, the CPC, the NI Act, POCSO, the Hindu Marriage Act,
        the Limitation Act and more.
      </>
    ),
  },
  {
    q: "Is Vidhara free? Do I need an account?",
    a: (
      <>
        Free, and no sign-up to read anything. An account only remembers what you bookmark across
        devices.
      </>
    ),
  },
  {
    q: "Can I use it to prepare for judiciary exams?",
    a: (
      <>
        That is who it is built for. Read the sections, then test yourself on the{" "}
        <Link href="/daily" className="font-medium text-brand hover:underline">
          daily question
        </Link>{" "}
        or with{" "}
        <Link href="/practice" className="font-medium text-brand hover:underline">
          unlimited practice
        </Link>{" "}
        — every question is generated from the official mapping, never invented.
      </>
    ),
  },
];

/** The same five questions as data, for the search engines. Answers are the
 * plain-text version of what is rendered, because schema that does not match
 * the page is worse than none. */
const FAQ_TEXT = [
  "Cheating is now BNS Section 318. Every such pairing comes from the government's own concordance; the full IPC ⇄ BNS mapping is at /mapping, and typing a section number jumps straight to it with both texts side by side.",
  "It is reproduced from the Gazette of India and India Code, with the source recorded on every act and shown at the foot of every section. It is a reference, not a certified copy — verify against the Gazette before relying on it in court.",
  "Yes — all three transitions, in both directions, with a note on what changed. The library also carries the Constitution, the Contract Act, the CPC, the NI Act, POCSO, the Hindu Marriage Act, the Limitation Act and more.",
  "Free, and no sign-up to read anything. An account only remembers what you bookmark across devices.",
  "That is who it is built for. Read the sections, then test yourself on the daily question or with unlimited practice — every question is generated from the official mapping, never invented.",
];

function features(sectionCount: number, actCount: number) {
  return [
    {
      title: "The official mapping, free",
      body: "Every IPC⇄BNS, CrPC⇄BNSS and Evidence⇄BSA section pairing — from the government's own NCRB concordance, not guesswork.",
    },
    {
      title: "Bare acts, finally readable",
      body: `${nf.format(sectionCount)} sections across ${nf.format(actCount)} central acts, from the official Gazette — structured, searchable, and typeset for long study sessions.`,
    },
    {
      title: "Built for the transition",
      body: "Your textbook says IPC 420; your exam says BNS 318. Open either one and the other is right there, both texts in full.",
    },
  ];
}

export default async function HomePage() {
  const [sectionCount, mappingCount, acts] = await Promise.all([
    countPublishedSections(),
    countPublishedMappings(),
    listActs(),
  ]);

  const FEATURES = features(sectionCount, acts.length);

  const STATS = [
    { value: nf.format(sectionCount), label: "sections" },
    { value: nf.format(mappingCount), label: "official mappings" },
    { value: nf.format(acts.length), label: "central acts" },
    { value: "₹0", label: "no sign-up" },
  ];

  return (
    <main
      id={MAIN_CONTENT_ID}
      className="mx-auto flex w-full max-w-content flex-1 flex-col px-5 scroll-mt-20 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((faq, index) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: FAQ_TEXT[index] },
            })),
            isPartOf: { "@id": `${SITE_URL}/#website` },
          }),
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-6 pt-16 pb-12 sm:pt-24">
        <p
          className="animate-rise font-mono text-small text-accent"
          style={{ animationDelay: "0ms" }}>
          For law students, judiciary aspirants &amp; advocates
        </p>
        <h1
          className="animate-rise max-w-3xl font-serif text-[2rem] font-semibold leading-tight text-text sm:text-display"
          style={{ animationDelay: "60ms" }}>
          Two criminal codes. One place that speaks both.
        </h1>
        <p
          className="animate-rise max-w-xl text-body-lg text-text-muted"
          style={{ animationDelay: "120ms" }}>
          India rewrote its criminal law in 2024. Your books still say IPC, CrPC and Evidence Act;
          your exams and courts now say BNS, BNSS and BSA. Vidhara reads both — and shows you
          exactly how they line up.
        </p>

        <div className="animate-rise" style={{ animationDelay: "180ms" }}>
          <p className="mb-2 text-small font-medium text-text">Try it — type any section:</p>
          <LandingLookup />
        </div>

        <div
          className="animate-rise flex flex-wrap items-center gap-3"
          style={{ animationDelay: "240ms" }}>
          <Link
            href="/acts"
            className="lift inline-flex h-11 items-center rounded-md border border-border bg-surface px-5 font-medium text-text hover:border-brand">
            Browse the bare acts
          </Link>
          <Link
            href="/mapping"
            className="lift inline-flex h-11 items-center rounded-md border border-border bg-surface px-5 font-medium text-text hover:border-brand">
            See the IPC ⇄ BNS mapping
          </Link>
        </div>

        {/* The corpus is small next to the big bare-act apps; what it has is a
            traceable chain to the government PDF. Said once, in plain terms,
            with the evidence a click away. */}
        <p className="animate-rise text-small text-text-muted" style={{ animationDelay: "300ms" }}>
          Every provision traced to the government&rsquo;s own PDF — and we publish the mistakes
          we&rsquo;ve found and fixed.{" "}
          <Link href="/verification" className="font-medium text-brand hover:underline">
            How we verify
          </Link>
        </p>
      </section>

      <ContinueReading />

      {/* ── The problem, made concrete ───────────────────────── */}
      <Reveal as="section" className="border-t border-border py-14 sm:py-20">
        <p className="font-mono text-small text-accent">The problem</p>
        <h2 className="mt-3 max-w-2xl font-serif text-h1 font-semibold text-text">
          One section, two names — and everyone&rsquo;s mid-switch.
        </h2>
        <p className="mt-4 max-w-measure text-body text-text-muted">
          Cheating was IPC Section 420 for 160 years. Since 1 July 2024 it&rsquo;s BNS Section 318. Multiply that
          by thousands of sections and you get every law student&rsquo;s daily friction. Vidhara turns
          that lookup into a single tap.
        </p>

        {/* Visual: the transformation */}
        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1 rounded-md border border-border bg-surface p-5">
            <p className="font-mono text-micro uppercase tracking-wide text-text-faint">Old law</p>
            <p className="mt-1 font-mono text-h2 font-bold text-text">IPC 420</p>
            <p className="mt-1 text-small text-text-muted">Cheating and dishonestly inducing…</p>
          </div>
          <div className="flex shrink-0 items-center justify-center text-h2 text-brand" aria-hidden>
            {/* points down when the cards stack (mobile), right when side-by-side */}
            <span className="sm:hidden">↓</span>
            <span className="hidden sm:inline">→</span>
          </div>
          <div className="flex-1 rounded-md border border-brand bg-surface p-5">
            <p className="font-mono text-micro uppercase tracking-wide text-text-faint">New law</p>
            <p className="mt-1 font-mono text-h2 font-bold text-brand">BNS 318</p>
            <p className="mt-1 text-small text-text-muted">Cheating — consolidated &amp; updated</p>
          </div>
        </div>
      </Reveal>

      {/* ── How it works ─────────────────────────────────────── */}
      <Reveal as="section" className="border-t border-border py-14 sm:py-20">
        <h2 className="font-serif text-h1 font-semibold text-text">How it works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 90} className="flex flex-col gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-mono text-body font-bold text-on-brand">
                {step.n}
              </span>
              <h3 className="text-h3 font-semibold text-text">{step.title}</h3>
              <p className="text-body text-text-muted">{step.body}</p>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* ── What you get ─────────────────────────────────────── */}
      <Reveal as="section" className="border-t border-border py-14 sm:py-20">
        <h2 className="font-serif text-h1 font-semibold text-text">What you get</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal
              key={feature.title}
              delay={i * 90}
              className="lift flex flex-col gap-3 rounded-lg border border-border bg-surface p-6 hover:border-brand">
              <h3 className="text-h3 font-semibold text-text">{feature.title}</h3>
              <p className="text-body text-text-muted">{feature.body}</p>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* ── Credibility numbers ──────────────────────────────── */}
      <Reveal as="section" className="border-t border-border py-14 sm:py-20">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 70} className="flex flex-col gap-1">
              <span className="font-mono text-display font-bold text-brand">{stat.value}</span>
              <span className="text-small text-text-muted">{stat.label}</span>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 max-w-measure text-small text-text-faint">
          Every text is reproduced from official Government of India sources — the Gazette of India
          and India Code — with provenance recorded on each act.
        </p>
      </Reveal>

      {/* ── Daily MCQ fake door ──────────────────────────────── */}
      {/* ── Quiz (shipped) ───────────────────────────────────── */}
      <Reveal as="section" className="border-t border-border py-14 sm:py-20">
        <div className="max-w-xl">
          <h2 className="font-serif text-h2 font-semibold text-text">
            Test yourself, not just your notes
          </h2>
          <p className="mt-2 text-body text-text-muted">
            Every question is built from the official mapping — never invented. One a day to build
            the habit, or unlimited practice when you&rsquo;re revising.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/daily"
              className="lift inline-flex h-11 items-center rounded-md bg-brand px-5 font-medium text-on-brand transition-opacity hover:opacity-90">
              Today&rsquo;s question →
            </Link>
            <Link
              href="/practice"
              className="lift inline-flex h-11 items-center rounded-md border border-border px-5 font-medium text-text transition-colors hover:border-brand">
              Unlimited practice
            </Link>
          </div>
        </div>
      </Reveal>

      {/* ── Demand test for the next bet (D-010) ─────────────── */}
      <Reveal as="section" className="border-t border-border py-14 sm:py-20">
        <div className="max-w-xl">
          <h2 className="font-serif text-h2 font-semibold text-text">Coming next — you decide</h2>
          <p className="mt-2 mb-4 text-body text-text-muted">
            We build what students actually reach for. Tell us if this is it:
          </p>
          <FakeDoor
            feature="notes"
            title="Notes & highlights"
            description="Highlight a passage and keep your own notes against any section"
          />
        </div>
      </Reveal>

      {/* ── Questions people arrive with ─────────────────────── */}
      <Reveal as="section" className="border-t border-border py-14 sm:py-20">
        <h2 className="font-serif text-h1 font-semibold text-text">Common questions</h2>
        <dl className="mt-8 max-w-measure space-y-6">
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <dt className="text-h3 font-semibold text-text">{faq.q}</dt>
              <dd className="mt-2 text-body text-text-muted">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <Reveal as="section" className="border-t border-border py-16 text-center sm:py-24">
        <h2 className="mx-auto max-w-2xl font-serif text-h1 font-semibold text-text">
          Start with a section you&rsquo;re studying right now.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-body text-text-muted">
          No account, no paywall. Type a number, read the law.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/acts"
            className="lift inline-flex h-12 items-center rounded-md bg-brand px-8 font-medium text-on-brand hover:opacity-90">
            Open the library
          </Link>
        </div>
      </Reveal>
    </main>
  );
}
