"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { McqCard, type Mcq } from "@/components/mcq-card";
import { track } from "@/lib/analytics";
import { useDailyMcq } from "@/lib/local-library";
import { SITE_URL } from "@/lib/site";

/** Today's one question — the habit anchor. Practice mode lives at /practice. */
export function DailyMcq() {
  const [mcq, setMcq] = useState<Mcq | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [picked, setPicked] = useState<number | null>(null);
  const viewed = useRef(false);

  const { streak, todayChoice, submit } = useDailyMcq(mcq?.date ?? null);

  useEffect(() => {
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const res = await fetch(`${base}/functions/v1/daily-mcq`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: key ?? "" },
          body: JSON.stringify({ mode: "daily" }),
        });
        const data = (await res.json()) as Mcq;
        if (!res.ok || !data.options) {
          setStatus("error");
          return;
        }
        setMcq(data);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    })();
  }, []);

  useEffect(() => {
    if (mcq && !viewed.current) {
      viewed.current = true;
      track("daily_mcq_viewed", { date: mcq.date, type: mcq.type });
    }
  }, [mcq]);

  if (status === "loading") {
    return <p className="mt-8 text-body text-text-muted">Loading today’s question…</p>;
  }
  if (status === "error" || !mcq) {
    return (
      <p className="mt-8 text-body text-text-muted">
        Couldn’t load today’s question. Please refresh in a moment.
      </p>
    );
  }

  const chosen = picked ?? todayChoice;

  const onPick = (i: number) => {
    if (chosen !== null) return;
    setPicked(i);
    const correct = i === mcq.answerIndex;
    submit(i, correct);
    track("daily_mcq_answered", { correct, date: mcq.date, type: mcq.type });
  };

  const shareText = `Can you crack today’s old-law → new-law quiz on Vidhara? ${SITE_URL}/daily`;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-small text-text-muted">
          {new Date(`${mcq.date}T00:00:00Z`).toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        {streak > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-small font-medium text-text">
            🔥 {streak}-day streak
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <McqCard mcq={mcq} chosen={chosen} onPick={onPick} />
      </div>

      {chosen !== null ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/practice"
            className="lift inline-flex h-11 items-center rounded-md bg-brand px-5 font-medium text-on-brand hover:opacity-90">
            Keep practising →
          </Link>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="lift inline-flex h-11 items-center rounded-md border border-border px-4 font-medium text-text-muted hover:text-text">
            Share
          </a>
          <p className="text-small text-text-faint">New question tomorrow. 👋</p>
        </div>
      ) : null}
    </div>
  );
}
