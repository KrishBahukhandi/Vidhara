import type { Metadata } from "next";

import { SavedList } from "@/components/saved-list";
import { PageShell } from "@/components/site-chrome";

// Personal, device-local, and not useful to crawlers — keep it out of the index.
export const metadata: Metadata = {
  title: "Saved sections",
  description: "Your locally saved sections on Vidhara.",
  robots: { index: false, follow: false },
};

export default function SavedPage() {
  return (
    <PageShell>
      <h1 className="font-serif text-h1 font-semibold text-text">Saved</h1>
      <p className="mt-2 max-w-measure text-body text-text-muted">
        Sections you&rsquo;ve saved on this device. No account, no sync yet — clearing your browser
        data clears this list.
      </p>
      <SavedList />
    </PageShell>
  );
}
