const FEATURES = [
  {
    title: "Bare Acts, readable at last",
    body: "BNS, BNSS, BSA, IPC, CrPC, the Evidence Act and more — structured section by section, searchable in milliseconds, free.",
  },
  {
    title: "Old law ⇄ new law, instantly",
    body: "The canonical IPC⇄BNS, CrPC⇄BNSS and Evidence⇄BSA mapping — bidirectional, human-reviewed, with what-changed notes.",
  },
  {
    title: "An AI tutor that cites its sections",
    body: "Explanations grounded in the bare acts themselves. Every claim carries a citation you can open and verify.",
  },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-content flex-col px-6 py-16">
      <section className="flex flex-col gap-6 py-20">
        <p className="font-mono text-small text-accent">For Indian law · Android-first</p>
        <h1 className="max-w-2xl font-serif text-display font-semibold text-text">
          The serious student&rsquo;s legal platform.
        </h1>
        <p className="max-w-xl text-body-lg text-text-muted">
          Bare acts, the new criminal law mapping, and AI tutoring that cites real sections —
          built for law students, judiciary aspirants, and advocates.
        </p>
        <div className="flex items-center gap-4">
          <span className="inline-flex h-12 items-center rounded-md bg-brand px-6 font-medium text-on-brand">
            Coming to Google Play
          </span>
          <span className="text-small text-text-faint">Phase 0 — in the workshop</span>
        </div>
      </section>

      <section className="grid gap-6 py-12 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
            <h2 className="text-h3 font-semibold text-text">{feature.title}</h2>
            <p className="text-body text-text-muted">{feature.body}</p>
          </article>
        ))}
      </section>

      <footer className="mt-auto border-t border-border pt-8">
        <p className="text-small text-text-faint">
          ⚖️ NexLex explains law for learning — it is not legal advice. ·{" "}
          {new Date().getFullYear()} NexLex
        </p>
      </footer>
    </main>
  );
}
