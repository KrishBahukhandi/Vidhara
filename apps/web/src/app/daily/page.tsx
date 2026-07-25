import type { Metadata } from "next";
import Link from "next/link";

import { DailyMcq } from "@/components/daily-mcq";
import { PageShell } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Daily Quiz — one old-law → new-law question a day",
  description:
    "A daily one-question quiz on the old⇄new criminal law mapping (IPC→BNS, CrPC→BNSS, IEA→BSA). Build your recall for judiciary and law-school exams, one section a day. Free on Vidhara.",
  alternates: { canonical: "/daily" },
};

export default function DailyPage() {
  return (
    <PageShell>
      <h1 className="font-serif text-h1 font-semibold text-text">Daily Quiz</h1>
      <p className="mt-2 max-w-measure text-body text-text-muted">
        One question a day on the old⇄new law mapping — the cross-reference every judiciary aspirant
        needs by heart. Straight from the official NCRB mapping; come back tomorrow for the next.
      </p>
      <p className="mt-2 text-small text-text-muted">
        Want more than one?{" "}
        <Link href="/practice" className="text-brand hover:underline">
          Unlimited practice →
        </Link>
      </p>
      <DailyMcq />
    </PageShell>
  );
}
