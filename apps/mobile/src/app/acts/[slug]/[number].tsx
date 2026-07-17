import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { BookmarkButton } from "@/components/acts/bookmark-button";
import { MappingCard } from "@/components/acts/mapping-card";
import { FakeDoor } from "@/components/fake-door";
import { AppText } from "@/components/ui/app-text";
import { MarkdownLite } from "@/components/ui/markdown-lite";
import { Screen } from "@/components/ui/screen";
import {
  getMappings,
  getSection,
  type MappingRow,
  type SectionWithAct,
} from "@/features/acts/api";
import { track } from "@/lib/analytics";
import { recordRecent } from "@/lib/local-library";
import { radius, sp, useTheme } from "@/theme";

export default function SectionReaderScreen() {
  const router = useRouter();
  const { slug, number } = useLocalSearchParams<{ slug: string; number: string }>();
  const { colors } = useTheme();
  const [section, setSection] = useState<SectionWithAct | null>(null);
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !number) return;
    getSection(slug, number).then((result) => {
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setSection(result.data);
      track("section_viewed", {
        act: result.data.acts.abbreviation,
        number: result.data.number,
      });
      void recordRecent({
        act: result.data.acts.abbreviation,
        slug: result.data.acts.slug,
        number: result.data.number,
        note: result.data.marginal_note,
      });
      getMappings(result.data.id).then((m) => {
        if (m.ok) setMappings(m.data);
      });
    });
  }, [slug, number]);

  const isSample = section?.provenance?.startsWith("dev-sample");

  return (
    <Screen padBottom>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={styles.back}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </Pressable>

      {error ? <AppText tone="danger">{error}</AppText> : null}
      {!section && !error ? <AppText tone="muted">Loading…</AppText> : null}

      {section ? (
        <View style={styles.content}>
          <View style={styles.header}>
            <AppText variant="small" tone="muted">
              {section.acts.title}
            </AppText>
            <AppText variant="h1" serif>
              §{section.number} — {section.marginal_note}
            </AppText>
            <BookmarkButton
              act={section.acts.abbreviation}
              slug={section.acts.slug}
              number={section.number}
              note={section.marginal_note}
            />
          </View>

          {isSample ? (
            <View style={[styles.sampleChip, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
              <Ionicons name="flask-outline" size={14} color={colors.warning} />
              <AppText variant="micro" tone="muted">
                Sample content — official text ingestion in progress
              </AppText>
            </View>
          ) : null}

          <View style={styles.reading}>
            <MarkdownLite>{section.body_md}</MarkdownLite>
          </View>

          {mappings.length > 0 ? (
            <View style={styles.mappings}>
              <AppText variant="h3">Old law ⇄ new law</AppText>
              {mappings.map((mapping) => (
                <MappingCard
                  key={mapping.mapping_id}
                  mapping={mapping}
                  perspectiveSectionId={section.id}
                />
              ))}
            </View>
          ) : null}

          <FakeDoor
            feature="ai_explain"
            icon="sparkles-outline"
            title="Explain this section with AI"
            description="Plain-language breakdown, grounded in this section's own text"
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { minHeight: 44, minWidth: 44, justifyContent: "center" },
  content: { gap: sp(4) },
  header: { gap: sp(1) },
  sampleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(1),
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: sp(2),
    paddingVertical: sp(1),
  },
  reading: { maxWidth: 680 },
  mappings: { gap: sp(3), paddingTop: sp(2) },
});
