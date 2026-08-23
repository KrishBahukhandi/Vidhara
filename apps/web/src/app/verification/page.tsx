import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/site-chrome";
import {
  listActs,
  countPublishedSections,
  countPublishedMappings,
  countStateAmendments,
} from "@/features/acts/queries";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "How we verify the text — sources, method and known limits",
  description:
    "Where Vidhara's bare-act text comes from, how it is extracted from the official PDFs, what we check, the defects we have found and fixed, and what we do not claim. Free, no sign-up.",
  alternates: { canonical: "/verification" },
};

/**
 * The trust page.
 *
 * Our corpus is a fraction the size of the big bare-act apps; what it has
 * instead is a verifiable chain from the official PDF to the page. That is
 * worthless if nobody can see it, which is the entire reason this page exists.
 *
 * Two rules for anything written here: every number is read live from the
 * database rather than typed in, so the page cannot drift from the corpus; and
 * the limits section is not smaller than the claims section. A trust page that
 * only lists strengths is marketing, and a reader who catches it overstating
 * once has no reason to believe the rest.
 */
export default async function VerificationPage() {
  const [acts, sections, mappings, stateAmendments] = await Promise.all([
    listActs(),
    countPublishedSections(),
    countPublishedMappings(),
    countStateAmendments(),
  ]);

  return (
    <PageShell>
      <p className="font-mono text-small text-accent">How we verify</p>
      <h1 className="mt-1 font-serif text-h1 font-semibold text-text">
        Where this text comes from
      </h1>
      <p className="mt-3 max-w-measure text-body text-text-muted">
        Every provision on Vidhara is traced to the government&rsquo;s own published PDF. This page
        explains how, what we check, what we have found wrong and fixed — and, just as important,
        what we do not claim.
      </p>

      <dl className="mt-6 grid grid-cols-3 gap-4 rounded-md border border-border bg-surface p-4">
        <div>
          <dt className="text-small text-text-muted">Acts</dt>
          <dd className="font-mono text-h3 font-semibold text-text">{acts.length}</dd>
        </div>
        <div>
          <dt className="text-small text-text-muted">Sections</dt>
          <dd className="font-mono text-h3 font-semibold text-text">{sections.toLocaleString("en-IN")}</dd>
        </div>
        <div>
          <dt className="text-small text-text-muted">Old⇄new mappings</dt>
          <dd className="font-mono text-h3 font-semibold text-text">{mappings.toLocaleString("en-IN")}</dd>
        </div>
      </dl>

      <Section title="The source is the government's PDF, not another website">
        <p>
          Each act is taken from{" "}
          <a
            href="https://www.indiacode.nic.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline">
            India Code
          </a>{" "}
          or the Gazette of India — the official publications — and never copied from another legal
          site. For each one we record the exact file we used, its size in bytes and its SHA-256
          hash, so the text on this page can be traced back to a specific government document rather
          than to &ldquo;a PDF we found&rdquo;.
        </p>
        <p>
          Every section page carries that provenance at the bottom, including a link to the source
          document, so you can check any provision against the original yourself.
        </p>
      </Section>

      <Section title="Extraction reads the page, not the copy-paste">
        <p>
          Statute PDFs put marginal notes in one column and text in another, and print schedules as
          tables. Copying text out collapses those columns and silently interleaves them. We instead
          read the coordinates of every word on the page and rebuild the structure from its
          geometry, which is why a three-column schedule keeps each period beside the limb it
          belongs to.
        </p>
      </Section>

      <Section title="What we check before publishing">
        <p>
          Where the structure allows it, extraction is verified <strong>lossless</strong>: we
          compare every word of the parsed result against the source document and require the counts
          to match exactly. The Limitation Act&rsquo;s Schedule, for instance, was published only
          once its 4,581 word tokens matched the PDF&rsquo;s 4,581.
        </p>
        <p>
          A scanner then runs over the whole corpus looking for known defect shapes — text that
          duplicates itself, provisions that ended up empty, headings that leaked into a body,
          numbering that jumps. It currently reports <strong>zero severity-1 defects</strong> across
          all {sections.toLocaleString("en-IN")} published sections.
        </p>
      </Section>

      <Section title="Things we have found wrong — and fixed">
        <p>
          This is the part that matters, because a corpus assembled in bulk will carry these and
          nobody will know. Each of these was a real defect in our own data, found by checking:
        </p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong>One State&rsquo;s amendment shown as national law.</strong> India Code prints
            State amendments immediately after the central section they modify, and our text had
            absorbed them. This was found in stages and the last of it was only cleared on 2 August
            2026: <strong>68 sections</strong> — including CrPC Section 438 (anticipatory bail), Section 125
            (maintenance) and Section 154 (FIR) — were still carrying a State&rsquo;s amending text inside
            the central provision, about 142,000 characters of it. A further{" "}
            <strong>21 provisions were published as sections in their own right</strong> though no
            such section exists nationally: IPC 354E, 376F, 509A and 509B (Chhattisgarh), 379A and
            379B (Gujarat), 382B–382F (Tripura), IEA 114B (Chhattisgarh), and Registration Act
            80A–80G and 89C–89D (Bengal and Uttar Pradesh).
          </li>
          <li>
            <strong>The Constitution was missing Part II.</strong> Citizenship — Articles 5 to 11 —
            had no Part of its own, and those articles sat under &ldquo;The Union and its
            Territory&rdquo;.
          </li>
          <li>
            <strong>Schedule entries read as sections.</strong> The NDPS Act&rsquo;s schedule of
            substances parsed as sections numbered past 110, none of which exist in the Act.
          </li>
          <li>
            <strong>Headings swallowed into the text.</strong> Chapter and Part headings appended to
            the end of the previous section&rsquo;s body.
          </li>
        </ul>
        <p className="mt-3">
          Every correction is recorded with the date, the cause and the fix, and lives in a versioned
          data bundle rather than being edited straight into the live database — so a republish can
          never quietly undo it.
        </p>
      </Section>

      <Section title="State amendments are shown, and shown separately">
        <p>
          Several States amend central Acts in their own application. Keeping that text out of the
          section is not enough on its own: a reader in Karnataka who sees only the central
          provision has been told, in effect, that nothing else applies. Silence is its own wrong
          answer.
        </p>
        <p>
          So where the source records one, the amendment now appears in its own block beneath the
          section — labelled with the State, with the amending Act cited, and collapsed until you
          open it. There are currently{" "}
          <strong>{stateAmendments.toLocaleString("en-IN")} such amendments</strong> across the
          corpus. What is shown is the amending instruction as India Code prints it (&ldquo;in
          section 17, after clause (b), insert…&rdquo;), never a consolidated State version of the
          section — writing that ourselves would mean composing statute text, which we do not do.
        </p>
      </Section>

      <Section title="What we do not claim">
        <p>
          Being useful means being clear about the edges. All of the following are true today:
        </p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong>{acts.length} acts is narrow.</strong> Other apps carry hundreds. We would rather
            add them slowly and check each one than publish a corpus we cannot vouch for.
          </li>
          <li>
            <strong>Parsing is automated, with spot checks against the PDF.</strong> A full
            clause-by-clause human proofread of every section has not been done.
          </li>
          <li>
            <strong>Footnotes and amendment history are excluded.</strong> You get the provision as
            currently printed, not the record of how it changed.
          </li>
          <li>
            <strong>Most schedules are not ingested.</strong> The Limitation Act&rsquo;s Schedule is;
            others are not yet. Where a schedule matters, read it from the source PDF.
          </li>
          <li>
            <strong>State amendments to the CPC&rsquo;s Orders are excluded.</strong> The First
            Schedule is now here in full — 57 Orders and 728 rules — but what you read is the
            central Schedule. Several States substitute or insert rules (Uttar Pradesh does both),
            and those are kept out rather than merged in, for the same reason a State&rsquo;s
            amendment never enters a section&rsquo;s text.
          </li>
          <li>
            <strong>There is no case law here.</strong> Vidhara tells you what a provision says, not
            how courts have read it.
          </li>
          <li>
            <strong>State amendments are recorded, not consolidated.</strong> You get the amending
            instruction and its citation, not the section as it reads in that State — and only where
            the source prints one, which is not the same as everywhere one exists.
          </li>
          <li>
            <strong>An act is held back rather than published if we cannot vouch for it.</strong>{" "}
            Six acts&rsquo; PDFs print amendment footnotes in the same size as their text, which
            destroys sections outright — the Special Marriage Act lost the conditions for a valid
            marriage, and the SC/ST (Prevention of Atrocities) Act lost its central punishment
            provision. Each is published only because the repaired text matches that Act&rsquo;s own
            arrangement of sections, section for section; the repair refuses to run otherwise.
            Nothing is currently withheld.
          </li>
        </ul>
        <p className="mt-3">
          For anything you file or rely on professionally, check the bare act. This is a reading and
          reference tool, not a substitute for the official text.
        </p>
      </Section>

      <Section title="If you find a mistake">
        <p>
          Wrong text is the most serious kind of bug we can have, and it is treated that way — a
          report goes to the top of the queue ahead of any feature. Every section page has a report
          link scoped to that exact provision, or you can{" "}
          <Link href="/feedback" className="text-brand hover:underline">
            tell us here
          </Link>
          .
        </p>
      </Section>

      <p className="mt-10 text-small text-text-faint">
        Counts on this page are read from the live database, so they stay accurate as the corpus
        grows. Last checked when this page was generated.
      </p>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-serif text-h3 font-semibold text-text">{title}</h2>
      <div className="mt-2 max-w-measure space-y-3 text-body text-text-muted">{children}</div>
    </section>
  );
}
