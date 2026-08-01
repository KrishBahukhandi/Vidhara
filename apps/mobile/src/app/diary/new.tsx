import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Screen } from "@/components/ui/screen";
import { useCaseDiary } from "@/features/diary/store";
import { track } from "@/lib/analytics";
import { radius, sp, useTheme } from "@/theme";

/**
 * Only the cause title is required. A matter often gets added in a corridor
 * with the case number on a piece of paper somewhere else — demanding the full
 * record up front is how a diary ends up empty.
 */
export default function NewCaseScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const diary = useCaseDiary();

  const [title, setTitle] = useState("");
  const [court, setCourt] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [nextHearing, setNextHearing] = useState("");
  const [stage, setStage] = useState("");
  const [notes, setNotes] = useState("");

  const field = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text },
  ];

  const save = () => {
    if (!title.trim()) return;
    void diary
      .add({
        title: title.trim(),
        court: court.trim(),
        caseNumber: caseNumber.trim(),
        nextHearing: /^\d{4}-\d{2}-\d{2}$/.test(nextHearing.trim()) ? nextHearing.trim() : "",
        stage: stage.trim(),
        notes: notes.trim(),
      })
      .then(() => {
        track("diary_case_added", {});
        router.back();
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

      <AppText variant="h1" serif>
        Add a matter
      </AppText>

      <Field label="Cause title *">
        <TextInput
          placeholder="State v. Kumar"
          placeholderTextColor={colors.textFaint}
          value={title}
          onChangeText={setTitle}
          style={field}
        />
      </Field>
      <Field label="Court">
        <TextInput
          placeholder="Sessions Court, Dehradun"
          placeholderTextColor={colors.textFaint}
          value={court}
          onChangeText={setCourt}
          style={field}
        />
      </Field>
      <Field label="Case number">
        <TextInput
          placeholder="CC 412/2026"
          placeholderTextColor={colors.textFaint}
          value={caseNumber}
          onChangeText={setCaseNumber}
          autoCapitalize="characters"
          style={field}
        />
      </Field>
      <Field label="Next hearing (YYYY-MM-DD)">
        <TextInput
          placeholder="2026-09-15"
          placeholderTextColor={colors.textFaint}
          value={nextHearing}
          onChangeText={setNextHearing}
          autoCapitalize="none"
          style={field}
        />
      </Field>
      <Field label="Stage">
        <TextInput
          placeholder="Bail application"
          placeholderTextColor={colors.textFaint}
          value={stage}
          onChangeText={setStage}
          style={field}
        />
      </Field>
      <Field label="Notes">
        <TextInput
          placeholder="Next step, documents to file…"
          placeholderTextColor={colors.textFaint}
          value={notes}
          onChangeText={setNotes}
          multiline
          style={[...field, styles.multiline]}
        />
      </Field>

      <Pressable
        accessibilityRole="button"
        disabled={!title.trim()}
        onPress={save}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: colors.brand, opacity: pressed || !title.trim() ? 0.6 : 1 },
        ]}>
        <AppText tone="onBrand" style={styles.primaryText}>
          Save matter
        </AppText>
      </Pressable>

      <AppText variant="micro" tone="faint" style={styles.note}>
        Stored on this device only — not uploaded, and not shared with the website.
      </AppText>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText variant="micro" tone="muted">
        {label}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { minHeight: 44, minWidth: 44, justifyContent: "center" },
  field: { gap: sp(1) },
  input: { minHeight: 44, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: sp(3), fontSize: 16 },
  multiline: { minHeight: 88, paddingTop: sp(2), textAlignVertical: "top" },
  primary: {
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: sp(2),
  },
  primaryText: { fontWeight: "700" },
  note: { marginTop: sp(2) },
});
