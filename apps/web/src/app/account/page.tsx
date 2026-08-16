import type { Metadata } from "next";

import { AccountPanel } from "@/components/account-panel";
import { PageShell } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Vidhara with a one-time code sent to your email. No password. Everything on Vidhara works without an account.",
  alternates: { canonical: "/account" },
  // Personal and signed-in-only; nothing here is worth a crawl, and it should
  // never compete with a section page in search results.
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-xl">
        <h1 className="font-serif text-h1 font-semibold text-text">Sign in</h1>
        <p className="mt-3 text-body text-text-muted">
          Enter your email and we&rsquo;ll send a one-time code. There is no password to remember or
          lose.
        </p>
        <div className="mt-8">
          <AccountPanel />
        </div>
      </div>
    </PageShell>
  );
}
