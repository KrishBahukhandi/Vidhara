"use client";

import { useEffect, useState } from "react";

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
 * "Explain this section" — a floating pill (always visible, pinned above the
 * Feedback pill) that opens the plain-language explanation in a dismissible
 * modal. Grounding is server-side (decision D-004): the client sends only
 * {slug, number}; the model sees only this section's own official text, which
 * stays on the page behind the modal for verification. Fetches on first open,
 * then keeps the result for re-opens.
 */
export function AiExplain({ slug, number, act }: { slug: string; number: string; act: string }) {
  const [open, setOpen] = useState(false);
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

  const onOpen = () => {
    setOpen(true);
    if (state === "idle" || state === "error") explain();
  };

  // Escape closes the modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-label="Explain this section in plain language"
        className="lift fixed bottom-20 right-4 z-40 inline-flex h-11 items-center gap-2 rounded-full bg-brand pl-4 pr-5 text-small font-medium text-on-brand shadow-lg hover:opacity-95 sm:bottom-24 sm:right-6"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <span aria-hidden className="text-body leading-none">
          ✨
        </span>
        Explain
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="AI explanation of this section">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <span aria-hidden>✨</span>
                <h2 className="text-h3 font-semibold text-text">In plain language</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="lift flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-bg hover:text-text">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {state === "loading" ? (
                <p className="flex items-center gap-2 text-body text-text-muted">
                  <span
                    aria-hidden
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent"
                  />
                  Explaining…
                </p>
              ) : null}
              {state === "done" ? <ExplanationText text={text} /> : null}
              {state === "error" ? (
                <div className="space-y-3">
                  <p className="text-body text-text-muted">{message}</p>
                  <button
                    type="button"
                    onClick={explain}
                    className="lift inline-flex h-10 items-center rounded-md border border-brand px-4 font-medium text-brand hover:bg-bg">
                    Try again
                  </button>
                </div>
              ) : null}
            </div>

            {state === "done" ? (
              <p className="border-t border-border px-5 py-3 text-micro text-text-faint">
                AI-generated study aid, grounded only in this section’s official text on this page —
                always verify against it. Not legal advice.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
