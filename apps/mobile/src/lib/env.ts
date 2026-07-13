/**
 * Client-safe environment access. EXPO_PUBLIC_* vars are inlined at build time.
 * Only publishable values belong here (rules.md §11).
 *
 * Missing values degrade gracefully (placeholders + console warning) so the shell
 * runs before the Supabase project exists; auth actions then fail with a visible,
 * friendly error instead of crashing at import time.
 */
export const isSupabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase env vars missing — running in unconfigured mode. " +
      "Copy .env.example values into apps/mobile/.env to enable auth.",
  );
}

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_placeholder",
};
