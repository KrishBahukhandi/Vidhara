import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import type { StateAmendmentRow } from "@/features/acts/api";
import { radius, sp, useTheme, type SchemeColors } from "@/theme";

/**
 * State amendments to a section — the app twin of the web component (D-053).
 *
 * The constraint is the same and it outranks everything else: nothing here may
 * be mistaken for the central provision above it. Around 95 published sections
 * once carried a State's amending text inside their bodies (D-032), CrPC §438 —
 * anticipatory bail — among them. Showing this material again is only safe while
 * the boundary is impossible to miss, so every entry leads with its State, the
 * authority is printed under it, and the text stays collapsed until asked for.
 *
 * Collapsed by default is the point rather than a space saving: knowing an
 * amendment EXISTS is what silence used to hide, and opening one is a decision
 * to read another State's law.
 */
export function StateAmendments({ amendments }: { amendments: StateAmendmentRow[] }) {
  const { colors } = useTheme();
  const s = styles(colors);
  if (amendments.length === 0) return null;

  const states = [...new Set(amendments.map((a) => a.state))].sort();

  return (
    <View style={s.wrap}>
      <AppText variant="h3" style={s.heading}>
        State amendments
      </AppText>
      <AppText variant="body" tone="muted" style={s.intro}>
        This section has been amended in its application to{" "}
        <AppText variant="body" style={s.states}>
          {formatList(states)}
        </AppText>
        . The text above is the central provision and is what applies everywhere else — these
        amendments are law only in the State that made them.
      </AppText>

      {amendments.map((amendment) => (
        <AmendmentItem key={amendment.id} amendment={amendment} />
      ))}

      <AppText variant="micro" tone="faint" style={s.footnote}>
        Reproduced from the same official PDF as the section above, as the amending Act words it —
        not a consolidated State version of the section. Check the source before relying on it.
      </AppText>
    </View>
  );
}

function AmendmentItem({ amendment }: { amendment: StateAmendmentRow }) {
  const { colors } = useTheme();
  const s = styles(colors);
  const [open, setOpen] = useState(false);

  return (
    <View style={s.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${amendment.state} amendment, ${open ? "hide" : "read"}`}
        onPress={() => setOpen((v) => !v)}
        style={s.header}>
        <View style={s.badge}>
          <AppText variant="micro" style={s.badgeText}>
            {amendment.state.toUpperCase()}
          </AppText>
        </View>
        <AppText variant="micro" tone="brand">
          {open ? "Hide" : "Read"}
        </AppText>
      </Pressable>
      <AppText variant="micro" tone="faint" style={s.citation}>
        {amendment.citation}
      </AppText>
      {open ? (
        <View style={s.body}>
          <AppText variant="body" tone="muted">
            {amendment.amendment_text}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

/** "Karnataka, Kerala and Tripura" — as one reads it aloud. */
function formatList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const styles = (colors: SchemeColors) =>
  StyleSheet.create({
    wrap: { marginTop: sp(6) },
    heading: { marginBottom: sp(2) },
    intro: { marginBottom: sp(3) },
    states: { color: colors.text, fontWeight: "600" },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: sp(3),
      marginBottom: sp(2),
    },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    badge: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: radius.sm,
      paddingHorizontal: sp(2),
      paddingVertical: 2,
    },
    badgeText: { color: colors.accent, fontWeight: "700", letterSpacing: 0.5 },
    citation: { marginTop: sp(1) },
    body: {
      marginTop: sp(2),
      paddingLeft: sp(3),
      borderLeftWidth: 2,
      borderLeftColor: colors.border,
    },
    footnote: { marginTop: sp(2) },
  });
