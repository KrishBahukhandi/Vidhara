"use client";

import { useState } from "react";

import { track } from "@/lib/analytics";
import { getBrowserClient } from "@/lib/supabase-browser";

/**
 * Zero-result search ask: "what were you looking for?" → feedback
 * (kind='missing'). These rows literally decide which acts get ingested next
 * (docs/future-ideas.md — demand decides ingestion order).
 */
export function MissingContentForm({ query }: { query: string }) {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  if (state === "done") {
    return (
      <div className="mt-6 rounded-md border border-border bg-surface p-5">
        <p className="font-medium text-text">Noted — thank you. 🙏</p>
        <p className="mt-1 text-small text-text-muted">
          Requests like this decide which acts we ingest next.
        </p>
      </div>
    );
  }

  const submit = async () => {
    if (state === "sending") return;
    setState("sending");
    const client = getBrowserClient();
    const detail = message.trim();
    const { error } = client
      ? await client.from("feedback").insert({
          kind: "missing",
          message: `[Missing] searched: "${query.slice(0, 200)}"${detail ? ` — ${detail}` : ""}`.slice(0, 2000),
          path: "/search",
          platform: "web",
        })
      : { error: new Error("not configured") };
    if (error) {
      setState("error");
      return;
    }
    track("feedback_submitted", { kind: "missing" });
    setState("done");
  };

  return (
    <div className="mt-6 rounded-md border border-dashed border-border bg-surface p-5">
      <p className="font-medium text-text">Couldn&rsquo;t find it? Tell us what you were after.</p>
      <p className="mt-1 text-small text-text-muted">
        If an act or section isn&rsquo;t in the library yet, requests decide what we add next.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={300}
          placeholder="e.g. Limitation Act 1963, MV Act §185, NDPS Act…"
          className="h-11 flex-1 rounded-md border border-border bg-bg px-4 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={state === "sending"}
          className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 font-medium text-on-brand transition-opacity hover:opacity-90 disabled:opacity-60">
          {state === "sending" ? "Sending…" : "Request it"}
        </button>
      </div>
      {state === "error" ? (
        <p className="mt-2 text-small text-text-muted">Couldn&rsquo;t send — please retry.</p>
      ) : null}
    </div>
  );
}
