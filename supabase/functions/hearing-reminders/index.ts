// hearing-reminders — the scheduled mailer for the advocate case diary (D-030).
//
// THREE ENTRY POINTS
//   POST (secret-gated)            run the daily job: send confirmations, then
//                                  send whatever reminders are due.
//   GET  ?action=confirm&token=…   double opt-in: activate an address.
//   GET  ?action=unsubscribe&token=…  stop all mail to that address.
//
// PRIVACY: the diary is local-only (D-029). This function only ever sees what
// the advocate explicitly opted to upload per case — an address, a date and a
// label they wrote themselves. Notes, case numbers and attached sections never
// reach the server, so they can't leak from here.
//
// SMTP IS NOT WIRED YET. Everything below is complete and inert: with no
// SMTP_* secrets the job reports { configured: false } and sends nothing, so
// it can be scheduled today and starts working the moment the founder adds the
// credentials — no redeploy. sendEmail() is the single swap point if a
// transactional API (Resend/Postmark) is preferred over raw SMTP.
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SMTP_HOST = Deno.env.get("SMTP_HOST");
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "465");
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");
const SMTP_FROM = Deno.env.get("SMTP_FROM") ?? SMTP_USER ?? "";
/** Shared secret so only our scheduler can trigger a send run. */
const CRON_SECRET = Deno.env.get("REMINDERS_CRON_SECRET");
/** Public base URL used to build confirm/unsubscribe links. */
const FN_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/hearing-reminders`;
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://vidhara-web-lyart.vercel.app";
/** Belt-and-braces cap so a bug can never blast the mail account. */
const MAX_PER_RUN = Number(Deno.env.get("REMINDERS_MAX_PER_RUN") ?? "200");

const smtpConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_FROM);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const IST_OFFSET_MS = 5.5 * 3600 * 1000;
/** Today in IST — hearing dates are Indian local dates. */
function istToday(): string {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The one place that talks to a mail provider — swap this body to move from
 * SMTP to Resend/Postmark without touching any of the logic above or below.
 */
async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
  if (!smtpConfigured) throw new Error("SMTP not configured");
  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST!,
      port: SMTP_PORT,
      tls: SMTP_PORT === 465,
      auth: { username: SMTP_USER!, password: SMTP_PASS! },
    },
  });
  try {
    await client.send({ from: SMTP_FROM, to, subject, content: text, html });
  } finally {
    await client.close();
  }
}

function shell(title: string, body: string): string {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:34rem;margin:12vh auto;padding:0 1.5rem;color:#1a1a1a">
  <h1 style="font-size:1.5rem;margin:0 0 .5rem">${escapeHtml(title)}</h1>
  <p style="color:#555;line-height:1.6;margin:0 0 1.5rem">${body}</p>
  <a href="${SITE_URL}/diary" style="display:inline-block;background:#1E3A5F;color:#fff;text-decoration:none;padding:.7rem 1.2rem;border-radius:.4rem">Open your case diary</a>
</div>`;
}

const html = (title: string, body: string, status = 200) =>
  new Response(shell(title, body), {
    status,
    headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    // ── Link handling: confirm / unsubscribe ──────────────────────────────
    if (req.method === "GET") {
      const url = new URL(req.url);
      const action = url.searchParams.get("action");
      const token = url.searchParams.get("token");
      if (!action || !token) return html("Invalid link", "That link is missing information.", 400);

      if (action === "confirm") {
        const { data, error } = await db
          .from("hearing_reminders")
          .update({ confirmed_at: new Date().toISOString() })
          .eq("confirm_token", token)
          .is("confirmed_at", null)
          .select("email")
          .maybeSingle();
        if (error) return html("Something went wrong", "Please try again in a moment.", 500);
        if (!data) {
          // Already confirmed, or a stale token — say so without leaking whether
          // the address exists.
          return html("You're all set", "This link has already been used.");
        }
        // One confirmation activates every pending reminder for that address.
        await db
          .from("hearing_reminders")
          .update({ confirmed_at: new Date().toISOString() })
          .eq("email", data.email)
          .is("confirmed_at", null);
        return html(
          "Reminders confirmed",
          "We'll email you the evening before each hearing you've added. You can unsubscribe from any of those emails.",
        );
      }

      if (action === "unsubscribe") {
        const { data } = await db
          .from("hearing_reminders")
          .select("email")
          .eq("unsubscribe_token", token)
          .maybeSingle();
        if (data?.email) await db.from("hearing_reminders").delete().eq("email", data.email);
        return html(
          "Unsubscribed",
          "No more hearing reminders will be sent to that address. Your case diary itself is untouched — it lives on your device.",
        );
      }

      return html("Invalid link", "That link isn't valid.", 400);
    }

    // ── Scheduled run ─────────────────────────────────────────────────────
    if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

    if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
      return json({ error: "unauthorized" }, 401);
    }
    if (!smtpConfigured) {
      // Inert until the founder adds SMTP — schedule it now, it starts working
      // by itself the moment the secrets exist.
      return json({ configured: false, message: "SMTP not configured; nothing sent." });
    }

    const today = istToday();
    let confirmationsSent = 0;
    let remindersSent = 0;
    const failures: string[] = [];

    // 1) Confirmation emails for addresses we haven't verified yet.
    const { data: pending } = await db
      .from("hearing_reminders")
      .select("id, email, confirm_token, unsubscribe_token")
      .is("confirmed_at", null)
      .is("confirm_sent_at", null)
      .limit(MAX_PER_RUN);

    for (const r of pending ?? []) {
      const confirmUrl = `${FN_URL}?action=confirm&token=${r.confirm_token}`;
      try {
        await sendEmail(
          r.email,
          "Confirm your Vidhara hearing reminders",
          shell(
            "Confirm your hearing reminders",
            `Someone (hopefully you) asked Vidhara to email hearing reminders to this address.
             <br><br><a href="${confirmUrl}">Confirm reminders</a>
             <br><br>If this wasn't you, ignore this email — nothing will be sent.`,
          ),
          `Confirm your Vidhara hearing reminders: ${confirmUrl}\n\nIf this wasn't you, ignore this email — nothing will be sent.`,
        );
        await db
          .from("hearing_reminders")
          .update({ confirm_sent_at: new Date().toISOString() })
          .eq("id", r.id);
        confirmationsSent++;
      } catch (e) {
        failures.push(`confirm ${r.id}: ${(e as Error).message}`);
      }
    }

    // 2) Reminders that are due, confirmed, and not yet sent.
    const { data: due } = await db
      .from("hearing_reminders")
      .select("id, email, label, hearing_on, unsubscribe_token")
      .not("confirmed_at", "is", null)
      .is("sent_at", null)
      .lte("remind_on", today)
      .limit(MAX_PER_RUN);

    for (const r of due ?? []) {
      const unsubUrl = `${FN_URL}?action=unsubscribe&token=${r.unsubscribe_token}`;
      const when = new Date(`${r.hearing_on}T00:00:00Z`).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      });
      try {
        await sendEmail(
          r.email,
          `Hearing ${when}: ${r.label}`,
          shell(
            `Hearing on ${escapeHtml(when)}`,
            `<strong>${escapeHtml(r.label)}</strong><br><br>
             This is your reminder from Vidhara.
             <br><br><a href="${unsubUrl}" style="color:#777;font-size:.85rem">Unsubscribe from reminders</a>`,
          ),
          `Hearing on ${when}\n\n${r.label}\n\nReminder from Vidhara.\nUnsubscribe: ${unsubUrl}`,
        );
        await db
          .from("hearing_reminders")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", r.id);
        remindersSent++;
      } catch (e) {
        failures.push(`reminder ${r.id}: ${(e as Error).message}`);
      }
    }

    if (failures.length) console.error("hearing-reminders failures:", failures.join(" | "));
    return json({
      configured: true,
      date: today,
      confirmationsSent,
      remindersSent,
      failed: failures.length,
    });
  } catch (e) {
    console.error("hearing-reminders error:", (e as Error).message);
    return json({ error: "unexpected error" }, 500);
  }
});
