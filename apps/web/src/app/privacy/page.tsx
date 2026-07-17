import type { Metadata } from "next";

import { PageShell } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Vidhara collects (very little) and why — in plain language.",
  alternates: { canonical: "/privacy" },
};

/**
 * Plain-language privacy page. This is the public statement of the posture in
 * docs/analytics-plan.md §Privacy — if that changes, this page changes in the
 * same release. Also referenced by the Play Console data-safety form (V1.0).
 */
export default function PrivacyPage() {
  return (
    <PageShell>
      <h1 className="font-serif text-h1 font-semibold text-text">Privacy</h1>
      <p className="mt-2 text-small text-text-muted">Last updated: 16 July 2026</p>

      <div className="mt-8 max-w-measure space-y-6 text-body text-text">
        <section>
          <h2 className="text-h3 font-semibold">The short version</h2>
          <p className="mt-2 text-text-muted">
            Vidhara works without an account. We don&rsquo;t know who you are, and we don&rsquo;t
            want to. We count anonymous usage so we can tell which parts of the product help and
            which don&rsquo;t.
          </p>
        </section>

        <section>
          <h2 className="text-h3 font-semibold">What we collect</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-text-muted">
            <li>
              <strong className="text-text">Anonymous usage events</strong> — e.g. &ldquo;a
              section was opened&rdquo;, &ldquo;a mapping was looked up&rdquo; — tied to a random
              identifier, not to you. We use cookieless analytics (PostHog); the identifier resets
              when your browser storage clears. We never record the free text you type into
              search or lookups.
            </li>
            <li>
              <strong className="text-text">Crash reports</strong> (Sentry) — technical details of
              errors so we can fix them. No names, no contact details.
            </li>
            <li>
              <strong className="text-text">Feedback you choose to send</strong> — if you submit
              feedback, we store what you wrote. That&rsquo;s the only content you give us.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-h3 font-semibold">What we don&rsquo;t do</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-text-muted">
            <li>No accounts required, no personal data requested.</li>
            <li>No ads, no trackers beyond the two tools named above, no data sales — ever.</li>
            <li>No reading of your notes, bookmarks, or study behaviour by humans.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-h3 font-semibold">The legal texts themselves</h2>
          <p className="mt-2 text-text-muted">
            Bare-act texts are reproduced from official Government of India sources (the Gazette
            of India and India Code), which are in the public domain under s.52(1)(q) of the
            Copyright Act, 1957. Every act records its source. Vidhara is a study reference, not
            legal advice — for anything that matters, verify against the official Gazette.
          </p>
        </section>

        <section>
          <h2 className="text-h3 font-semibold">Questions</h2>
          <p className="mt-2 text-text-muted">
            Use the feedback option in the product — during the beta it goes straight to the
            founder. A dedicated contact address will be published here before public launch.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
