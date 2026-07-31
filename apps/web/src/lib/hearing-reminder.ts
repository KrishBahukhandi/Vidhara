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

/**
 * Whether the mailer can actually send. Asked before the reminder form is
 * offered at all: the sender needs SMTP credentials that are not configured
 * yet, and without this check the form succeeded, stored the address and sent
 * nothing — an advocate who trusted it would have missed a hearing. Answered by
 * the function itself rather than a build-time flag, so the feature switches on
 * the moment the credentials exist, with no redeploy.
 *
 * Cached per page load; a failure is treated as "not configured", because the
 * safe default is to promise nothing.
 */
let configuredPromise: Promise<boolean> | null = null;

export function remindersConfigured(): Promise<boolean> {
  configuredPromise ??= (async () => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!base || !key) return false;
    try {
      const res = await fetch(`${base}/functions/v1/hearing-reminders?action=status`, {
        headers: { apikey: key },
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { configured?: boolean };
      return Boolean(data.configured);
    } catch {
      return false;
    }
  })();
  return configuredPromise;
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

  // Never bank an address the mailer cannot use. Storing it would be both a
  // promise we can't keep and personal data collected for no purpose.
  if (!(await remindersConfigured())) {
    return { ok: false, error: "Email reminders aren't switched on yet." };
  }

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
