"use client";

import { createNexlexClient, type NexlexClient } from "@nexlex/db";

/**
 * Browser client. Reads published content and inserts feedback under the anon
 * role; carries a session once the reader signs in (D-065), after which the
 * same requests arrive as `authenticated`.
 *
 * `persistSession` was false until web sign-in existed. Turning it on changes
 * the Postgres role on every request, so each RLS policy the browser touches
 * has to admit `authenticated` as well as `anon` — content and feedback
 * already did; `hearing_reminders` did not, and migration 0016 fixes it.
 *
 * `detectSessionInUrl` stays false: sign-in is a one-time code exchanged in the
 * page, never a callback link, so there is no fragment to parse — and leaving
 * it on would have the client inspect every URL for tokens it will never find.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: NexlexClient | null = null;

export function getBrowserClient(): NexlexClient | null {
  if (!url || !anonKey) return null;
  client ??= createNexlexClient(url, anonKey, {
    persistSession: true,
    detectSessionInUrl: false,
  });
  return client;
}
