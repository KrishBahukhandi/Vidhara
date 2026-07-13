import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNexlexClient } from "@nexlex/db";

import { env } from "./env";

/**
 * Single Supabase client for the app. Session persists in AsyncStorage
 * (Supabase's documented Expo pattern; session JSON exceeds SecureStore's 2KB
 * value limit). detectSessionInUrl stays false on native — deep links are
 * handled explicitly when OAuth lands (Phase 0 uses email OTP only).
 */
export const supabase = createNexlexClient(env.supabaseUrl, env.supabaseAnonKey, {
  storage: AsyncStorage,
  detectSessionInUrl: false,
});
