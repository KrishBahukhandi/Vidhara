import Link from "next/link";

import { ContinueReading } from "@/components/continue-reading";
import { FakeDoor } from "@/components/fake-door";
import { LandingLookup } from "@/components/landing-lookup";
import { Reveal } from "@/components/reveal";

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

const FEATURES = [
  {
    title: "The official mapping, free",
    body: "Every IPC⇄BNS, CrPC⇄BNSS and Evidence⇄BSA section pairing — from the government's own NCRB concordance, not guesswork.",
  },
  {
    title: "Bare acts, finally readable",
    body: "3,000+ sections across 8 major acts, from the official Gazette — structured, searchable, and typeset for long study sessions.",
  },
  {
    title: "Built for the transition",
    body: "Your textbook says IPC 420; your exam says BNS 318. Open either one and the other is right there, both texts in full.",
  },
];

const STATS = [
  { value: "3,118", label: "sections" },
  { value: "1,271", label: "official mappings" },
  { value: "8", label: "major acts" },
  { value: "₹0", label: "no sign-up" },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-content flex-1 flex-col px-5 sm:px-6">
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
      </section>

      <ContinueReading />

      {/* ── The problem, made concrete ───────────────────────── */}
      <Reveal as="section" className="border-t border-border py-14 sm:py-20">
        <p className="font-mono text-small text-accent">The problem</p>
        <h2 className="mt-3 max-w-2xl font-serif text-h1 font-semibold text-text">
          One section, two names — and everyone&rsquo;s mid-switch.
        </h2>
        <p className="mt-4 max-w-measure text-body text-text-muted">
          Cheating was IPC §420 for 160 years. Since 1 July 2024 it&rsquo;s BNS §318. Multiply that
          by 3,000+ sections and you get every law student&rsquo;s daily friction. Vidhara turns
          that lookup into a single tap.
        </p>

        {/* Visual: the transformation */}
        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1 rounded-md border border-border bg-surface p-5">
            <p className="font-mono text-micro uppercase tracking-wide text-text-faint">Old law</p>
            <p className="mt-1 font-mono text-h2 font-bold text-text">IPC §420</p>
            <p className="mt-1 text-small text-text-muted">Cheating and dishonestly inducing…</p>
          </div>
          <div className="flex shrink-0 items-center justify-center text-h2 text-brand" aria-hidden>
            {/* points down when the cards stack (mobile), right when side-by-side */}
            <span className="sm:hidden">↓</span>
            <span className="hidden sm:inline">→</span>
          </div>
          <div className="flex-1 rounded-md border border-brand bg-surface p-5">
            <p className="font-mono text-micro uppercase tracking-wide text-text-faint">New law</p>
            <p className="mt-1 font-mono text-h2 font-bold text-brand">BNS §318</p>
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
      <Reveal as="section" className="border-t border-border py-14 sm:py-20">
        <div className="max-w-xl">
          <h2 className="font-serif text-h2 font-semibold text-text">Coming next — you decide</h2>
          <p className="mt-2 mb-4 text-body text-text-muted">
            We build what students actually reach for. Tell us if this is it:
          </p>
          <FakeDoor
            feature="daily_mcq"
            title="Daily MCQ"
            description="One exam-style question a day, from the bare acts, with the section explained"
          />
        </div>
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
