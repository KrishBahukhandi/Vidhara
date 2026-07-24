"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { track } from "@/lib/analytics";
import { useDailyMcq } from "@/lib/local-library";
import { SITE_URL } from "@/lib/site";

interface Mcq {
  date: string;
  prompt: string;
  oldRef: string;
  oldNote: string;
  options: string[];
  answerIndex: number;
  answer: string;
  explanation: string;
  sourceSlug: string;
  sourceNumber: string;
  mappingType: string;
}

const LETTERS = ["A", "B", "C", "D"];

export function DailyMcq() {
  const [mcq, setMcq] = useState<Mcq | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [picked, setPicked] = useState<number | null>(null);
  const viewed = useRef(false);

  const { streak, answeredToday, todayChoice, todayCorrect, submit } = useDailyMcq(mcq?.date ?? null);

  useEffect(() => {
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const res = await fetch(`${base}/functions/v1/daily-mcq`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: key ?? "" },
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
      track("daily_mcq_viewed", { date: mcq.date });
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

  const chosen = picked ?? todayChoice; // this session, else restored from storage
  const answered = chosen != null;
  const isCorrect = answered ? chosen === mcq.answerIndex : (todayCorrect ?? false);

  const onPick = (i: number) => {
    if (answered) return;
    setPicked(i);
    const correct = i === mcq.answerIndex;
    submit(i, correct);
    track("daily_mcq_answered", { correct, date: mcq.date, mapping_type: mcq.mappingType });
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

      <div className="mt-4 rounded-lg border border-border bg-surface p-5 sm:p-6">
        <p className="text-body text-text-muted">{mcq.prompt}</p>
        <p className="mt-2 font-serif text-h2 font-semibold text-text">{mcq.oldRef}</p>
        <p className="text-body text-text-muted">{mcq.oldNote}</p>

        <div className="mt-5 grid gap-3">
          {mcq.options.map((opt, i) => {
            const isAnswer = i === mcq.answerIndex;
            const isChosen = i === chosen;
            let cls = "border-border bg-bg hover:border-brand";
            if (answered) {
              if (isAnswer) cls = "border-success bg-surface";
              else if (isChosen) cls = "border-danger bg-surface";
              else cls = "border-border bg-surface opacity-60";
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => onPick(i)}
                disabled={answered}
                className={`lift flex items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors ${cls} ${
                  answered ? "cursor-default" : "cursor-pointer"
                }`}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-small font-medium text-text-muted">
                  {LETTERS[i]}
                </span>
                <span className="font-medium text-text">{opt}</span>
                {answered && isAnswer ? <span className="ml-auto text-success">✓</span> : null}
                {answered && isChosen && !isAnswer ? (
                  <span className="ml-auto text-danger">✗</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {answered ? (
          <div className="mt-5 border-t border-border pt-4">
            <p className={`text-body font-semibold ${isCorrect ? "text-success" : "text-danger"}`}>
              {isCorrect ? "Correct!" : `Not quite — the answer is ${mcq.answer}.`}
            </p>
            <p className="mt-2 text-body text-text-muted">{mcq.explanation}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={`/acts/${mcq.sourceSlug}/${encodeURIComponent(mcq.sourceNumber)}?via=mapping`}
                className="lift inline-flex h-10 items-center rounded-md border border-brand px-4 font-medium text-brand hover:bg-bg">
                Read {mcq.oldRef} →
              </Link>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="lift inline-flex h-10 items-center rounded-md border border-border px-4 font-medium text-text-muted hover:text-text">
                Share
              </a>
            </div>
            <p className="mt-4 text-small text-text-faint">A new question drops every day. See you tomorrow. 👋</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
