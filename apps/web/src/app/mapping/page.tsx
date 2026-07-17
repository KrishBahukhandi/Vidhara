import type { Metadata } from "next";

import { MappingPanel } from "@/components/mapping-panel";
import { PageShell } from "@/components/site-chrome";
import { getMappingPairPreview } from "@/features/acts/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "IPC to BNS, CrPC to BNSS, Evidence Act to BSA — section mapping",
  description:
    "The canonical old-law ⇄ new-law converter for India's criminal law reform: IPC⇄BNS, CrPC⇄BNSS, Evidence Act⇄BSA section mappings with what-changed notes. Human-reviewed, free.",
  alternates: { canonical: "/mapping" },
};

const PAIRS: { key: string; source: string; heading: string; actSlug: string }[] = [
  { key: "IPC", source: "IPC", heading: "IPC ⇄ BNS (Bharatiya Nyaya Sanhita)", actSlug: "ipc" },
  {
    key: "CRPC",
    source: "CRPC",
    heading: "CrPC ⇄ BNSS (Bharatiya Nagarik Suraksha Sanhita)",
    actSlug: "crpc",
  },
  {
    key: "IEA",
    source: "IEA",
    heading: "Evidence Act ⇄ BSA (Bharatiya Sakshya Adhiniyam)",
    actSlug: "iea",
  },
];

/** Index shows a preview per pair — the full 1,271-row corpus made this page
 * multi-megabyte. Every section page carries its own complete mapping. */
const PREVIEW_PER_PAIR = 40;

export default async function MappingPage() {
  const previews = await Promise.all(
    PAIRS.map(async (pair) => ({
      ...pair,
      ...(await getMappingPairPreview(pair.source, PREVIEW_PER_PAIR)),
    })),
  );
  const anyMappings = previews.some((p) => p.total > 0);

  return (
    <PageShell>
      <h1 className="font-serif text-h1 font-semibold text-text">
        Old criminal law ⇄ new criminal law
      </h1>
      <p className="mt-2 max-w-measure text-body text-text-muted">
        India&rsquo;s criminal law was recodified from 1 July 2024. Every mapping below is
        bidirectional and human-reviewed, with notes on exactly what changed. In the NexLex app,
        any section reference resolves instantly — try &ldquo;302 IPC&rdquo;.
      </p>

      {previews.map(({ key, heading, actSlug, rows, total }) => {
        if (total === 0) return null;
        return (
          <section key={key} className="mt-10 space-y-4">
            <h2 className="text-h2 font-semibold text-text">
              {heading}{" "}
              <span className="text-small font-normal text-text-muted">· {total} mappings</span>
            </h2>
            {rows.map((mapping) => (
              <MappingPanel key={mapping.mapping_id} mapping={mapping} />
            ))}
            {total > rows.length ? (
              <p className="text-body text-text-muted">
                Showing the first {rows.length} of {total}. Every section page carries its full
                mapping —{" "}
                <a href={`/acts/${actSlug}`} className="font-medium text-brand hover:underline">
                  browse the act
                </a>{" "}
                and open any section.
              </p>
            ) : null}
          </section>
        );
      })}

      {!anyMappings ? (
        <p className="mt-8 text-body text-text-muted">
          Mappings are being ingested — check back shortly.
        </p>
      ) : null}
    </PageShell>
  );
}
