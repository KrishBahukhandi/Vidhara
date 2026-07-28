"use client";

/**
 * Requesting an email hearing reminder (D-030).
 *
 * This is the ONE path by which anything from the case diary leaves the
 * device, so it is deliberately narrow: an address, the hearing date, and a
 * label the advocate writes themselves. Notes, case number, court and attached
 * sections are never sent. RLS allows anon INSERT only — nothing here can read
 * another advocate's reminders back.
 */
import { remindDateFor } from "@/lib/case-diary";
import { getBrowserClient } from "@/lib/supabase-browser";

export interface ReminderRequest {
  email: string;
  /** Whatever the advocate chose to be reminded by — their words. */
  label: string;
  /** ISO date (YYYY-MM-DD). */
  hearingOn: string;
}

export async function requestReminder(
  req: ReminderRequest,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = req.email.trim();
  const label = req.label.trim();
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "That doesn't look like an email address." };
  }
  if (!label) return { ok: false, error: "Give the reminder a label." };
  if (!req.hearingOn) return { ok: false, error: "Set a hearing date first." };

  const db = getBrowserClient();
  if (!db) return { ok: false, error: "Reminders are unavailable right now." };

  const { error } = await db.from("hearing_reminders").insert({
    email,
    label: label.slice(0, 120),
    hearing_on: req.hearingOn,
    remind_on: remindDateFor(req.hearingOn),
  });
  if (error) return { ok: false, error: "Couldn't set that reminder. Please try again." };
  return { ok: true };
}
