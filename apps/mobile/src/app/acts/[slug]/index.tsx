import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Screen } from "@/components/ui/screen";
import { getAct, listSections, type Act, type SectionListItem } from "@/features/acts/api";
import { radius, sp, useTheme } from "@/theme";

export default function ActDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const [act, setAct] = useState<Act | null>(null);
  const [sections, setSections] = useState<SectionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getAct(slug).then((result) => {
      if (result.ok) setAct(result.data);
      else setError(result.error.message);
    });
    listSections(slug).then((result) => {
      if (result.ok) setSections(result.data);
      else setError(result.error.message);
    });
  }, [slug]);

  return (
    <Screen scroll={false} padBottom>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={styles.back}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </Pressable>

      {error ? <AppText tone="danger">{error}</AppText> : null}

      {act ? (
        <View style={styles.header}>
          <AppText variant="h1" serif>
            {act.title}
          </AppText>
          <AppText variant="small" tone="muted">
            {act.abbreviation} · {act.year}
            {act.status !== "active" ? " · no longer in force" : ""}
          </AppText>
        </View>
      ) : (
        <AppText tone="muted">Loading…</AppText>
      )}

      {sections === null ? null : sections.length === 0 ? (
        <AppText tone="muted">Sections for this act are still being ingested.</AppText>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(section) => section.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open section ${item.number}, ${item.marginal_note}`}
              onPress={() =>
                router.push(`/acts/${slug}/${encodeURIComponent(item.number)}`)
              }
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <AppText tone="brand" style={styles.number}>
                §{item.number}
              </AppText>
              <AppText style={styles.note} numberOfLines={2}>
                {item.marginal_note}
              </AppText>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { minHeight: 44, minWidth: 44, justifyContent: "center" },
  header: { gap: sp(1) },
  list: { gap: sp(2), paddingBottom: sp(6), paddingTop: sp(2) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(3),
    borderWidth: 1,
    borderRadius: radius.md,
    padding: sp(3),
  },
  number: { fontWeight: "700", minWidth: 56 },
  note: { flex: 1, fontWeight: "500" },
});
