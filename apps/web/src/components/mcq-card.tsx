"use client";

import Link from "next/link";

export interface Mcq {
  id: string;
  type: "forward" | "reverse" | "subject";
  date: string;
  prompt: string;
  subject: string;
  subjectNote: string;
  options: string[];
  answerIndex: number;
  answer: string;
  explanation: string;
  readSlug: string;
  readNumber: string;
  readLabel: string;
  mappingType: string;
}

const LETTERS = ["A", "B", "C", "D"];

/**
 * One quiz question — shared by the Daily question and Practice mode.
 * Purely presentational: the parent owns the answer state (daily locks to one
 * per day; practice advances to the next question).
 */
export function McqCard({
  mcq,
  chosen,
  onPick,
}: {
  mcq: Mcq;
  chosen: number | null;
  onPick: (i: number) => void;
}) {
  const answered = chosen !== null;
  const isCorrect = answered && chosen === mcq.answerIndex;

  return (
    <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
      <p className="text-body text-text-muted">{mcq.prompt}</p>
      <p className="mt-2 font-serif text-h2 font-semibold text-text">{mcq.subject}</p>
      <p className="text-body text-text-muted">{mcq.subjectNote}</p>

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
          <Link
            href={`/acts/${mcq.readSlug}/${encodeURIComponent(mcq.readNumber)}?via=mapping`}
            className="lift mt-4 inline-flex h-10 items-center rounded-md border border-brand px-4 font-medium text-brand hover:bg-bg">
            Read {mcq.readLabel} →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
