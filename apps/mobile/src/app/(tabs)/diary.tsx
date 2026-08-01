import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Share, StyleSheet, TextInput, View } from "react-native";

import { daysUntil, type DiaryCase } from "@nexlex/shared";

import { AppText } from "@/components/ui/app-text";
import { Screen } from "@/components/ui/screen";
import { useCaseDiary } from "@/features/diary/store";
import { track } from "@/lib/analytics";
import { radius, sp, useTheme } from "@/theme";

/**
 * The cause list: every matter, soonest date first, overdue at the top.
 *
 * This is the screen an advocate opens before court, so it answers one question
 * on sight — what is coming and how soon — and everything else is a tap away.
 */
export default function DiaryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const diary = useCaseDiary();
  const [filter, setFilter] = useState("");

  const cases = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return diary.cases;
    return diary.cases.filter((c) =>
      `${c.title} ${c.court} ${c.caseNumber} ${c.stage}`.toLowerCase().includes(q),
    );
  }, [diary.cases, filter]);

  const thisWeek = diary.cases.filter((c) => {
    const d = daysUntil(c.nextHearing);
    return d !== null && d >= 0 && d <= 7;
  }).length;

  return (
    <Screen scroll={false} padBottom>
      <View style={styles.header}>
        <AppText variant="h1" serif>
          Case diary
        </AppText>
        <AppText variant="small" tone="muted">
          {diary.loading
            ? "Loading…"
            : `${diary.cases.length} ${diary.cases.length === 1 ? "matter" : "matters"}${
                thisWeek > 0 ? ` · ${thisWeek} within 7 days` : ""
              }`}
        </AppText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a matter"
        onPress={() => router.push("/diary/new")}
        style={({ pressed }) => [
          styles.add,
          { backgroundColor: colors.brand, opacity: pressed ? 0.9 : 1 },
        ]}>
        <Ionicons name="add" size={18} color={colors.onBrand} />
        <AppText tone="onBrand" style={styles.addText}>
          Add a matter
        </AppText>
      </Pressable>

      <Transfer diary={diary} />

      {diary.cases.length > 6 ? (
        <TextInput
          placeholder="Filter by cause title, court or number"
          placeholderTextColor={colors.textFaint}
          value={filter}
          onChangeText={setFilter}
          autoCapitalize="none"
          style={[
            styles.filter,
            { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text },
          ]}
        />
      ) : null}

      {!diary.loading && diary.cases.length === 0 ? (
        <View style={[styles.empty, { borderColor: colors.border }]}>
          <AppText style={styles.emptyTitle}>No matters yet.</AppText>
          <AppText variant="small" tone="muted">
            Add a matter with its next date, then log what happens on each date — the running record,
            not just the diary entry.
          </AppText>
          <AppText variant="micro" tone="faint" style={styles.emptyNote}>
            Matters are stored on this device only. They are not uploaded, and they do not appear on
            the website — use Export there and Import here to move them across.
          </AppText>
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            filter ? (
              <AppText tone="muted">No matter matches “{filter}”.</AppText>
            ) : null
          }
          renderItem={({ item }) => (
            <CaseRow
              c={item}
              onPress={() => {
                track("diary_case_opened", {});
                router.push(`/diary/${item.id}`);
              }}
            />
          )}
        />
      )}
    </Screen>
  );
}

/**
 * The bridge between devices. The diary is local to each one (D-029), so an
 * export file is the ONLY way a matter added in the browser reaches the phone —
 * which makes this not a power-user extra but the answer to "why is my diary
 * empty here". Import merges by id, so re-importing a backup is safe.
 *
 * Clipboard rather than a file picker: it needs no new dependency, and pasting
 * is what someone does with a file they just mailed themselves anyway.
 */
function Transfer({ diary }: { diary: ReturnType<typeof useCaseDiary> }) {
  const { colors } = useTheme();
  const [pasting, setPasting] = useState(false);
  const [raw, setRaw] = useState("");

  const doImport = async () => {
    const result = await diary.importJson(raw);
    setRaw("");
    setPasting(false);
    Alert.alert(
      result.ok ? "Imported" : "Could not import",
      result.ok
        ? result.added === 0
          ? "Those matters were already in your diary."
          : `Added ${result.added} ${result.added === 1 ? "matter" : "matters"}.`
        : (result.error ?? "That file could not be read."),
    );
  };

  if (pasting) {
    return (
      <View style={[styles.transferBox, { borderColor: colors.border }]}>
        <AppText variant="micro" tone="muted">
          Paste the export from the website
        </AppText>
        <TextInput
          placeholder="[ { … } ]"
          placeholderTextColor={colors.textFaint}
          value={raw}
          onChangeText={setRaw}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.paste,
            { borderColor: colors.border, backgroundColor: colors.bg, color: colors.text },
          ]}
        />
        <View style={styles.transferRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void Clipboard.getStringAsync().then(setRaw)}
            style={styles.transferBtn}>
            <AppText variant="small" tone="brand">
              Paste from clipboard
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!raw.trim()}
            onPress={() => void doImport()}
            style={styles.transferBtn}>
            <AppText variant="small" tone={raw.trim() ? "brand" : "faint"}>
              Import
            </AppText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setPasting(false)} style={styles.transferBtn}>
            <AppText variant="small" tone="muted">
              Cancel
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.transferRow}>
      <Pressable accessibilityRole="button" onPress={() => setPasting(true)} style={styles.transferBtn}>
        <AppText variant="small" tone="muted">
          Import
        </AppText>
      </Pressable>
      {diary.cases.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            void diary.exportJson().then((json) =>
              Share.share({ message: json }).catch(() => {
                /* dismissed */
              }),
            )
          }
          style={styles.transferBtn}>
          <AppText variant="small" tone="muted">
            Export
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Relative wording, because "in 3 days" is read faster than a date. */
function hearingLabel(iso: string): { text: string; tone: "danger" | "brand" | "muted" } {
  const d = daysUntil(iso);
  if (d === null) return { text: "No date", tone: "muted" };
  if (d < 0) return { text: `${Math.abs(d)}d overdue`, tone: "danger" };
  if (d === 0) return { text: "Today", tone: "danger" };
  if (d === 1) return { text: "Tomorrow", tone: "brand" };
  if (d <= 7) return { text: `In ${d} days`, tone: "brand" };
  return {
    text: new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }),
    tone: "muted",
  };
}

function CaseRow({ c, onPress }: { c: DiaryCase; onPress: () => void }) {
  const { colors } = useTheme();
  const label = hearingLabel(c.nextHearing);
  const openTodos = c.todos.filter((t) => !t.done).length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${c.title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={styles.rowMain}>
        <AppText style={styles.rowTitle} numberOfLines={1}>
          {c.title}
        </AppText>
        <AppText variant="small" tone="muted" numberOfLines={1}>
          {[c.court, c.caseNumber, c.stage].filter(Boolean).join(" · ") || "No details yet"}
        </AppText>
        {openTodos > 0 ? (
          <AppText variant="micro" tone="faint">
            {openTodos} to do
          </AppText>
        ) : null}
      </View>
      <AppText variant="small" tone={label.tone} style={styles.rowDate}>
        {label.text}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: sp(1) },
  add: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: sp(1),
    height: 48,
    borderRadius: radius.md,
  },
  addText: { fontWeight: "700" },
  filter: {
    height: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: sp(3),
    fontSize: 16,
  },
  list: { paddingBottom: sp(6), gap: sp(2) },
  transferRow: { flexDirection: "row", alignItems: "center", gap: sp(2) },
  transferBtn: { minHeight: 40, justifyContent: "center", paddingHorizontal: sp(1) },
  transferBox: { borderWidth: 1, borderRadius: radius.md, padding: sp(3), gap: sp(2) },
  paste: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: sp(2),
    fontSize: 13,
    textAlignVertical: "top",
  },
  empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: radius.md, padding: sp(4), gap: sp(2) },
  emptyTitle: { fontWeight: "700" },
  emptyNote: { marginTop: sp(1) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(3),
    borderWidth: 1,
    borderRadius: radius.md,
    padding: sp(3),
    marginBottom: sp(2),
  },
  rowMain: { flex: 1, gap: sp(1) },
  rowTitle: { fontWeight: "600", fontSize: 16 },
  rowDate: { fontWeight: "700" },
});
