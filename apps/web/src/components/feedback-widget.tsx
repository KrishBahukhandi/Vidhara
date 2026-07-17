"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { track } from "@/lib/analytics";
import { getBrowserClient } from "@/lib/supabase-browser";

const SCORES = [1, 2, 3, 4, 5] as const;

/**
 * One-tap feedback (docs/release-plan.md §V0.2): score 1–5 + optional text →
 * public.feedback (anon INSERT-only RLS). Text goes to the database, never to
 * analytics (privacy posture) — PostHog only sees {score, has_text}.
 */
export function FeedbackWidget() {
  const pathname = usePathname();
  const [score, setScore] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  if (state === "done") {
    return (
      <p className="mt-10 rounded-md border border-border bg-surface p-4 text-body text-text-muted">
        Thank you — every note gets read by the founder. 🙏
      </p>
    );
  }

  const submit = async () => {
    if (score === null || state === "sending") return;
    setState("sending");
    const client = getBrowserClient();
    const { error } = client
      ? await client.from("feedback").insert({
          score,
          message: message.trim() || null,
          path: pathname,
          platform: "web",
        })
      : { error: new Error("not configured") };
    if (error) {
      setState("error");
      return;
    }
    track("feedback_submitted", { score, has_text: message.trim().length > 0 });
    setState("done");
  };

  return (
    <div className="mt-10 rounded-md border border-border bg-surface p-4">
      <p className="text-small font-medium text-text">Was this page useful for your prep?</p>
      <div className="mt-3 flex items-center gap-2" role="radiogroup" aria-label="Score 1 to 5">
        {SCORES.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={score === value}
            onClick={() => setScore(value)}
            className={`h-10 w-10 rounded-md border text-body font-medium transition-colors ${
              score === value
                ? "border-brand bg-brand text-on-brand"
                : "border-border text-text-muted hover:border-brand"
            }`}>
            {value}
          </button>
        ))}
      </div>
      {score !== null ? (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="What's missing or broken? (optional)"
            className="w-full rounded-md border border-border bg-bg p-3 text-body text-text placeholder:text-text-faint focus:border-brand focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={state === "sending"}
              className="inline-flex h-10 items-center rounded-md bg-brand px-4 font-medium text-on-brand transition-opacity hover:opacity-90 disabled:opacity-60">
              {state === "sending" ? "Sending…" : "Send"}
            </button>
            {state === "error" ? (
              <span className="text-small text-text-muted">
                Couldn&rsquo;t send — please try again.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
