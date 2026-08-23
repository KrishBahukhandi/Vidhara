/**
 * Product analytics — mobile.
 *
 * Event names mirror the web schema (docs/analytics-plan.md) so both surfaces
 * report the same things. Sends to the same PostHog project as the web, so a
 * reader who uses both is one project's data rather than two.
 *
 * DEV NEVER SENDS. In development the event is logged and dropped, which keeps
 * founder and simulator traffic out of a beta cohort's numbers — the same
 * posture as the web client, which gates on hostname.
 *
 * Persistence is PostHog's default (AsyncStorage), so a distinct_id survives
 * restarts and returning users are recognisable. That is deliberate and it is
 * worth knowing that the WEB client does NOT do this — it runs
 * `persistence: "memory"`, so its ids reset on every page load and its
 * retention cannot be measured. Until that is settled, Weekly Returning
 * Readers is measurable on Android and not on the web.
 *
 * posthog-react-native adds no native module here: every one of its peer
 * dependencies is optional and AsyncStorage was already installed. It has still
 * never been compiled into a device build, so treat the first `expo run:android`
 * as the check.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import PostHog from "posthog-react-native";
export type EventName =
  | "screen_viewed"
  | "section_viewed"
  | "mapping_card_viewed"
  | "mapping_lookup"
  | "search_performed"
  | "search_result_clicked"
  | "share_clicked"
  | "feedback_submitted"
  | "ai_explain_requested"
  | "daily_mcq_viewed"
  | "daily_mcq_answered"
  | "practice_started"
  | "practice_answered"
  | "ask_ai_assisted"
  | "limitation_computed"
  | "limitation_saved_to_case"
  | "diary_document_attached"
  | "diary_case_added"
  | "diary_case_opened"
  | "diary_hearing_logged"
  | "bookmark_added"
  | "bookmark_removed"
  | "recents_resumed"
  | "fake_door_clicked";

declare const __DEV__: boolean;

// Publishable, write-only project key — safe in the bundle and in git, same as
// the web client's. Env vars override for rotation or a different region.
const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "phc_Am2qAgBZhg3ca6ZpC3Rx2wk6nrVo5qARkyx8tGZxHcqX";
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const COHORT_STORAGE_KEY = "vidhara_cohort";

const isDev = typeof __DEV__ !== "undefined" && __DEV__;

let client: PostHog | null = null;
let initStarted = false;

function ensureClient(): PostHog | null {
  if (isDev || !KEY) return null;
  if (!initStarted) {
    initStarted = true;
    client = new PostHog(KEY, {
      host: HOST,
      // Schema'd events only — autocapture is noise, and the web client is
      // configured the same way so the two datasets stay comparable.
      captureAppLifecycleEvents: true,
      disableGeoip: false,
    });
    client.register({ platform: "android", app_version: appVersion() });
    // A beta cohort tag set on this device (see setCohort) rides on every
    // event, mirroring the web's ?c=<cohort> super property.
    void AsyncStorage.getItem(COHORT_STORAGE_KEY).then((cohort) => {
      if (cohort) client?.register({ cohort });
    });
  }
  return client;
}

function appVersion(): string {
  return process.env.EXPO_PUBLIC_APP_VERSION ?? "dev";
}

/**
 * Tag this install with a beta cohort, so its events can be segmented the way
 * the web's `?c=beta-1` links are. Persisted, because a cohort is a property of
 * the person, not the session.
 */
export async function setCohort(cohort: string): Promise<void> {
  const trimmed = cohort.trim().slice(0, 40);
  if (!trimmed) return;
  await AsyncStorage.setItem(COHORT_STORAGE_KEY, trimmed);
  ensureClient()?.register({ cohort: trimmed });
}

export function track(name: EventName, props?: Record<string, unknown>): void {
  if (isDev) {
    console.log("[analytics]", name, props ?? {});
    return;
  }
  // PostHog's property type is JSON-only. Every call site already passes
  // JSON-safe values, but coercing here rather than widening the public
  // signature keeps `track` usable from screens without them importing
  // PostHog's types — and drops anything that would not serialise instead of
  // throwing inside a capture.
  ensureClient()?.capture(name, toJsonProps(props));
}

function toJsonProps(props?: Record<string, unknown>): Record<string, string | number | boolean | null> | undefined {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    } else if (v !== undefined) {
      out[k] = String(v);
    }
  }
  return out;
}
