import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { track } from "@/lib/analytics";
import { useBookmarks, type NewItem } from "@/lib/local-library";
import { radius, sp, useTheme } from "@/theme";

/** Save/unsave a section locally (no account — D-007). Fires bookmark events. */
export function BookmarkButton(item: NewItem) {
  const { colors } = useTheme();
  const { isBookmarked, toggle } = useBookmarks();
  const saved = isBookmarked(item.slug, item.number);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove bookmark" : "Save section"}
      onPress={async () => {
        const nowSaved = await toggle(item);
        track(nowSaved ? "bookmark_added" : "bookmark_removed", {
          act: item.act,
          number: item.number,
        });
      }}
      style={({ pressed }) => [
        styles.btn,
        {
          borderColor: saved ? colors.brand : colors.border,
          backgroundColor: saved ? colors.brand : colors.surface,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      <Ionicons
        name={saved ? "bookmark" : "bookmark-outline"}
        size={16}
        color={saved ? colors.onBrand : colors.textMuted}
      />
      <AppText variant="small" tone={saved ? "onBrand" : "muted"} style={styles.label}>
        {saved ? "Saved" : "Save"}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(1),
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: sp(3),
    paddingVertical: sp(2),
    alignSelf: "flex-start",
  },
  label: { fontWeight: "600" },
});
