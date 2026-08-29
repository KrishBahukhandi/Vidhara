"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { useSearchSuggestions } from "@/lib/search-suggestions";

/**
 * Search from wherever you are.
 *
 * Until now the header linked to /search, so looking anything up cost a page
 * load before you could even type — on a corpus whose every ranking query is a
 * section lookup ("151 bns", "134 bnss"), that is the main thing people came to
 * do, behind a door. This puts it one keystroke away on every page.
 *
 * It answers while you type rather than after you submit. A section reference
 * resolves client-side (see useSearchSuggestions), so "420 ipc" shows its
 * destination immediately and Enter simply goes there — no request, no results
 * page, no waiting to discover the box understood you.
 *
 * Keyboard-first because the people who use this most are reading with a
 * keyboard in front of them: `/` or ⌘K opens it, arrows move, Enter goes, Esc
 * closes. It is a proper combobox for screen readers, and focus returns to
 * whatever opened it.
 */
export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const suggestions = useSearchSuggestions(query);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
    // Put the reader back where they were, not at the top of the document.
    openerRef.current?.focus();
  }, []);

  // `/` is the reference-site convention and costs no modifier; ⌘K is what
  // anyone who uses a code editor or a docs site will try first. Neither may
  // steal a keystroke from someone who is actually typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        openerRef.current = el instanceof HTMLElement ? el : null;
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    // The page behind must not scroll while the panel is over it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const go = (index: number) => {
    const choice = suggestions[index];
    if (!choice) return;
    track("search_performed", { kind: choice.kind, from: "palette" });
    close();
    router.push(choice.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(1, suggestions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % Math.max(1, suggestions.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(active);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => {
          openerRef.current = e.currentTarget;
          setOpen(true);
        }}
        aria-label="Search the library"
        className="lift inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-small text-text-muted hover:border-brand hover:text-text">
        <span aria-hidden>🔍</span>
        <span className="hidden lg:inline">Search</span>
        {/* The shortcut is only worth showing where there is a keyboard to press it on. */}
        <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-micro text-text-faint lg:inline">
          /
        </kbd>
      </button>
    );
  }

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex items-start justify-center bg-text/20 p-4 backdrop-blur-sm sm:pt-24"
      onClick={close}>
      <div
        className="animate-rise w-full max-w-xl overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <span aria-hidden className="text-text-faint">
            🔍
          </span>
          <label htmlFor="palette-input" className="sr-only">
            Search the library
          </label>
          <input
            id="palette-input"
            ref={inputRef}
            type="text"
            autoComplete="off"
            role="combobox"
            aria-expanded
            aria-controls="palette-results"
            aria-activedescendant={suggestions[active] ? `palette-option-${active}` : undefined}
            placeholder="Section or phrase — “420 IPC”, “anticipatory bail”…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="h-14 flex-1 bg-transparent text-body text-text placeholder:text-text-faint focus:outline-none"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            className="rounded px-2 py-1 text-micro text-text-faint hover:text-text">
            Esc
          </button>
        </div>

        <ul id="palette-results" role="listbox" aria-label="Search suggestions" className="max-h-80 overflow-y-auto">
          {suggestions.length === 0 ? (
            <li className="px-4 py-6 text-small text-text-muted">
              Type a section number or a phrase.
            </li>
          ) : (
            suggestions.map((s, i) => (
              <li key={s.href} id={`palette-option-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(i)}
                  className={`flex w-full items-baseline gap-3 px-4 py-3 text-left transition-colors ${
                    i === active ? "bg-bg" : ""
                  }`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-text">{s.label}</span>
                    {s.detail ? (
                      <span className="block truncate text-small text-text-muted">{s.detail}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-micro uppercase tracking-wide text-text-faint">
                    {s.kind === "section"
                      ? "Go to"
                      : s.kind === "saved"
                        ? "Saved"
                        : s.kind === "recent"
                          ? "Recent"
                          : "Search"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
