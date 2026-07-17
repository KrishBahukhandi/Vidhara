"use client";

import { useEffect } from "react";

import { recordRecent } from "@/lib/local-library";

/** Invisible: records a section view into local recents on mount. */
export function RecordRecent({
  act,
  slug,
  number,
  note,
}: {
  act: string;
  slug: string;
  number: string;
  note: string;
}) {
  useEffect(() => {
    recordRecent({ act, slug, number, note });
  }, [act, slug, number, note]);
  return null;
}
