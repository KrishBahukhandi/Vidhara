"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { track } from "@/lib/analytics";
import { getBrowserClient } from "@/lib/supabase-browser";

const TOPICS = ["Website", "Android app", "Content / acts", "New feature"] as const;

/**
 * Free-text improvement suggestions → public.feedback (anon INSERT-only RLS).
 * With ?about=IPC §302 (the per-section "report an issue" link) it becomes a
 * scoped error REPORT (kind='report' — Sev-0 intake). Text goes to the
 * database, never to analytics (docs/analytics-plan.md §Privacy).
 */
export function SuggestionForm() {
  return (
    <Suspense fallback={null}>
      <SuggestionFormInner />
    </Suspense>
  );
}

function SuggestionFormInner() {
  const about = useSearchParams().get("about");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>(
    about ? "Content / acts" : "Website",
  );
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  if (state === "done") {
    return (
      <div className="rounded-md border border-border bg-surface p-6">
        <p className="text-h3 font-semibold text-text">Got it — thank you. 🙏</p>
        <p className="mt-2 text-body text-text-muted">
          Every suggestion is read by the founder. The ones enough of you ask for get built —
          that&rsquo;s literally how we decide the roadmap.
        </p>
        <button
          type="button"
          onClick={() => {
            setMessage("");
            setState("idle");
          }}
          className="mt-4 inline-flex h-10 items-center rounded-md border border-border px-4 font-medium text-text transition-colors hover:border-brand">
          Send another
        </button>
      </div>
    );
  }

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed || state === "sending") return;
    setState("sending");
    const client = getBrowserClient();
    const kind = about ? "report" : "suggestion";
    const prefix = about ? `[Report: ${about}]` : `[${topic}]`;
    const { error } = client
      ? await client.from("feedback").insert({
          kind,
          message: `${prefix} ${trimmed}`.slice(0, 2000),
          path: window.location.pathname,
          platform: "web",
        })
      : { error: new Error("not configured") };
    if (error) {
      setState("error");
      return;
    }
    track("feedback_submitted", { kind, topic });
    setState("done");
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}>
      {about ? (
        <p className="inline-flex items-center gap-2 self-start rounded-md border border-warning px-3 py-1.5 text-small text-text">
          ⚠️ Reporting an issue with <span className="font-mono font-bold">{about}</span>
        </p>
      ) : null}

      <div>
        <p className="mb-2 text-small font-medium text-text">What is it about?</p>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(t)}
              aria-pressed={topic === t}
              className={`h-10 rounded-md border px-4 text-small font-medium transition-colors ${
                topic === t
                  ? "border-brand bg-brand text-on-brand"
                  : "border-border text-text-muted hover:border-brand"
              }`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-small font-medium text-text">
          What should we improve, add, or fix?
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1900}
          rows={5}
          placeholder="The more specific, the better — e.g. “let me highlight lines inside a section”, “add the Limitation Act”, “the mapping card should show…”"
          className="w-full rounded-md border border-border bg-surface p-4 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state === "sending" || !message.trim()}
          className="inline-flex h-11 items-center rounded-md bg-brand px-6 font-medium text-on-brand transition-opacity hover:opacity-90 disabled:opacity-50">
          {state === "sending" ? "Sending…" : "Send suggestion"}
        </button>
        {state === "error" ? (
          <span className="text-small text-text-muted">Couldn&rsquo;t send — please retry.</span>
        ) : null}
      </div>

      <p className="text-micro text-text-faint">
        Anonymous — no account, no email. If you&rsquo;d like a reply, include a contact in the
        message.
      </p>
    </form>
  );
}
