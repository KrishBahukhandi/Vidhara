import { createNexlexClient, type NexlexClient } from "@nexlex/db";

/**
 * Stateless anonymous Supabase client for RSC content reads (published-only
 * via RLS). No sessions, no cookies — auth-bearing web surfaces (admin, later)
 * will use @supabase/ssr separately.
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
