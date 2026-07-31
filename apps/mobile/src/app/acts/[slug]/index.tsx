import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, SectionList, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Screen } from "@/components/ui/screen";
import {
  getAct,
  listChapters,
  listSections,
  type Act,
  type ChapterListItem,
  type SectionListItem,
} from "@/features/acts/api";
import { radius, sp, useTheme } from "@/theme";

/**
 * One SectionList group: a division of the act plus its sections. Divisions can
 * nest — the Arbitration Act puts Chapters inside Parts — so a group carries
 * the Part to announce above it (only on the first Chapter of that Part) and
 * whether it should be indented beneath one.
 */
interface ActGroup {
  title: string;
  parentTitle?: string;
  nested: boolean;
  data: SectionListItem[];
}

export default function ActDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { colors } = useTheme();
  const [act, setAct] = useState<Act | null>(null);
  const [sections, setSections] = useState<SectionListItem[] | null>(null);
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [filter, setFilter] = useState("");
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
    listChapters(slug).then((result) => {
      if (result.ok) setChapters(result.data);
    });
  }, [slug]);

  // Grouped for browsing, flat single group when filtering (matches jump
  // across chapters).
  const groups = useMemo<ActGroup[] | null>(() => {
    if (!sections) return null;
    const q = filter.trim().toLowerCase();
    if (q) {
      const hits = sections.filter(
        (s) => s.number.toLowerCase().includes(q) || s.marginal_note.toLowerCase().includes(q),
      );
      return [{ title: "", nested: false, data: hits }];
    }
    const byChapter = new Map<string | null, SectionListItem[]>();
    for (const s of sections) {
      byChapter.set(s.chapter_id, [...(byChapter.get(s.chapter_id) ?? []), s]);
    }
    const out: ActGroup[] = [];
    if (byChapter.has(null)) out.push({ title: "", nested: false, data: byChapter.get(null)! });
    // A Part is announced once, above the first Chapter that belongs to it —
    // the Arbitration Act would otherwise repeat "Part I" ten times. Tracked
    // across groups rather than per group, since a Part spans several.
    let announcedPart: string | null = null;
    for (const ch of chapters) {
      const secs = byChapter.get(ch.id);
      if (!secs?.length) continue;
      const parent = ch.part_number || null;
      const parentTitle =
        parent && parent !== announcedPart
          ? `Part ${parent}${ch.part_title ? ` · ${ch.part_title}` : ""}`
          : undefined;
      if (parent) announcedPart = parent;
      out.push({
        title: `${ch.kind === "part" ? "Part" : "Ch."} ${ch.number} · ${ch.title}`,
        parentTitle,
        nested: Boolean(parent),
        data: secs,
      });
    }
    return out.length > 1 ? out : [{ title: "", nested: false, data: sections }];
  }, [sections, chapters, filter]);

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

      {sections && sections.length > 12 ? (
        <TextInput
          placeholder={`Filter ${sections.length} sections`}
          placeholderTextColor={colors.textFaint}
          value={filter}
          onChangeText={setFilter}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.filter, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
        />
      ) : null}

      {groups === null ? null : sections && sections.length === 0 ? (
        <AppText tone="muted">Sections for this act are still being ingested.</AppText>
      ) : groups[0] && groups.every((g) => g.data.length === 0) ? (
        <AppText tone="muted">No section matches “{filter}”.</AppText>
      ) : (
        <SectionList
          sections={groups}
          keyExtractor={(section) => section.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          renderSectionHeader={({ section: group }) =>
            group.title ? (
              <View style={styles.chapterHeader}>
                {group.parentTitle ? (
                  <AppText variant="micro" tone="faint" style={styles.partText}>
                    {group.parentTitle}
                  </AppText>
                ) : null}
                <AppText
                  variant="micro"
                  tone="muted"
                  style={[styles.chapterText, group.nested ? styles.nested : null]}>
                  {group.title}
                </AppText>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open section ${item.number}, ${item.marginal_note}`}
              onPress={() => router.push(`/acts/${slug}/${encodeURIComponent(item.number)}`)}
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
  filter: {
    height: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: sp(3),
    fontSize: 16,
  },
  list: { paddingBottom: sp(6), paddingTop: sp(2), gap: sp(2) },
  chapterHeader: { paddingTop: sp(3), paddingBottom: sp(1) },
  chapterText: { fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  partText: {
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingBottom: sp(1),
  },
  /** Chapters sit a level in from the Part that contains them. */
  nested: { paddingLeft: sp(2) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(3),
    borderWidth: 1,
    borderRadius: radius.md,
    padding: sp(3),
    marginBottom: sp(2),
  },
  number: { fontWeight: "700", minWidth: 56 },
  note: { flex: 1, fontWeight: "500" },
});
