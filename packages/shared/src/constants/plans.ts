/**
 * Plan tiers and quotas (prd.md §15). Server-side enforcement is mandatory —
 * these constants are shared so the app can *display* limits, never to enforce them
 * client-side only (rules.md §17).
 *
 * `null` = unlimited.
 */
export const PLANS = ["free", "plus", "pro"] as const;
export type Plan = (typeof PLANS)[number];

export interface PlanLimits {
  tutorMessagesPerDay: number;
  bookmarksMax: number | null;
  notesMax: number | null;
  offlineDownloads: boolean;
  trialSimulator: boolean;
  draftingAssistant: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    tutorMessagesPerDay: 10,
    bookmarksMax: 50,
    notesMax: 50,
    offlineDownloads: false,
    trialSimulator: false,
    draftingAssistant: false,
  },
  plus: {
    tutorMessagesPerDay: 100,
    bookmarksMax: null,
    notesMax: null,
    offlineDownloads: true,
    trialSimulator: false,
    draftingAssistant: false,
  },
  pro: {
    tutorMessagesPerDay: 300,
    bookmarksMax: null,
    notesMax: null,
    offlineDownloads: true,
    trialSimulator: true,
    draftingAssistant: true,
  },
};

/** Quota day boundary is IST midnight (the user base's day), not UTC. */
export const QUOTA_TIMEZONE = "Asia/Kolkata";
