import { Pressable, StyleSheet } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { radius, sp, useTheme } from "@/theme";
import type { LibraryItem } from "@/lib/local-library";

/** Compact tappable card for a saved/recent section (act §number + note). */
export function SectionMiniCard({ item, onPress }: { item: LibraryItem; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.act} section ${item.number}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <AppText tone="brand" style={styles.ref}>
        {item.act} §{item.number}
      </AppText>
      <AppText variant="small" tone="muted" numberOfLines={2}>
        {item.note}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 2,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: sp(3),
  },
  ref: { fontWeight: "700" },
});
