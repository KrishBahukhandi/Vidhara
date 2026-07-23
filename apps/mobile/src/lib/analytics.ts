/**
 * Product analytics — mobile.
 *
 * STUB for now: logs in dev, no-ops in release. The event names mirror the web
 * schema (docs/analytics-plan.md) so screens fire the same events. Before the
 * Android beta cohort, wire posthog-react-native here (one file) — everything
 * that calls track() is already in place. Deliberately NOT added yet: a native
 * analytics module would complicate the founder's first on-device build.
 */
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
  | "bookmark_added"
  | "bookmark_removed"
  | "recents_resumed"
  | "fake_door_clicked";

declare const __DEV__: boolean;

export function track(name: EventName, props?: Record<string, unknown>): void {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.log("[analytics]", name, props ?? {});
  }
  // TODO(beta): posthog.capture(name, props) via posthog-react-native.
}
