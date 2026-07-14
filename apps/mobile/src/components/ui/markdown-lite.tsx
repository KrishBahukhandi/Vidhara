import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import { type as typeScale, sp, useTheme } from "@/theme";

/**
 * Minimal markdown renderer for statutory text: paragraphs, **bold** spans,
 * whole-paragraph *italics* (used by ingestion notes). Deliberately tiny —
 * a full markdown engine arrives only if content ingestion demands it.
 * Statute text renders serif at reading size (design.md §3).
 */
export function MarkdownLite({ children }: { children: string }) {
  const { colors } = useTheme();
  const paragraphs = children.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <View style={styles.wrap}>
      {paragraphs.map((paragraph, index) => {
        const trimmed = paragraph.trim();
        const isNote = /^\*[^*].*\*$/s.test(trimmed); // whole-para *italic* = editorial note
        const content = isNote ? trimmed.slice(1, -1) : trimmed;

        return (
          <Text
            key={index}
            style={[
              typeScale.bodyLg,
              styles.para,
              { color: isNote ? colors.textMuted : colors.text },
              isNote && styles.note,
            ]}>
            {content.split(/(\*\*[^*]+\*\*)/g).map((segment, i) =>
              segment.startsWith("**") && segment.endsWith("**") ? (
                <Text key={i} style={styles.bold}>
                  {segment.slice(2, -2)}
                </Text>
              ) : (
                <Fragment key={i}>{segment}</Fragment>
              ),
            )}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: sp(3) },
  para: { fontFamily: "SourceSerif4" },
  note: { fontStyle: "italic" },
  bold: { fontWeight: "700" },
});
