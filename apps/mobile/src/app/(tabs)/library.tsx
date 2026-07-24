import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { DailyMcqCard } from "@/components/acts/daily-mcq-card";
import { SectionMiniCard } from "@/components/acts/section-mini-card";
import { AppText } from "@/components/ui/app-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Screen } from "@/components/ui/screen";
import {
  askSections,
  listActs,
  searchLibrary,
  type Act,
  type SearchHit,
} from "@/features/acts/api";
import { track } from "@/lib/analytics";
import { useRecents } from "@/lib/local-library";
import { radius, sp, useTheme } from "@/theme";

const STATUS_LABEL: Record<string, string> = {
  active: "In force",
  replaced: "Replaced",
  repealed: "Repealed",
};

function ActRow({ act, onPress }: { act: Act; onPress: () => void }) {
  const { colors } = useTheme();
  const isActive = act.status === "active";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${act.title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actRow,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={[styles.abbrBadge, { backgroundColor: isActive ? colors.brand : colors.border }]}>
        <AppText variant="small" tone={isActive ? "onBrand" : "muted"} style={styles.abbrText}>
          {act.abbreviation}
        </AppText>
      </View>
      <View style={styles.actInfo}>
        <AppText style={styles.actTitle} numberOfLines={1}>
          {act.title}
        </AppText>
        <AppText variant="small" tone="muted">
          {act.year} · {STATUS_LABEL[act.status] ?? act.status}
        </AppText>
      </View>
    </Pressable>
  );
}

function HitRow({ hit, onPress }: { hit: SearchHit; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actRow,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={styles.actInfo}>
        <AppText style={styles.actTitle}>
          <AppText tone="brand" style={styles.mono}>
            {hit.act_abbreviation} §{hit.number}
          </AppText>
          {"  "}
          {hit.marginal_note}
        </AppText>
        {hit.snippet ? (
          <AppText variant="small" tone="muted" numberOfLines={2}>
            {hit.snippet.replaceAll("**", "")}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Continue-reading + Daily MCQ fake door, shown above the acts list only. */
function LibraryHeader() {
  const router = useRouter();
  const { items: recents } = useRecents();
  return (
    <View style={styles.header}>
      {recents.length > 0 ? (
        <View style={styles.headerBlock}>
          <AppText variant="h3">Continue reading</AppText>
          <View style={styles.recents}>
            {recents.slice(0, 4).map((item) => (
              <SectionMiniCard
                key={`${item.slug}-${item.number}`}
                item={item}
                onPress={() => {
                  track("recents_resumed", { act: item.act, number: item.number });
                  router.push(`/acts/${item.slug}/${encodeURIComponent(item.number)}`);
                }}
              />
            ))}
          </View>
        </View>
      ) : null}
      <DailyMcqCard />
      <AppText variant="h3">All acts</AppText>
    </View>
  );
}

export default function LibraryScreen() {
  const router = useRouter();
  const [acts, setActs] = useState<Act[] | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [interpretedAs, setInterpretedAs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listActs().then((result) => {
      if (result.ok) setActs(result.data);
      else setError(result.error.message);
    });
  }, []);

  const onSearch = async () => {
    if (!query.trim()) {
      setHits(null);
      setInterpretedAs(null);
      return;
    }
    setError(null);
    const result = await searchLibrary(query);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    if (result.data.kind === "section") {
      setHits(null);
      setInterpretedAs(null);
      router.push(`/acts/${result.data.actSlug}/${encodeURIComponent(result.data.number)}`);
      return;
    }
    // Plain search found nothing → the grounded AI librarian interprets the
    // question and re-searches the real corpus (results are always real).
    let finalHits = result.data.results;
    let phrase: string | null = null;
    if (finalHits.length === 0) {
      const ai = await askSections(query);
      if (ai.ok && ai.data.results.length > 0) {
        finalHits = ai.data.results;
        phrase = ai.data.interpretedAs?.[0] ?? null;
      }
      track("ask_ai_assisted", { found: finalHits.length });
    }
    setInterpretedAs(phrase);
    setHits(finalHits);
  };

  const showingSearch = hits !== null;

  return (
    <Screen scroll={false}>
      <AppText variant="h1">Library</AppText>
      <Field
        label="Ask or search"
        placeholder='Ask or search — "anticipatory bail", "302 IPC"…'
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          if (!text.trim()) {
            setHits(null);
            setInterpretedAs(null);
          }
        }}
        onSubmitEditing={onSearch}
        returnKeyType="search"
        autoCapitalize="none"
        error={error}
      />

      {showingSearch ? (
        hits.length === 0 ? (
          <EmptyState
            icon="search-outline"
            headline="No sections found"
            guidance='Try a section reference like "302 IPC" or a concept like "cheating".'
          />
        ) : (
          <FlatList
            data={hits}
            keyExtractor={(hit) => hit.section_id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              interpretedAs ? (
                <AppText variant="small" tone="muted" style={styles.interpretedNote}>
                  No exact match — showing the closest law to read (read as “{interpretedAs}”).
                </AppText>
              ) : null
            }
            renderItem={({ item }) => (
              <HitRow
                hit={item}
                onPress={() =>
                  router.push(`/acts/${item.act_slug}/${encodeURIComponent(item.number)}`)
                }
              />
            )}
          />
        )
      ) : acts === null ? (
        <AppText tone="muted">Loading the library…</AppText>
      ) : acts.length === 0 ? (
        <EmptyState
          icon="book-outline"
          headline="The library is filling up"
          guidance="Acts are being ingested — check back shortly."
        />
      ) : (
        <FlatList
          data={acts}
          keyExtractor={(act) => act.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={LibraryHeader}
          renderItem={({ item }) => (
            <ActRow act={item} onPress={() => router.push(`/acts/${item.slug}`)} />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: sp(2), paddingBottom: sp(6) },
  interpretedNote: { paddingBottom: sp(2) },
  header: { gap: sp(3), paddingBottom: sp(1) },
  headerBlock: { gap: sp(2) },
  recents: { gap: sp(2) },
  actRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(3),
    borderWidth: 1,
    borderRadius: radius.md,
    padding: sp(3),
  },
  abbrBadge: {
    minWidth: 56,
    borderRadius: radius.sm,
    paddingVertical: sp(1),
    paddingHorizontal: sp(2),
    alignItems: "center",
  },
  abbrText: { fontWeight: "700" },
  actInfo: { flex: 1, gap: 2 },
  actTitle: { fontWeight: "600" },
  mono: { fontWeight: "700" },
});
