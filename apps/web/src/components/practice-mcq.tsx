"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { McqCard, type Mcq } from "@/components/mcq-card";
import { track } from "@/lib/analytics";

/**
 * Practice mode: unlimited auto-generated questions, one after another, with a
 * running session score. Questions come from the same grounded engine as the
 * Daily question (real mappings only); `exclude` carries recently-seen ids so a
 * session doesn't repeat itself.
 */
export function PracticeMcq() {
  const [mcq, setMcq] = useState<Mcq | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const seen = useRef<string[]>([]);

  const load = useCallback(async () => {
    setStatus("loading");
    setPicked(null);
    try {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const res = await fetch(`${base}/functions/v1/daily-mcq`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: key ?? "" },
        body: JSON.stringify({ mode: "practice", exclude: seen.current.slice(-60) }),
      });
      const data = (await res.json()) as Mcq;
      if (!res.ok || !data.options) {
        setStatus("error");
        return;
      }
      seen.current.push(data.id);
      setMcq(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
    track("practice_started", {});
  }, [load]);

  const onPick = (i: number) => {
    if (picked !== null || !mcq) return;
    setPicked(i);
    const correct = i === mcq.answerIndex;
    setScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }));
    track("practice_answered", { correct, type: mcq.type, index: score.total + 1 });
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-small text-text-muted">
          {score.total > 0
            ? `Question ${score.total + (picked !== null ? 0 : 1)}`
            : "Unlimited practice"}
        </p>
        {score.total > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-small font-medium text-text">
            Score {score.right}/{score.total}
          </span>
        ) : null}
      </div>

      {status === "error" ? (
        <div className="mt-4 rounded-lg border border-border bg-surface p-5">
          <p className="text-body text-text-muted">Couldn’t load a question. Please try again.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="lift mt-3 inline-flex h-10 items-center rounded-md border border-brand px-4 font-medium text-brand hover:bg-bg">
            Retry
          </button>
        </div>
      ) : null}

      {status === "loading" && !mcq ? (
        <p className="mt-4 text-body text-text-muted">Loading a question…</p>
      ) : null}

      {mcq && status !== "error" ? (
        <>
          <div className="mt-4">
            <McqCard mcq={mcq} chosen={picked} onPick={onPick} />
          </div>
          {picked !== null ? (
            <button
              type="button"
              onClick={() => void load()}
              disabled={status === "loading"}
              className="lift mt-5 inline-flex h-11 items-center rounded-md bg-brand px-6 font-medium text-on-brand hover:opacity-90 disabled:opacity-70">
              {status === "loading" ? "Loading…" : "Next question →"}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
