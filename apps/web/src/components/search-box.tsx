"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseSectionRef } from "@nexlex/shared";

/**
 * One search box, two behaviours (architecture.md §8): a confident section
 * ref ("420 IPC") navigates straight to the section; anything else goes to
 * /search full-text results.
 */
export function SearchBox({ initialQuery = "", autoFocus = false }: { initialQuery?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const submit = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const ref = parseSectionRef(trimmed);
    if (ref?.act) {
      router.push(`/acts/${ref.act.toLowerCase()}/${encodeURIComponent(ref.section)}?via=search`);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}>
      <label htmlFor="site-search" className="sr-only">
        Search the library
      </label>
      <input
        id="site-search"
        type="search"
        inputMode="search"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder='Search — "cheating", "dowry death", "65B IEA"…'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-11 flex-1 rounded-md border border-border bg-surface px-4 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
      />
      <button
        type="submit"
        className="inline-flex h-11 items-center rounded-md bg-brand px-5 font-medium text-on-brand transition-opacity hover:opacity-90">
        Search
      </button>
    </form>
  );
}
