import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { istToday, useDailyMcq } from "@/lib/local-library";
import { radius, sp, useTheme } from "@/theme";

/**
 * Home entry point for the Daily Quiz (replaces the daily_mcq fake door):
 * shows the streak + today's status and taps through to the quiz screen.
 */
export function DailyMcqCard() {
  const router = useRouter();
  const { colors } = useTheme();
  const { streak, answeredToday } = useDailyMcq(istToday());

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open the daily quiz"
      onPress={() => router.push("/daily")}
      style={({ pressed }) => [
        styles.card,
        { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.bg }]}>
        <Ionicons name="school-outline" size={22} color={colors.brand} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText style={styles.title}>Daily Quiz</AppText>
          {streak > 0 ? (
            <AppText variant="small" tone="muted">
              🔥 {streak}
            </AppText>
          ) : null}
        </View>
        <AppText variant="small" tone="muted">
          {answeredToday
            ? "Done for today — tap to keep practising"
            : "One old → new law question a day"}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(3),
    borderWidth: 1,
    borderRadius: radius.md,
    padding: sp(3),
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
