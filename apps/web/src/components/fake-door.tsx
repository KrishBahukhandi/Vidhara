"use client";

import { useState } from "react";

import { track } from "@/lib/analytics";
import type { EventName } from "@/lib/analytics";

/**
 * Honest fake door (decision D-010): measures demand for an unbuilt feature
 * with no fake functionality. Copy always says "coming soon"; a click records
 * a vote (fake_door_clicked {feature}) and shows a thank-you. Cross-checked
 * against interviews at Gate G1 before any of these get built.
 */
export function FakeDoor({
  feature,
  title,
  description,
}: {
  feature: "ai_explain" | "daily_mcq" | "offline";
  title: string;
  description: string;
}) {
  const [voted, setVoted] = useState(false);

  return (
    <button
      type="button"
      disabled={voted}
      onClick={() => {
        track("fake_door_clicked" satisfies EventName, { feature });
        setVoted(true);
      }}
      className="flex w-full flex-col items-start gap-1 rounded-md border border-dashed border-border bg-surface p-4 text-left transition-colors hover:border-brand disabled:cursor-default disabled:hover:border-border">
      {voted ? (
        <>
          <span className="text-body font-semibold text-text">Thanks — noted. ✓</span>
          <span className="text-small text-text-muted">
            We build what enough of you ask for. Your vote counts.
          </span>
        </>
      ) : (
        <>
          <span className="flex items-center gap-2 text-body font-semibold text-text">
            {title}
            <span className="rounded-sm bg-border px-1.5 py-0.5 text-micro font-medium text-text-muted">
              Coming soon
            </span>
          </span>
          <span className="text-small text-text-muted">{description} · tap if you want this</span>
        </>
      )}
    </button>
  );
}
