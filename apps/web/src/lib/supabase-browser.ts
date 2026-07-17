"use client";

import { createNexlexClient, type NexlexClient } from "@nexlex/db";

/**
 * Anonymous browser client — feedback INSERTs only for now (RLS: the anon
 * role can insert into public.feedback and read published content, nothing
 * else). No sessions.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: NexlexClient | null = null;

export function getBrowserClient(): NexlexClient | null {
  if (!url || !anonKey) return null;
  client ??= createNexlexClient(url, anonKey, {
    persistSession: false,
    detectSessionInUrl: false,
  });
  return client;
}
