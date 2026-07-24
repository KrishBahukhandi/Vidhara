import { Ionicons } from "@expo/vector-icons";
import { Fragment, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { explainSection } from "@/features/acts/api";
import { track } from "@/lib/analytics";
import { radius, sp, type as typeScale, useTheme } from "@/theme";

/** Render the model's markdown-ish output: "- "/"* " bullets and **bold**. */
function Explanation({ text, color }: { text: string; color: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  const renderBold = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((seg, i) =>
      seg.startsWith("**") && seg.endsWith("**") ? (
        <Text key={i} style={styles.bold}>
          {seg.slice(2, -2)}
        </Text>
      ) : (
        <Fragment key={i}>{seg}</Fragment>
      ),
    );

  return (
    <View style={styles.lines}>
      {lines.map((line, i) => {
        const isBullet = /^[-*•]\s+/.test(line);
        const content = line.replace(/^[-*•]\s+/, "");
        return (
          <View key={i} style={isBullet ? styles.bulletRow : undefined}>
            {isBullet ? <Text style={[typeScale.body, { color }]}>{"•  "}</Text> : null}
            <Text style={[typeScale.body, styles.lineText, { color }]}>{renderBold(content)}</Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * "Explain this section" — a floating pill (always visible, pinned bottom-right
 * over the scrolling reader) that opens the plain-language explanation in a
 * bottom-sheet modal. Grounding is server-side (decision D-004): the client
 * sends only {slug, number}; the model sees only this section's own official
 * text, which stays on the page behind the sheet for verification. Fetches on
 * first open, then keeps the result for re-opens. Rendered via Screen's
 * `overlay` layer so it floats above the ScrollView.
 */
export function AiExplain({ slug, number, act }: { slug: string; number: string; act: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  const run = async () => {
    setState("loading");
    setMessage("");
    track("ai_explain_requested", { act, number });
    const result = await explainSection(slug, number);
    if (!result.ok) {
      setMessage(result.error.message);
      setState("error");
      return;
    }
    setText(result.data);
    setState("done");
  };

  const onOpen = () => {
    setOpen(true);
    if (state === "idle" || state === "error") run();
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Explain this section in plain language"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.brand, bottom: insets.bottom + sp(4), opacity: pressed ? 0.9 : 1 },
        ]}>
        <Ionicons name="sparkles" size={16} color={colors.onBrand} />
        <AppText tone="onBrand" style={styles.fabLabel}>
          Explain
        </AppText>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Inner Pressable swallows taps so they don't close the sheet. */}
          <Pressable
            onPress={() => {}}
            style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + sp(4) }]}>
            <View style={styles.sheetHeader}>
              <View style={styles.titleRow}>
                <Ionicons name="sparkles-outline" size={18} color={colors.brand} />
                <AppText variant="h3">In plain language</AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setOpen(false)}
                hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetContent}>
              {state === "loading" ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.brand} />
                  <AppText tone="muted">Explaining…</AppText>
                </View>
              ) : null}
              {state === "done" ? <Explanation text={text} color={colors.text} /> : null}
              {state === "error" ? (
                <View style={styles.errorBox}>
                  <AppText tone="muted">{message}</AppText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={run}
                    style={({ pressed }) => [
                      styles.retry,
                      { borderColor: colors.brand, opacity: pressed ? 0.85 : 1 },
                    ]}>
                    <AppText style={{ color: colors.brand, fontWeight: "600" }}>Try again</AppText>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>

            {state === "done" ? (
              <AppText
                variant="micro"
                tone="muted"
                style={[styles.disclaimer, { borderTopColor: colors.border }]}>
                AI-generated study aid, grounded only in this section&apos;s official text on this
                page — always verify against it. Not legal advice.
              </AppText>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: sp(4),
    flexDirection: "row",
    alignItems: "center",
    gap: sp(2),
    height: 44,
    paddingHorizontal: sp(4),
    borderRadius: 999,
    // Soft shadow (design.md): Android elevation + iOS shadow.
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  fabLabel: { fontWeight: "600" },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    maxHeight: "82%",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: sp(5),
    paddingTop: sp(4),
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: sp(3),
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: sp(2) },
  sheetBody: { flexGrow: 0 },
  sheetContent: { gap: sp(3), paddingBottom: sp(2) },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: sp(2), paddingVertical: sp(2) },
  errorBox: { gap: sp(3) },
  retry: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: sp(4),
    paddingVertical: sp(2),
  },
  lines: { gap: sp(2) },
  bulletRow: { flexDirection: "row" },
  lineText: { flex: 1 },
  bold: { fontWeight: "700" },
  disclaimer: { borderTopWidth: 1, paddingTop: sp(3), marginTop: sp(2) },
});
