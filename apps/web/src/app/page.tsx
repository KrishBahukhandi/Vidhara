import Link from "next/link";

const FEATURES = [
  {
    title: "Old law ⇄ new law, instantly",
    body: "Every IPC⇄BNS, CrPC⇄BNSS and Evidence⇄BSA section mapping from the official government concordance — bidirectional, with what-changed notes.",
  },
  {
    title: "Bare Acts, readable at last",
    body: "BNS, BNSS, BSA, IPC, CrPC, the Evidence Act, the Contract Act and the Constitution — 3,000+ sections from official Gazette texts, structured and free.",
  },
  {
    title: "Built for the transition years",
    body: "Your textbook says IPC 420; your exam says BNS 318. Open either one and the other is right there, with the full text of both.",
  },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-content flex-1 flex-col px-6">
      <section className="flex flex-col gap-6 py-20">
        <p className="font-mono text-small text-accent">
          For law students & judiciary aspirants · Free · No sign-up
        </p>
        <h1 className="max-w-2xl font-serif text-display font-semibold text-text">
          The serious student&rsquo;s legal platform.
        </h1>
        <p className="max-w-xl text-body-lg text-text-muted">
          Complete bare acts and the official old⇄new criminal law mapping — IPC⇄BNS, CrPC⇄BNSS,
          Evidence⇄BSA — built for the transition every exam now tests.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/acts"
            className="inline-flex h-12 items-center rounded-md bg-brand px-6 font-medium text-on-brand transition-opacity hover:opacity-90">
            Browse the Bare Acts
          </Link>
          <Link
            href="/mapping"
            className="inline-flex h-12 items-center rounded-md border border-border px-6 font-medium text-text transition-colors hover:border-brand">
            IPC ⇄ BNS Mapping
          </Link>
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

    </main>
  );
}
