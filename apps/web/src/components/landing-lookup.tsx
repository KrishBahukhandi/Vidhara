"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseSectionRef } from "@nexlex/shared";

import { track } from "@/lib/analytics";

/** Act abbreviation → act slug (slugs are the lowercased abbreviations). */
const EXAMPLES = ["420 IPC", "154 CrPC", "65B Evidence Act", "BNS 103"] as const;

/**
 * The wedge, front and center: type any old/new section reference and land on
 * its full text with the mapping card. Bad parses stay inline with a hint —
 * navigation only happens on a confident act+section parse.
 */
export function LandingLookup() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  const submit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const parsed = parseSectionRef(trimmed);
    const found = Boolean(parsed?.act);
    track("landing_lookup_submitted", { found });
    if (parsed?.act) {
      setHint(null);
      router.push(
        `/acts/${parsed.act.toLowerCase()}/${encodeURIComponent(parsed.section)}?via=mapping`,
      );
      return;
    }
    if (parsed && !parsed.act) {
      setHint(`Which act is §${parsed.section} from? Add it — e.g. “${parsed.section} IPC”.`);
      return;
    }
    // Not a section reference — fall through to full-text search.
    setHint(null);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="w-full max-w-xl">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}>
        <label htmlFor="lookup" className="sr-only">
          Look up any section — old or new law
        </label>
        <input
          id="lookup"
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="Type any section — “420 IPC”, “BNS 103”, “u/s 154 CrPC”…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 flex-1 rounded-md border border-border bg-surface px-4 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex h-12 items-center rounded-md bg-brand px-6 font-medium text-on-brand transition-opacity hover:opacity-90">
          Open
        </button>
      </form>

      {hint ? <p className="mt-2 text-small text-text-muted">{hint}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setQuery(example);
              submit(example);
            }}
            className="rounded-md border border-border px-3 py-1.5 font-mono text-small text-text-muted transition-colors hover:border-brand hover:text-text">
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
