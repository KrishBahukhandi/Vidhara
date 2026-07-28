import type { Metadata } from "next";
import Link from "next/link";

import { CaseDiary } from "@/components/case-diary";
import { PageShell } from "@/components/site-chrome";

// Personal, device-local, and useless to crawlers — keep it out of the index.
export const metadata: Metadata = {
  title: "Case diary",
  description: "Your matters, next dates and the sections they turn on — kept on this device.",
  robots: { index: false, follow: false },
};

export default function DiaryPage() {
  return (
    <PageShell>
      <p className="font-mono text-small text-accent">For advocates</p>
      <h1 className="mt-1 font-serif text-h1 font-semibold text-text">Case diary</h1>
      <p className="mt-2 max-w-measure text-body text-text-muted">
        Your matters and their next dates, with the sections each one turns on — attach a section
        and its counterpart in the other code comes with it, so an old citation doesn&rsquo;t follow
        you into a fresh draft.
      </p>

      <p className="mt-4 max-w-measure rounded-md border border-border bg-surface px-4 py-3 text-small text-text-muted">
        <strong className="font-medium text-text">Stays on this device.</strong> Case details are
        privileged, so nothing here is uploaded — no account, no server copy. The trade-off:
        clearing your browser data erases it, and it won&rsquo;t appear on your other devices. Use{" "}
        <em>Export</em> to keep a backup.{" "}
        <Link href="/cite" className="text-brand hover:underline">
          Quick cite →
        </Link>
      </p>

      <CaseDiary />
    </PageShell>
  );
}
