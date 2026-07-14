import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./database.types";

export type NexlexClient = SupabaseClient<Database>;

export interface NexlexClientOptions {
  /** Platform storage adapter (SecureStore on the app; cookies handled separately on web SSR). */
  storage?: {
    getItem: (key: string) => Promise<string | null> | string | null;
    setItem: (key: string, value: string) => Promise<void> | void;
    removeItem: (key: string) => Promise<void> | void;
  };
  /** Disable session detection in URLs (true on native, where deep links are handled manually). */
  detectSessionInUrl?: boolean;
}

/**
 * Typed Supabase client factory. Both apps create their client through this so the
 * Database type (and future global fetch/telemetry hooks) stay in one place.
 * Only the anon (publishable) key ever reaches a client bundle — rules.md §11.
 */
export function createNexlexClient(
  url: string,
  anonKey: string,
  options: NexlexClientOptions = {},
): NexlexClient {
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: options.detectSessionInUrl ?? false,
      ...(options.storage ? { storage: options.storage } : {}),
    },
  });
}
