import { createNexlexClient, type NexlexClient } from "@nexlex/db";

/**
 * Stateless anonymous Supabase client for RSC content reads (published-only
 * via RLS). No sessions, no cookies.
 *
 * Sign-in (D-065) deliberately did NOT change this. The session lives in the
 * browser only, so every server render is anonymous and every page is
 * cacheable — which is why useSession has a real "loading" state rather than
 * the server knowing who you are. Server-rendered personalisation would need
 * @supabase/ssr and cookie-bound sessions; nothing needs it yet.
 *
 * Env may be absent in CI builds: pages must degrade to empty shells there
 * (queries.ts guards on `isContentConfigured`).
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isContentConfigured = Boolean(url && anonKey);

let client: NexlexClient | null = null;

export function getServerClient(): NexlexClient {
  if (!isContentConfigured) {
    throw new Error("Supabase env missing — guard calls with isContentConfigured");
  }
  client ??= createNexlexClient(url as string, anonKey as string, {
    persistSession: false,
    detectSessionInUrl: false,
  });
  return client;
}
