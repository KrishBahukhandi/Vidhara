import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { track } from "@/lib/analytics";
import { radius, sp, useTheme } from "@/theme";

/**
 * Honest fake door (decision D-010): measures demand for an unbuilt feature
 * with no fake functionality. A tap records a vote (fake_door_clicked) and
 * shows a thank-you. Cross-checked against interviews at Gate G1.
 */
export function FakeDoor({
  feature,
  icon,
  title,
  description,
}: {
  feature: "ai_explain" | "daily_mcq" | "offline";
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  const { colors } = useTheme();
  const [voted, setVoted] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={voted ? "Vote recorded" : `${title} — coming soon, tap to vote`}
      disabled={voted}
      onPress={() => {
        track("fake_door_clicked", { feature });
        setVoted(true);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.bg }]}>
        <Ionicons
          name={voted ? "checkmark-circle-outline" : icon}
          size={22}
          color={colors.brand}
        />
      </View>
      <View style={styles.body}>
        {voted ? (
          <>
            <AppText style={styles.title}>Thanks — noted.</AppText>
            <AppText variant="small" tone="muted">
              We build what enough of you ask for. Your vote counts.
            </AppText>
          </>
        ) : (
          <>
            <View style={styles.titleRow}>
              <AppText style={styles.title}>{title}</AppText>
              <View style={[styles.badge, { backgroundColor: colors.border }]}>
                <AppText variant="micro" tone="muted">
                  Coming soon
                </AppText>
              </View>
            </View>
            <AppText variant="small" tone="muted">
              {description} · tap if you want this
            </AppText>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(3),
    borderWidth: 1,
    borderStyle: "dashed",
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
  badge: { borderRadius: radius.sm, paddingHorizontal: sp(1), paddingVertical: 1 },
});
