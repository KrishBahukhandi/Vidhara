import type { Metadata } from "next";

import { SuggestionForm } from "@/components/suggestion-form";
import { PageShell } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Suggest an improvement",
  description:
    "Tell us what Vidhara should improve, add, or fix — suggestions go straight to the founder and decide what gets built next.",
  alternates: { canonical: "/feedback" },
};

export default function FeedbackPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-xl">
        <h1 className="font-serif text-h1 font-semibold text-text">Help us build Vidhara</h1>
        <p className="mt-3 text-body text-text-muted">
          Vidhara is built in the open, for law students and judiciary aspirants — and what we
          build next is decided by what you ask for. Missing an act? Want a feature? Something
          broken or confusing? Tell us.
        </p>
        <div className="mt-8">
          <SuggestionForm />
        </div>
      </div>
    </PageShell>
  );
}
