"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ACT_SLUG, parseOrderRuleRef, parseSectionRef } from "@nexlex/shared";

import { MissingContentForm } from "@/components/missing-content-form";
import { OrderRuleNotice } from "@/components/order-rule-notice";
import { track } from "@/lib/analytics";
import {
  clearCache,
  recall,
  remember,
  useIsOnline,
  useRecentCites,
  type CitedSection,
} from "@/lib/cite-cache";
import { fetchSection } from "@/lib/section-lookup";
import { getBrowserClient } from "@/lib/supabase-browser";

interface Hit {
  section_id: string;
  act_abbreviation: string;
  act_slug: string;
  number: string;
  marginal_note: string;
}

/**
 * Quick-cite — the advocate surface. Optimised for one job: get the exact text
 * of a section, fast, on bad signal, without leaving the page. Everything
 * fetched is cached (cite-cache) so a repeat lookup is instant and works
 * offline. The old⇄new counterpart is shown inline because that's the thing an
 * advocate is most likely to get wrong when citing from memory or an old draft.
 */
export function QuickCite() {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<CitedSection | null>(null);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [orderRule, setOrderRule] = useState<ReturnType<typeof parseOrderRuleRef>>(null);
  const [orderMatches, setOrderMatches] = useState<
    { id: string; number: string; title: string; sortOrder: number; ruleCount: number }[]
  >([]);
  const [message, setMessage] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [copied, setCopied] = useState<"cite" | "text" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const online = useIsOnline();
  const recents = useRecentCites();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /** Fetch one section (+ its counterpart), falling back to the cache. */
  const loadSection = useCallback(async (slug: string, number: string) => {
    const cached = recall(slug, number);
    const db = getBrowserClient();

    if (!db || !navigator.onLine) {
      if (cached) {
        setSection(cached);
        setHits(null);
        setFromCache(true);
        setState("idle");
        return;
      }
      setState("error");
      setMessage(
        navigator.onLine
          ? "Lookup is unavailable right now."
          : "You're offline and this section isn't in your cache yet.",
      );
      return;
    }

    const item = await fetchSection(slug, number);
    if (!item) {
      if (cached) {
        setSection(cached);
        setHits(null);
        setFromCache(true);
        setState("idle");
        return;
      }
      setState("error");
      setMessage(`No section ${number} in that act.`);
      return;
    }

    remember(item);
    setSection({ ...item, ts: Date.now() });
    setHits(null);
    setFromCache(false);
    setState("idle");
  }, []);

  const submit = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setState("loading");
    setMessage("");
    setCopied(null);

    // An advocate citing "Order 7 Rule 11" is citing the CPC's First Schedule,
    // which is not in the corpus. Checked before anything else: concept search
    // would otherwise return sections matching the bare digit, which for
    // someone drafting is worse than being told we do not have it.
    const orderRuleRef = parseOrderRuleRef(trimmed);
    setOrderRule(orderRuleRef);
    if (orderRuleRef) {
      track("quick_cite_lookup", { matched_ref: false, order_rule: true, offline: !navigator.onLine });
      setState("idle");
      // Client-side because this is a client component; act_orders is
      // anon-readable, same as every other content table.
      const db = getBrowserClient();
      if (db && navigator.onLine) {
        const { data } = await db
          .from("act_orders")
          .select("id, number, title, sort_order, acts!inner(slug)")
          .eq("acts.slug", "cpc")
          .eq("number", orderRuleRef.order)
          .eq("review_status", "published")
          .order("sort_order");
        setOrderMatches(
          (data ?? []).map((o) => ({
            id: o.id as string,
            number: o.number as string,
            title: o.title as string,
            sortOrder: o.sort_order as number,
            ruleCount: 0,
          })),
        );
      } else {
        setOrderMatches([]);
      }
      return;
    }

    const ref = parseSectionRef(trimmed);
    track("quick_cite_lookup", { matched_ref: Boolean(ref?.act), offline: !navigator.onLine });

    if (ref?.act) {
      await loadSection(ACT_SLUG[ref.act], ref.section);
      return;
    }

    // Not a confident reference → concept search (online only).
    const db = getBrowserClient();
    if (!db || !navigator.onLine) {
      setState("error");
      setMessage("Offline — type an exact reference like “138 NI Act” to use your cached sections.");
      return;
    }
    const { data, error } = await db.rpc("search_sections", { q: trimmed });
    if (error || !Array.isArray(data) || data.length === 0) {
      setState("error");
      setMessage(`Nothing found for “${trimmed}”.`);
      return;
    }
    setHits((data as Hit[]).slice(0, 8));
    setSection(null);
    setState("idle");
  };

  const copy = async (kind: "cite" | "text") => {
    if (!section) return;
    // Indian drafts cite "Section 420 IPC", never "§420" — this string is
    // pasted straight into a pleading.
    const citation = `${section.act} Section ${section.number} — ${section.note}`;
    const payload = kind === "cite" ? citation : `${citation}\n\n${section.body}`;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(kind);
      track("quick_cite_copied", { kind });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked — nothing to do */
    }
  };

  return (
    <div className="mt-6">
      {!online ? (
        <p className="mb-4 rounded-md border border-warning bg-surface px-4 py-2 text-small text-text-muted">
          Offline — serving from your cached sections. Exact references only.
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(query);
        }}
        className="flex gap-2">
        <label htmlFor="cite" className="sr-only">
          Section to cite
        </label>
        <input
          id="cite"
          ref={inputRef}
          type="text"
          inputMode="search"
          autoComplete="off"
          placeholder="302 IPC · BNSS 480 · 65B Evidence · “anticipatory bail”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 flex-1 rounded-md border border-border bg-surface px-4 font-mono text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="inline-flex h-12 items-center rounded-md bg-brand px-6 font-medium text-on-brand transition-opacity hover:opacity-90 disabled:opacity-70">
          {state === "loading" ? "…" : "Cite"}
        </button>
      </form>

      {orderRule ? (
        <div className="mt-4">
          <OrderRuleNotice value={orderRule} matches={orderMatches} />
        </div>
      ) : null}

      {state === "error" ? (
        <>
          <p className="mt-3 text-body text-text-muted">{message}</p>
          {/* The corpus is 8 acts (criminal codes + Constitution + Contract Act).
              An advocate's daily citations range wider — NI Act, CPC, MV Act… —
              so a miss is the cheapest possible signal for which act to ingest
              next for this audience. */}
          {online ? <MissingContentForm query={query} path="/cite" /> : null}
        </>
      ) : null}

      {/* Concept-search shortlist */}
      {hits && hits.length > 0 ? (
        <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
          {hits.map((h) => (
            <li key={h.section_id}>
              <button
                type="button"
                onClick={() => {
                  setQuery(`${h.number} ${h.act_abbreviation}`);
                  void loadSection(h.act_slug, h.number);
                }}
                className="flex w-full items-baseline gap-3 px-4 py-3 text-left transition-colors hover:bg-bg">
                <span className="font-mono text-small font-semibold text-brand">
                  {h.act_abbreviation} s. {h.number}
                </span>
                <span className="text-body text-text">{h.marginal_note}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* The citation itself */}
      {section ? (
        <article className="mt-5 rounded-lg border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-mono text-h3 font-semibold text-text">
              {section.act} s. {section.number}
            </h2>
            {section.counterpart ? (
              <span className="rounded-full border border-brand px-3 py-1 text-small font-medium text-brand">
                {section.counterpart}
              </span>
            ) : null}
            {fromCache ? (
              <span className="text-micro text-text-faint">from cache</span>
            ) : null}
          </div>
          <p className="mt-1 text-body text-text-muted">{section.note}</p>

          <p className="mt-4 whitespace-pre-wrap font-serif text-bodyLg text-text">{section.body}</p>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => void copy("cite")}
              className="lift inline-flex h-10 items-center rounded-md border border-border px-4 text-small font-medium text-text-muted hover:text-text">
              {copied === "cite" ? "Copied ✓" : "Copy citation"}
            </button>
            <button
              type="button"
              onClick={() => void copy("text")}
              className="lift inline-flex h-10 items-center rounded-md border border-border px-4 text-small font-medium text-text-muted hover:text-text">
              {copied === "text" ? "Copied ✓" : "Copy with text"}
            </button>
            <Link
              href={`/acts/${section.slug}/${encodeURIComponent(section.number)}`}
              className="lift inline-flex h-10 items-center rounded-md border border-border px-4 text-small font-medium text-text-muted hover:text-text">
              Full page →
            </Link>
          </div>
        </article>
      ) : null}

      {/* Recently cited — the offline-ready set */}
      {recents.length > 0 ? (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-small font-medium text-text-muted">
              Recently cited · available offline
            </h2>
            <button
              type="button"
              onClick={clearCache}
              className="text-micro text-text-faint hover:text-text-muted">
              Clear
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {recents.slice(0, 18).map((r) => (
              <button
                key={`${r.slug}-${r.number}`}
                type="button"
                onClick={() => {
                  setQuery(`${r.number} ${r.act}`);
                  void loadSection(r.slug, r.number);
                }}
                className="rounded-md border border-border px-3 py-1.5 font-mono text-small text-text-muted transition-colors hover:border-brand hover:text-text">
                {r.act} s. {r.number}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
