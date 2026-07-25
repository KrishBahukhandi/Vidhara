import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Screen } from "@/components/ui/screen";
import { istToday, useDailyMcq } from "@/lib/local-library";
import { radius, sp, useTheme } from "@/theme";

/**
 * Quiz hub — the two study modes in one place. (Replaced the old "Tutor"
 * placeholder tab, which promised an AI tutor we deliberately did not build:
 * the shipped AI is a grounded explainer + librarian, never an answer bot,
 * D-023.)
 */
export default function QuizScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { streak, answeredToday } = useDailyMcq(istToday());

  const cards = [
    {
      key: "daily",
      icon: "today-outline" as const,
      title: "Daily Quiz",
      body: answeredToday
        ? "Answered today — come back tomorrow for a new one"
        : "One old → new law question, same for everyone",
      badge: streak > 0 ? `🔥 ${streak}` : answeredToday ? "Done" : "New",
      onPress: () => router.push("/daily"),
    },
    {
      key: "practice",
      icon: "infinite-outline" as const,
      title: "Practice",
      body: "Unlimited questions — old→new, new→old and topic→section",
      badge: null as string | null,
      onPress: () => router.push("/practice"),
    },
  ];

  return (
    <Screen>
      <AppText variant="h1" serif>
        Quiz
      </AppText>
      <AppText tone="muted">
        Drill the old⇄new mapping — the cross-reference every judiciary aspirant needs by heart.
        Straight from the official NCRB mapping.
      </AppText>

      <View style={styles.cards}>
        {cards.map((c) => (
          <Pressable
            key={c.key}
            accessibilityRole="button"
            accessibilityLabel={`Open ${c.title}`}
            onPress={c.onPress}
            style={({ pressed }) => [
              styles.card,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: pressed ? 0.9 : 1,
              },
            ]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.bg }]}>
              <Ionicons name={c.icon} size={22} color={colors.brand} />
            </View>
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <AppText style={styles.title}>{c.title}</AppText>
                {c.badge ? (
                  <AppText variant="small" tone="muted">
                    {c.badge}
                  </AppText>
                ) : null}
              </View>
              <AppText variant="small" tone="muted">
                {c.body}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards: { gap: sp(3), paddingTop: sp(2) },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(3),
    borderWidth: 1,
    borderRadius: radius.md,
    padding: sp(4),
  },
  iconWrap: {
    height: 40,
    width: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: sp(2) },
  title: { fontWeight: "600" },
});
