"use client";

import { useState } from "react";

import { track } from "@/lib/analytics";

/** Render the model's markdown-ish output: "- " / "* " bullets and **bold**. */
function ExplanationText({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  const bold = (s: string) =>
    s.split("**").map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-semibold text-text">
          {part}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  return (
    <div className="space-y-2 text-body text-text">
      {lines.map((line, i) => {
        const bullet = /^[-*•]\s+/.test(line);
        return bullet ? (
          <p key={i} className="flex gap-2">
            <span aria-hidden className="text-brand">
              •
            </span>
            <span>{bold(line.replace(/^[-*•]\s+/, ""))}</span>
          </p>
        ) : (
          <p key={i}>{bold(line)}</p>
        );
      })}
    </div>
  );
}

/**
 * "Explain this section" — calls the explain-section Edge Function (grounded
 * strictly in this section's own text, server-side). The statute text stays
 * visible above; the explanation carries a verify-it disclaimer (decision
 * D-004). Uses fetch so 503 ("being set up") / 429 (daily cap) surface with
 * their friendly messages.
 */
export function AiExplain({ slug, number, act }: { slug: string; number: string; act: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  const explain = async () => {
    setState("loading");
    setMessage("");
    track("ai_explain_requested", { act, number });
    try {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const res = await fetch(`${base}/functions/v1/explain-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: key ?? "" },
        body: JSON.stringify({ slug, number }),
      });
      const data = (await res.json()) as { explanation?: string; error?: string };
      if (!res.ok || !data.explanation) {
        setState("error");
        setMessage(data.error ?? "Couldn’t generate an explanation. Please try again.");
        return;
      }
      setText(data.explanation);
      setState("done");
    } catch {
      setState("error");
      setMessage("Couldn’t reach the explainer. Check your connection and retry.");
    }
  };

  if (state === "done") {
    return (
      <section className="mt-8 rounded-md border border-border bg-surface p-5" aria-label="AI explanation">
        <div className="flex items-center gap-2">
          <span aria-hidden>✨</span>
          <h2 className="text-h3 font-semibold text-text">In plain language</h2>
        </div>
        <div className="mt-3">
          <ExplanationText text={text} />
        </div>
        <p className="mt-4 border-t border-border pt-3 text-micro text-text-faint">
          AI-generated study aid, grounded only in this section’s official text below — always
          verify against it. Not legal advice.
        </p>
      </section>
    );
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={explain}
        disabled={state === "loading"}
        className="lift inline-flex h-11 items-center gap-2 rounded-md border border-brand bg-surface px-5 font-medium text-brand transition-colors hover:bg-bg disabled:opacity-70">
        <span aria-hidden>✨</span>
        {state === "loading" ? "Explaining…" : "Explain this section in plain language"}
      </button>
      {state === "error" ? <p className="mt-2 text-small text-text-muted">{message}</p> : null}
    </div>
  );
}
