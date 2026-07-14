import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { AppText } from "@/components/ui/app-text";
import { MarkdownLite } from "@/components/ui/markdown-lite";
import type { MappingRow } from "@/features/acts/api";
import { radius, sp, useTheme, type SchemeColors } from "@/theme";

const TYPE_LABEL: Record<string, string> = {
  identical: "Identical",
  renumbered: "Renumbered",
  modified: "Modified",
  expanded: "Expanded",
  merged: "Merged",
  split: "Split",
  new: "New provision",
  omitted: "Omitted",
};

function typeColor(type: string | null, colors: SchemeColors): string {
  switch (type) {
    case "identical":
    case "renumbered":
      return colors.mapSame;
    case "new":
      return colors.mapNew;
    case "omitted":
      return colors.mapOmitted;
    default:
      return colors.mapChanged;
  }
}

/**
 * One old⇄new mapping with change annotation (design.md §2.4: color + label,
 * never color alone). `perspectiveSectionId` decides which side is "the other law".
 */
export function MappingCard({
  mapping,
  perspectiveSectionId,
}: {
  mapping: MappingRow;
  perspectiveSectionId?: string;
}) {
  const { colors } = useTheme();
  const router = useRouter();

  const isSource = mapping.source_section_id === perspectiveSectionId;
  const badge = typeColor(mapping.mapping_type, colors);

  const side = (
    label: string,
    act: string | null,
    number: string | null,
    note: string | null,
    slug: string | null,
    emphasized: boolean,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${act} section ${number}`}
      disabled={!slug || !number}
      onPress={() => slug && number && router.push(`/acts/${slug}/${encodeURIComponent(number)}`)}
      style={[
        styles.side,
        {
          backgroundColor: emphasized ? colors.surface : colors.bg,
          borderColor: colors.border,
        },
      ]}>
      <AppText variant="micro" tone="faint">
        {label}
      </AppText>
      <AppText variant="h3">
        {act} §{number}
      </AppText>
      <AppText variant="small" tone="muted" numberOfLines={2}>
        {note}
      </AppText>
    </Pressable>
  );

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: badge }]}>
          <AppText variant="micro" tone="onBrand" style={styles.badgeText}>
            {TYPE_LABEL[mapping.mapping_type ?? ""] ?? mapping.mapping_type}
          </AppText>
        </View>
        <AppText variant="micro" tone="faint">
          old law ⇄ new law
        </AppText>
      </View>

      <View style={styles.sides}>
        {side(
          "OLD LAW",
          mapping.source_act,
          mapping.source_number,
          mapping.source_marginal_note,
          mapping.source_act_slug,
          !isSource,
        )}
        {side(
          "NEW LAW",
          mapping.target_act,
          mapping.target_number,
          mapping.target_marginal_note,
          mapping.target_act_slug,
          isSource,
        )}
      </View>

      {mapping.change_summary_md ? (
        <View style={styles.summary}>
          <MarkdownLite>{mapping.change_summary_md}</MarkdownLite>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: sp(4), gap: sp(3) },
  badgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { borderRadius: radius.sm, paddingHorizontal: sp(2), paddingVertical: 2 },
  badgeText: { fontWeight: "600" },
  sides: { flexDirection: "row", gap: sp(2) },
  side: { flex: 1, borderWidth: 1, borderRadius: radius.sm, padding: sp(3), gap: sp(1) },
  summary: { paddingTop: sp(1) },
});
