import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import type { AdjacentSection } from "@/features/acts/api";
import { radius, sp, useTheme } from "@/theme";

/** Previous/next section within an act — sequential reading. */
export function SectionNav({
  slug,
  prev,
  next,
}: {
  slug: string;
  prev: AdjacentSection | null;
  next: AdjacentSection | null;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  if (!prev && !next) return null;

  const go = (num: string) => router.push(`/acts/${slug}/${encodeURIComponent(num)}`);

  return (
    <View style={styles.row}>
      {prev ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Previous, section ${prev.number}`}
          onPress={() => go(prev.number)}
          style={({ pressed }) => [
            styles.card,
            { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 },
          ]}>
          <View style={styles.dirRow}>
            <Ionicons name="arrow-back" size={14} color={colors.textFaint} />
            <AppText variant="micro" tone="faint">
              PREVIOUS
            </AppText>
          </View>
          <AppText tone="brand" style={styles.num}>
            §{prev.number}
          </AppText>
          <AppText variant="small" tone="muted" numberOfLines={2}>
            {prev.marginal_note}
          </AppText>
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      {next ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Next, section ${next.number}`}
          onPress={() => go(next.number)}
          style={({ pressed }) => [
            styles.card,
            styles.alignEnd,
            { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 },
          ]}>
          <View style={styles.dirRow}>
            <AppText variant="micro" tone="faint">
              NEXT
            </AppText>
            <Ionicons name="arrow-forward" size={14} color={colors.textFaint} />
          </View>
          <AppText tone="brand" style={styles.num}>
            §{next.number}
          </AppText>
          <AppText variant="small" tone="muted" numberOfLines={2} style={styles.textEnd}>
            {next.marginal_note}
          </AppText>
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: sp(2) },
  card: { flex: 1, gap: 2, borderWidth: 1, borderRadius: radius.md, padding: sp(3) },
  alignEnd: { alignItems: "flex-end" },
  spacer: { flex: 1 },
  dirRow: { flexDirection: "row", alignItems: "center", gap: sp(1) },
  num: { fontWeight: "700" },
  textEnd: { textAlign: "right" },
});
