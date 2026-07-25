import type { Metadata } from "next";
import Link from "next/link";

import { PracticeMcq } from "@/components/practice-mcq";
import { PageShell } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Practice — unlimited old⇄new law questions",
  description:
    "Unlimited practice questions on the old⇄new criminal law mapping (IPC⇄BNS, CrPC⇄BNSS, IEA⇄BSA). Drill section recall both ways for judiciary and law-school exams. Free on Vidhara.",
  alternates: { canonical: "/practice" },
};

export default function PracticePage() {
  return (
    <PageShell>
      <h1 className="font-serif text-h1 font-semibold text-text">Practice</h1>
      <p className="mt-2 max-w-measure text-body text-text-muted">
        Unlimited questions, generated from the official mapping — old→new, new→old, and
        topic→section. Keep going as long as you like; every answer links to the actual provision.
      </p>
      <p className="mt-2 text-small text-text-muted">
        Prefer one a day?{" "}
        <Link href="/daily" className="text-brand hover:underline">
          Today’s question →
        </Link>
      </p>
      <PracticeMcq />
    </PageShell>
  );
}
