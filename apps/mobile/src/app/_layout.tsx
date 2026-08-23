import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";

import { initCrashReporting } from "@/lib/sentry";
import { SessionProvider, useSession } from "@/providers/session-provider";
import { useTheme } from "@/theme";

SplashScreen.preventAutoHideAsync();

// Before anything else renders, so a crash during the first paint is still
// reported. Inert without a DSN.
initCrashReporting();

function RootNavigator() {
  const { isLoading } = useSession();
  const { colors } = useTheme();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null; // splash stays up until the persisted session is restored

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="auto" />
      <RootNavigator />
    </SessionProvider>
  );
}
