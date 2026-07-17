import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";

import { BookmarkButton } from "@/components/acts/bookmark-button";
import { MappingCard } from "@/components/acts/mapping-card";
import { SectionNav } from "@/components/acts/section-nav";
import { FakeDoor } from "@/components/fake-door";
import { AppText } from "@/components/ui/app-text";
import { MarkdownLite } from "@/components/ui/markdown-lite";
import { Screen } from "@/components/ui/screen";
import {
  getAdjacentSections,
  getMappings,
  getSection,
  type AdjacentSection,
  type MappingRow,
  type SectionWithAct,
} from "@/features/acts/api";
import { track } from "@/lib/analytics";
import { recordRecent } from "@/lib/local-library";
import { WEB_URL } from "@/lib/site";
import { radius, sp, useTheme } from "@/theme";

export default function SectionReaderScreen() {
  const router = useRouter();
  const { slug, number } = useLocalSearchParams<{ slug: string; number: string }>();
  const { colors } = useTheme();
  const [section, setSection] = useState<SectionWithAct | null>(null);
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [adjacent, setAdjacent] = useState<{
    prev: AdjacentSection | null;
    next: AdjacentSection | null;
  }>({ prev: null, next: null });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !number) return;
    setAdjacent({ prev: null, next: null });
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
      getAdjacentSections(result.data.act_id, result.data.sort_key).then(setAdjacent);
    });
  }, [slug, number]);

  const isSample = section?.provenance?.startsWith("dev-sample");

  const onShare = async () => {
    if (!section) return;
    const counterpart = mappings[0];
    const other = counterpart
      ? counterpart.source_section_id === section.id
        ? counterpart.target_act
          ? ` (now ${counterpart.target_act} §${counterpart.target_number})`
          : ""
        : counterpart.source_act
          ? ` (was ${counterpart.source_act} §${counterpart.source_number})`
          : ""
      : "";
    track("share_clicked", {
      act: section.acts.abbreviation,
      number: section.number,
      channel: "native",
    });
    await Share.share({
      message:
        `${section.acts.abbreviation} §${section.number} — ${section.marginal_note}${other}` +
        ` · full text: ${WEB_URL}/acts/${section.acts.slug}/${encodeURIComponent(section.number)}?via=share`,
    });
  };

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
            <View style={styles.actions}>
              <BookmarkButton
                act={section.acts.abbreviation}
                slug={section.acts.slug}
                number={section.number}
                note={section.marginal_note}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share this section"
                onPress={onShare}
                style={({ pressed }) => [
                  styles.shareBtn,
                  { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 },
                ]}>
                <Ionicons name="share-outline" size={16} color={colors.textMuted} />
                <AppText variant="small" tone="muted" style={styles.shareLabel}>
                  Share
                </AppText>
              </Pressable>
            </View>
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

          <SectionNav slug={section.acts.slug} prev={adjacent.prev} next={adjacent.next} />

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
  header: { gap: sp(2) },
  actions: { flexDirection: "row", gap: sp(2), flexWrap: "wrap" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(1),
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: sp(3),
    paddingVertical: sp(2),
    alignSelf: "flex-start",
  },
  shareLabel: { fontWeight: "600" },
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
