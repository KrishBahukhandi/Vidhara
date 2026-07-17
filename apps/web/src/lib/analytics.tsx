"use client";

/**
 * Product analytics — event schema v1 (docs/analytics-plan.md is the contract;
 * changes there bump the version and land here in the same PR).
 *
 * Privacy posture (docs/analytics-plan.md §Privacy): anonymous ids only,
 * cookieless (memory persistence), no PII, no raw search/lookup text.
 * Without NEXT_PUBLIC_POSTHOG_KEY every call is a no-op (console.debug in dev),
 * so local/preview environments never pollute production data.
 */
import posthog from "posthog-js";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

export type EventName =
  | "act_opened"
  | "section_viewed"
  | "mapping_card_viewed"
  | "mapping_lookup"
  | "search_performed"
  | "search_result_clicked"
  | "landing_lookup_submitted"
  | "share_clicked"
  | "feedback_submitted"
  | "bookmark_added"
  | "bookmark_removed"
  | "recents_resumed"
  | "fake_door_clicked"
  | "error_boundary_hit";

/** `section_viewed.via` — every navigation path into a section must thread one. */
export const VIA_VALUES = [
  "search",
  "browse",
  "mapping",
  "deeplink",
  "share",
  "recents",
  "bookmark",
] as const;
export type Via = (typeof VIA_VALUES)[number];

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const COHORT_STORAGE_KEY = "nexlex_cohort";

let initialized = false;

function ensureInit(): boolean {
  if (initialized) return true;
  if (!KEY || typeof window === "undefined") return false;

  posthog.init(KEY, {
    api_host: HOST,
    // Cookieless: no banner burden, ids reset when storage clears — accepted.
    persistence: "memory",
    autocapture: false, // schema'd events only; auto-clicks are noise
    capture_pageview: false, // manual $pageview on route change (SPA-correct)
    capture_pageleave: true,
  });

  // Beta invite links carry ?c=<cohort>; persist so the tag survives navigation.
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("c");
    if (fromUrl) localStorage.setItem(COHORT_STORAGE_KEY, fromUrl);
    const cohort = localStorage.getItem(COHORT_STORAGE_KEY);
    posthog.register({
      platform: "web",
      app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
      ...(cohort ? { cohort } : {}),
    });
  } catch {
    posthog.register({
      platform: "web",
      app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    });
  }

  initialized = true;
  return true;
}

export function track(name: EventName | "$pageview", props?: Record<string, unknown>): void {
  if (!ensureInit()) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[analytics disabled]", name, props ?? {});
    }
    return;
  }
  posthog.capture(name, props);
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    track("$pageview", { path: pathname });
    // searchParams included so shared links with params still register a view
  }, [pathname, searchParams]);
  return null;
}

/** Mount once in the root layout. */
export function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <PageviewTracker />
    </Suspense>
  );
}

function TrackOnMountInner({
  name,
  props,
  readVia,
}: {
  name: EventName;
  props: Record<string, unknown>;
  readVia?: boolean;
}) {
  const searchParams = useSearchParams();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    let merged = props;
    if (readVia) {
      const raw = searchParams.get("via");
      const via: Via = (VIA_VALUES as readonly string[]).includes(raw ?? "")
        ? (raw as Via)
        : "deeplink";
      merged = { ...props, via };
    }
    track(name, merged);
    // fire exactly once per mount — server pages use this as their event hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Fire a schema event when a server-rendered page/segment mounts. */
export function TrackEvent(props: {
  name: EventName;
  props: Record<string, unknown>;
  readVia?: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <TrackOnMountInner {...props} />
    </Suspense>
  );
}
