import { Ionicons } from "@expo/vector-icons";
import { Fragment, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

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
 * "Explain this section" — calls the explain-section Edge Function (grounded
 * strictly in this section's own text, server-side; decision D-004). The
 * statute text stays visible above; the explanation carries a verify-it
 * disclaimer. Friendly "being set up" / daily-cap messages surface via the
 * api err() message.
 */
export function AiExplain({ slug, number, act }: { slug: string; number: string; act: string }) {
  const { colors } = useTheme();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  const onExplain = async () => {
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

  if (state === "done") {
    return (
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles-outline" size={18} color={colors.brand} />
          <AppText variant="h3">In plain language</AppText>
        </View>
        <Explanation text={text} color={colors.text} />
        <AppText variant="micro" tone="muted" style={[styles.disclaimer, { borderTopColor: colors.border }]}>
          AI-generated study aid, grounded in this section&apos;s text above — always verify against
          the official text. Not legal advice.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.actionWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Explain this section in plain language"
        disabled={state === "loading"}
        onPress={onExplain}
        style={({ pressed }) => [
          styles.button,
          { borderColor: colors.brand, backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 },
        ]}>
        {state === "loading" ? (
          <ActivityIndicator size="small" color={colors.brand} />
        ) : (
          <Ionicons name="sparkles-outline" size={18} color={colors.brand} />
        )}
        <AppText style={[styles.buttonLabel, { color: colors.brand }]}>
          {state === "loading" ? "Explaining…" : "Explain this section in plain language"}
        </AppText>
      </Pressable>
      {state === "error" ? (
        <AppText variant="small" tone="muted" style={styles.errorText}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionWrap: { gap: sp(2) },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(2),
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: sp(4),
    paddingVertical: sp(3),
    alignSelf: "flex-start",
  },
  buttonLabel: { fontWeight: "600" },
  errorText: {},
  card: {
    gap: sp(3),
    borderWidth: 1,
    borderRadius: radius.md,
    padding: sp(4),
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: sp(2) },
  lines: { gap: sp(2) },
  bulletRow: { flexDirection: "row" },
  lineText: { flex: 1 },
  bold: { fontWeight: "700" },
  disclaimer: { borderTopWidth: 1, paddingTop: sp(3) },
});
