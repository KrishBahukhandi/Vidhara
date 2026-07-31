import type { Metadata } from "next";
import Link from "next/link";

import { LimitationWorksheet } from "@/components/limitation-worksheet";
import { PageShell } from "@/components/site-chrome";
import { getSchedule } from "@/features/acts/queries";
import { TrackEvent } from "@/lib/analytics";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Limitation worksheet — find the Article, count the period",
  description:
    "Work out a limitation period from the Schedule to the Limitation Act, 1963: find the Article for your proceeding, see the period and the event it runs from, and the sections that would move the date. Free, no sign-up.",
  alternates: { canonical: "/limitation" },
};

export default async function LimitationPage() {
  const result = await getSchedule("lim", "schedule");
  const articles = result?.articles ?? [];

  return (
    <PageShell>
      <TrackEvent name="limitation_opened" props={{}} />
      <p className="font-mono text-small text-accent">For advocates</p>
      <h1 className="mt-1 font-serif text-h1 font-semibold text-text">Limitation worksheet</h1>
      <p className="mt-2 max-w-measure text-body text-text-muted">
        Find the Article that governs your proceeding, see the period and the event it runs from in
        the Schedule&rsquo;s own words, and count it out. Every step shows its working.
      </p>

      {/* Stated before the tool, not after it: someone who reads only the first
          screen should still know what this is. */}
      <div className="mt-4 max-w-measure rounded-md border border-border bg-surface p-4">
        <p className="text-body font-medium text-text">This is a worksheet, not advice.</p>
        <p className="mt-1 text-small text-text-muted">
          It applies one rule — s.12(1), excluding the day the period runs from. It cannot know
          whether an acknowledgment, a stay, a wrong-forum proceeding or a disability has moved your
          date, and it does not know your court&rsquo;s calendar. Verify against the bare act and
          your file before you rely on any date here.
        </p>
      </div>

      {articles.length === 0 ? (
        <p className="mt-8 text-body text-text-muted">
          The Schedule isn&rsquo;t available right now. You can still read{" "}
          <Link href="/acts/lim" className="text-brand hover:underline">
            the Limitation Act
          </Link>{" "}
          section by section.
        </p>
      ) : (
        <LimitationWorksheet articles={articles} />
      )}

      <p className="mt-8 text-small text-text-faint">
        Articles reproduced from the official India Code text of the Limitation Act, 1963. Sections
        4 to 24 govern how a period is computed —{" "}
        <Link href="/acts/lim" className="text-brand hover:underline">
          read them in full
        </Link>
        .
      </p>
    </PageShell>
  );
}
