import type { Metadata } from "next";

import { MappingPanel } from "@/components/mapping-panel";
import { PageShell } from "@/components/site-chrome";
import { listAllMappings, type MappingRow } from "@/features/acts/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "IPC to BNS, CrPC to BNSS, Evidence Act to BSA — section mapping",
  description:
    "The canonical old-law ⇄ new-law converter for India's criminal law reform: IPC⇄BNS, CrPC⇄BNSS, Evidence Act⇄BSA section mappings with what-changed notes. Human-reviewed, free.",
  alternates: { canonical: "/mapping" },
};

const PAIRS: { key: string; source: string; heading: string }[] = [
  { key: "IPC", source: "IPC", heading: "IPC ⇄ BNS (Bharatiya Nyaya Sanhita)" },
  { key: "CRPC", source: "CRPC", heading: "CrPC ⇄ BNSS (Bharatiya Nagarik Suraksha Sanhita)" },
  { key: "IEA", source: "IEA", heading: "Evidence Act ⇄ BSA (Bharatiya Sakshya Adhiniyam)" },
];

export default async function MappingPage() {
  const mappings = await listAllMappings();
  const byPair = new Map<string, MappingRow[]>();
  for (const mapping of mappings) {
    const key = mapping.source_act ?? "other";
    byPair.set(key, [...(byPair.get(key) ?? []), mapping]);
  }

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

      {PAIRS.map(({ key, heading }) => {
        const pairMappings = byPair.get(key) ?? [];
        if (pairMappings.length === 0) return null;
        return (
          <section key={key} className="mt-10 space-y-4">
            <h2 className="text-h2 font-semibold text-text">{heading}</h2>
            {pairMappings.map((mapping) => (
              <MappingPanel key={mapping.mapping_id} mapping={mapping} />
            ))}
          </section>
        );
      })}

      {mappings.length === 0 ? (
        <p className="mt-8 text-body text-text-muted">
          Mappings are being ingested — check back shortly.
        </p>
      ) : null}
    </PageShell>
  );
}
