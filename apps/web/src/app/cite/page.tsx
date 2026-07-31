import type { Metadata } from "next";
import Link from "next/link";

import { QuickCite } from "@/components/quick-cite";
import { PageShell } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Quick cite — section lookup for court",
  description:
    "Fast bare-act section lookup for advocates: type a citation, get the exact text plus its old⇄new counterpart, copy it into a draft. Works offline for sections you've looked up before. Free, no sign-up.",
  alternates: { canonical: "/cite" },
};

export default function CitePage() {
  return (
    <PageShell>
      <p className="font-mono text-small text-accent">For advocates</p>
      <h1 className="mt-1 font-serif text-h1 font-semibold text-text">Quick cite</h1>
      <p className="mt-2 max-w-measure text-body text-text-muted">
        Type a section, get the exact text — and the counterpart in the other code, so an old
        citation doesn&rsquo;t slip into a fresh draft. Everything you look up is kept on this
        device and stays readable on bad signal.
      </p>
      <p className="mt-3 text-small text-text-faint">
        Covers the criminal codes (IPC, CrPC, Evidence and their BNS/BNSS/BSA successors), the
        Constitution, and the Contract, NI, CPC, NDPS, Motor Vehicles, Arbitration and Limitation
        Acts. Looking
        for another act? Tell us on a miss — that&rsquo;s how we pick what to add next.
      </p>
      <p className="mt-3 text-small text-text-muted">
        Working out a period instead?{" "}
        <Link href="/limitation" className="text-brand hover:underline">
          Limitation worksheet
        </Link>{" "}
        — find the Article, see what it runs from, count it out.
      </p>
      <QuickCite />
    </PageShell>
  );
}
