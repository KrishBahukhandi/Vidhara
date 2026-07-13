import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createNexlexClient } from "@nexlex/db";

import { env } from "./env";

/**
 * Single Supabase client for the app.
 *
 * Native: session persists in AsyncStorage (Supabase's documented Expo pattern;
 * session JSON exceeds SecureStore's 2KB value limit).
 * Web (expo-router SSR + browser): omit storage so supabase-js uses its own
 * SSR-safe default — AsyncStorage's web shim touches `window` at call time and
 * crashes the Node prerender.
 */
export const supabase = createNexlexClient(env.supabaseUrl, env.supabaseAnonKey, {
  ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
  detectSessionInUrl: false,
});
