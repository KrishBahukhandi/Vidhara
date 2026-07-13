import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useEffect, useState } from "react";

import { getMyProfile } from "@/features/profile/api";
import { isSupabaseConfigured } from "@/lib/env";
import { useSession } from "@/providers/session-provider";
import { useTheme } from "@/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; title: string; icon: IconName; iconFocused: IconName }[] = [
  { name: "library", title: "Library", icon: "book-outline", iconFocused: "book" },
  { name: "mapping", title: "Mapping", icon: "swap-horizontal-outline", iconFocused: "swap-horizontal" },
  { name: "tutor", title: "Tutor", icon: "school-outline", iconFocused: "school" },
  { name: "notes", title: "Notes", icon: "create-outline", iconFocused: "create" },
  { name: "profile", title: "Profile", icon: "person-outline", iconFocused: "person" },
];

export default function TabsLayout() {
  const { session } = useSession();
  const { colors } = useTheme();
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(
    isSupabaseConfigured ? null : false, // unconfigured dev mode: skip the check, show the shell
  );

  useEffect(() => {
    if (!session || !isSupabaseConfigured) return;
    getMyProfile().then((result) => {
      setNeedsOnboarding(result.ok ? result.data.onboarded_at === null : false);
    });
  }, [session]);

  if (!session && isSupabaseConfigured) return <Redirect href="/(auth)/sign-in" />;
  if (needsOnboarding === null) return null;
  if (needsOnboarding) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}>
      {TABS.map(({ name, title, icon, iconFocused }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? iconFocused : icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
