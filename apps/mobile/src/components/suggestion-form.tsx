import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import { radius, sp, useTheme } from "@/theme";

/**
 * Free-text improvement suggestions → public.feedback (kind='suggestion',
 * anon INSERT-only RLS). What users ask for here decides the roadmap — text
 * goes to the database, never to analytics.
 */
export function SuggestionForm() {
  const { colors } = useTheme();
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  if (state === "done") {
    return (
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <AppText style={styles.title}>Got it — thank you. 🙏</AppText>
        <AppText variant="small" tone="muted">
          Every suggestion is read by the founder. The ones enough of you ask for get built.
        </AppText>
      </View>
    );
  }

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed || state === "sending") return;
    setState("sending");
    const { error } = await supabase.from("feedback").insert({
      kind: "suggestion",
      message: `[Android app] ${trimmed}`.slice(0, 2000),
      platform: "android",
    });
    if (error) {
      setState("error");
      return;
    }
    track("feedback_submitted", { kind: "suggestion" });
    setState("done");
  };

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <AppText style={styles.title}>Suggest an improvement</AppText>
      <AppText variant="small" tone="muted">
        Missing an act? Want a feature? What you ask for here decides what we build next.
      </AppText>
      <TextInput
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={3}
        maxLength={1900}
        placeholder="What should we improve, add, or fix?"
        placeholderTextColor={colors.textFaint}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.bg, color: colors.text }]}
      />
      <Button
        label={state === "sending" ? "Sending…" : "Send"}
        onPress={submit}
        loading={state === "sending"}
      />
      {state === "error" ? (
        <AppText variant="small" tone="danger">
          Couldn’t send — please retry.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: sp(3), borderWidth: 1, borderRadius: radius.md, padding: sp(4) },
  title: { fontWeight: "600" },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: sp(3),
    fontSize: 16,
    textAlignVertical: "top",
  },
});
