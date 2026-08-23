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
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

export type EventName =
  | "act_opened"
  | "schedule_opened"
  | "section_viewed"
  | "mapping_card_viewed"
  | "mapping_lookup"
  | "search_performed"
  | "search_result_clicked"
  | "landing_lookup_submitted"
  | "share_clicked"
  | "feedback_submitted"
  | "ai_explain_requested"
  | "daily_mcq_viewed"
  | "daily_mcq_answered"
  | "practice_started"
  | "practice_answered"
  | "ask_ai_assisted"
  | "limitation_opened"
  | "limitation_computed"
  | "limitation_saved_to_case"
  | "quick_cite_lookup"
  | "quick_cite_copied"
  | "diary_case_added"
  | "diary_section_attached"
  | "diary_exported"
  | "reminder_requested"
  | "diary_hearing_logged"
  | "bookmark_added"
  | "bookmark_removed"
  | "recents_resumed"
  | "fake_door_clicked"
  | "sign_in_code_requested"
  | "signed_in"
  | "signed_out"
  | "onboarding_completed"
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

// PostHog project API key — a PUBLISHABLE, write-only key (safe in client JS
// and in git; it can't read data). Env vars override for rotation/region.
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "phc_Am2qAgBZhg3ca6ZpC3Rx2wk6nrVo5qARkyx8tGZxHcqX";
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const COHORT_STORAGE_KEY = "vidhara_cohort";

/**
 * Only send analytics from the real deployed site — never from localhost (the
 * dev server + the preview browser) or Vercel preview builds. Keeps founder/
 * agent testing out of the beta cohort's data. Toggle a preview on by setting
 * NEXT_PUBLIC_POSTHOG_KEY there explicitly if ever needed.
 */
function isAnalyticsHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".local");
}

/**
 * PostHog is loaded on demand, not imported at module scope, and from the
 * `slim` build rather than the default one. Two separate wins:
 *
 *  - `slim` drops session recording, surveys, autocapture and web-vitals — none
 *    of which we enable — halving the library (231 KB → 121 KB raw).
 *  - The dynamic `import()` puts what remains in its own chunk that no longer
 *    downloads or parses before first paint. Analytics is the least urgent
 *    thing on a page whose job is to show a statute; it now loads after the
 *    first event wants it, which is post-hydration by construction.
 *
 * Events fired before the chunk lands are queued, not dropped.
 */
type PostHogClient = import("posthog-js/dist/module.slim.no-external").PostHog;

let client: PostHogClient | null = null;
let loadStarted = false;
// Bounded: if the chunk never arrives (blocked, offline) this must not grow
// without limit on a long session.
const MAX_QUEUED = 50;
const queued: Array<[string, Record<string, unknown> | undefined]> = [];

function isEnabled(): boolean {
  return Boolean(KEY) && typeof window !== "undefined" && isAnalyticsHost();
}

function load(): void {
  if (loadStarted) return;
  loadStarted = true;

  void import("posthog-js/dist/module.slim.no-external")
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        // Cookieless: no banner burden, ids reset when storage clears — accepted.
        persistence: "memory",
        autocapture: false, // schema'd events only; auto-clicks are noise
        capture_pageview: false, // manual $pageview on route change (SPA-correct)
        capture_pageleave: true,
        person_profiles: "identified_only", // we never identify() — no anon person profiles (privacy + cost)
      });

      // Beta invite links carry ?c=<cohort>; persist so the tag survives navigation.
      let cohort: string | null = null;
      try {
        const fromUrl = new URLSearchParams(window.location.search).get("c");
        if (fromUrl) localStorage.setItem(COHORT_STORAGE_KEY, fromUrl);
        cohort = localStorage.getItem(COHORT_STORAGE_KEY);
      } catch {
        // Storage blocked — the cohort tag is optional, the rest is not.
      }
      posthog.register({
        platform: "web",
        app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
        ...(cohort ? { cohort } : {}),
      });

      client = posthog;
      for (const [name, props] of queued) posthog.capture(name, props);
      queued.length = 0;
    })
    .catch(() => {
      // Chunk failed to load. Analytics is not worth a broken page, and the
      // queue must not pin memory for the rest of the session.
      queued.length = 0;
    });
}

export function track(name: EventName | "$pageview", props?: Record<string, unknown>): void {
  if (!isEnabled()) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[analytics disabled]", name, props ?? {});
    }
    return;
  }
  if (client) {
    client.capture(name, props);
    return;
  }
  if (queued.length < MAX_QUEUED) queued.push([name, props]);
  load();
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
