import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import * as Sharing from "expo-sharing";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import { daysUntil, todayISO, type CaseDocument, type DiaryCase } from "@nexlex/shared";

import { AppText } from "@/components/ui/app-text";
import { Screen } from "@/components/ui/screen";
import {
  attachFromCamera,
  attachFromFiles,
  attachFromLibrary,
  documentExists,
  formatSize,
} from "@/features/diary/documents";
import { useCaseDiary } from "@/features/diary/store";
import { track } from "@/lib/analytics";
import { radius, sp, useTheme } from "@/theme";

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * One matter: its next date, the order sheet, what to carry, the sections it
 * turns on, and any limitation worked out for it.
 *
 * The order-sheet entry is the reason this screen exists on a phone — it gets
 * written standing outside the court room, minutes after the order, which is
 * exactly when a laptop is not available and the details are still fresh.
 */
export default function CaseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const diary = useCaseDiary();
  const c = diary.cases.find((x) => x.id === id);

  if (diary.loading) return <Screen><AppText tone="muted">Loading…</AppText></Screen>;
  if (!c) {
    return (
      <Screen>
        <AppText tone="muted">That matter is no longer in your diary.</AppText>
      </Screen>
    );
  }

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
        {c.title}
      </AppText>
      <AppText variant="small" tone="muted">
        {[c.court, c.caseNumber, c.stage].filter(Boolean).join(" · ") || "No details yet"}
      </AppText>

      <NextDate c={c} />
      {c.limitation ? <LimitationCard c={c} /> : null}
      <LogHearing c={c} onLog={diary.logHearing} />
      <Todos c={c} diary={diary} />
      <Documents c={c} diary={diary} />
      {c.sections.length > 0 ? <Sections c={c} /> : null}
      {c.notes ? (
        <Card title="Notes">
          <AppText>{c.notes}</AppText>
        </Card>
      ) : null}
      {c.hearings.length > 0 ? (
        <Card title="Order sheet">
          {c.hearings.map((h) => (
            <View key={h.id} style={styles.entry}>
              <AppText variant="small" tone="brand" style={styles.entryDate}>
                {longDate(h.date)}
              </AppText>
              <AppText>{h.note}</AppText>
            </View>
          ))}
        </Card>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          Alert.alert("Delete matter", `Delete “${c.title}”? This can't be undone.`, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                void diary.remove(c.id);
                router.back();
              },
            },
          ])
        }
        style={styles.delete}>
        <AppText variant="small" tone="danger">
          Delete this matter
        </AppText>
      </Pressable>
    </Screen>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <AppText variant="micro" tone="muted" style={styles.cardTitle}>
        {title.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

function NextDate({ c }: { c: DiaryCase }) {
  const d = daysUntil(c.nextHearing);
  return (
    <Card title="Next date">
      {c.nextHearing ? (
        <>
          <AppText style={styles.big}>{longDate(c.nextHearing)}</AppText>
          <AppText variant="small" tone={d !== null && d < 0 ? "danger" : "muted"}>
            {d === null
              ? ""
              : d < 0
                ? `${Math.abs(d)} days overdue`
                : d === 0
                  ? "Today"
                  : `In ${d} ${d === 1 ? "day" : "days"}`}
          </AppText>
        </>
      ) : (
        <AppText tone="muted">Not fixed.</AppText>
      )}
    </Card>
  );
}

/**
 * Information, not an alarm. Nothing in the product watches this date — no
 * reminder fires — so a countdown badge would imply supervision that does not
 * exist (D-041, D-043).
 */
function LimitationCard({ c }: { c: DiaryCase }) {
  const lim = c.limitation!;
  return (
    <Card title="Limitation">
      <AppText variant="small" tone="muted">
        Article {lim.article} · {lim.period}
      </AppText>
      <AppText style={styles.big}>Ends {longDate(lim.expiresOn)}</AppText>
      <AppText variant="micro" tone="faint">
        From {lim.runsFrom.toLowerCase().replace(/\.$/, "")} — {longDate(lim.startOn)}. Recheck it
        against the file.
      </AppText>
    </Card>
  );
}

/**
 * Log what happened and, in the same action, move the matter to its next date.
 * Those are one event in practice — an adjournment is both — and splitting them
 * into two screens is how next dates end up not being updated.
 */
function LogHearing({
  c,
  onLog,
}: {
  c: DiaryCase;
  onLog: (id: string, e: { date: string; note: string; nextHearing?: string }) => Promise<void>;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [next, setNext] = useState("");

  const field = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.bg, color: colors.text },
  ];

  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: colors.brand, opacity: pressed ? 0.9 : 1 },
        ]}>
        <AppText tone="onBrand" style={styles.primaryText}>
          Log what happened today
        </AppText>
      </Pressable>
    );
  }

  return (
    <Card title="What happened">
      <TextInput
        placeholder="Order passed, adjourned and why, what to file next…"
        placeholderTextColor={colors.textFaint}
        value={note}
        onChangeText={setNote}
        multiline
        style={[...field, styles.multiline]}
      />
      <AppText variant="micro" tone="muted" style={styles.label}>
        Next date (YYYY-MM-DD) — leave blank to keep {c.nextHearing || "none"}
      </AppText>
      <TextInput
        placeholder="2026-09-15"
        placeholderTextColor={colors.textFaint}
        value={next}
        onChangeText={setNext}
        autoCapitalize="none"
        style={field}
      />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={!note.trim()}
          onPress={() => {
            void onLog(c.id, {
              date: todayISO(),
              note: note.trim(),
              ...(/^\d{4}-\d{2}-\d{2}$/.test(next.trim()) ? { nextHearing: next.trim() } : {}),
            });
            track("diary_hearing_logged", {});
            setNote("");
            setNext("");
            setOpen(false);
          }}
          style={({ pressed }) => [
            styles.primary,
            styles.grow,
            { backgroundColor: colors.brand, opacity: pressed || !note.trim() ? 0.6 : 1 },
          ]}>
          <AppText tone="onBrand" style={styles.primaryText}>
            Save
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.ghost}>
          <AppText tone="muted">Cancel</AppText>
        </Pressable>
      </View>
    </Card>
  );
}

function Todos({ c, diary }: { c: DiaryCase; diary: ReturnType<typeof useCaseDiary> }) {
  const { colors } = useTheme();
  const [text, setText] = useState("");

  return (
    <Card title="To carry / to file">
      {c.todos.map((t) => (
        <Pressable
          key={t.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: t.done }}
          onPress={() => void diary.toggleTodo(c.id, t.id)}
          onLongPress={() => void diary.removeTodo(c.id, t.id)}
          style={styles.todo}>
          <Ionicons
            name={t.done ? "checkbox" : "square-outline"}
            size={20}
            color={t.done ? colors.brand : colors.textFaint}
          />
          <AppText style={t.done ? styles.done : undefined}>{t.text}</AppText>
        </Pressable>
      ))}
      <View style={styles.actions}>
        <TextInput
          placeholder="Vakalatnama, certified copy…"
          placeholderTextColor={colors.textFaint}
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => {
            if (!text.trim()) return;
            void diary.addTodo(c.id, text.trim());
            setText("");
          }}
          returnKeyType="done"
          style={[
            styles.input,
            styles.grow,
            { borderColor: colors.border, backgroundColor: colors.bg, color: colors.text },
          ]}
        />
      </View>
      {c.todos.length > 0 ? (
        <AppText variant="micro" tone="faint">
          Tap to tick · long-press to remove
        </AppText>
      ) : null}
    </Card>
  );
}

/**
 * Documents held for this matter. The files sit in the app's own sandbox and
 * are never uploaded (D-047) — so the panel says where they are, once, rather
 * than leaving an advocate to assume there is a copy in the cloud.
 *
 * A record whose file is missing is shown as missing rather than hidden or
 * silently opened: that is what an imported diary from another phone looks
 * like, and pretending otherwise would be worse than the gap itself.
 */
function Documents({ c, diary }: { c: DiaryCase; diary: ReturnType<typeof useCaseDiary> }) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const docs = c.documents ?? [];

  const attach = async (pick: () => Promise<CaseDocument | null>) => {
    setBusy(true);
    try {
      const doc = await pick();
      if (doc) {
        await diary.attachDocument(c.id, doc);
        track("diary_document_attached", {});
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (doc: CaseDocument) =>
    Alert.alert("Remove document", `Delete “${doc.name}” from this device?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void diary.removeDocument(c.id, doc.id),
      },
    ]);

  return (
    <Card title="Documents">
      {docs.map((doc) => {
        const present = documentExists(doc);
        return (
          <Pressable
            key={doc.id}
            accessibilityRole="button"
            accessibilityLabel={`${doc.name}${present ? "" : ", file missing"}`}
            onPress={() => {
              if (!present) {
                Alert.alert(
                  "File not on this device",
                  "This document was attached on another device. The diary entry travelled with your export, but the file itself did not.",
                );
                return;
              }
              void Sharing.isAvailableAsync().then((can) => {
                if (can) void Sharing.shareAsync(doc.uri);
              });
            }}
            onLongPress={() => confirmRemove(doc)}
            style={styles.doc}>
            <Ionicons
              name={
                present
                  ? doc.mimeType?.startsWith("image/")
                    ? "image-outline"
                    : "document-text-outline"
                  : "alert-circle-outline"
              }
              size={20}
              color={present ? colors.brand : colors.danger}
            />
            <View style={styles.grow}>
              <AppText numberOfLines={1}>{doc.name}</AppText>
              <AppText variant="micro" tone={present ? "faint" : "danger"}>
                {present
                  ? [formatSize(doc.size), new Date(doc.addedAt).toLocaleDateString("en-IN")]
                      .filter(Boolean)
                      .join(" · ")
                  : "Not on this device"}
              </AppText>
            </View>
          </Pressable>
        );
      })}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void attach(attachFromCamera)}
          style={styles.docAction}>
          <Ionicons name="camera-outline" size={18} color={colors.brand} />
          <AppText variant="small" tone="brand">
            Photo
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void attach(attachFromLibrary)}
          style={styles.docAction}>
          <Ionicons name="images-outline" size={18} color={colors.brand} />
          <AppText variant="small" tone="brand">
            Gallery
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void attach(attachFromFiles)}
          style={styles.docAction}>
          <Ionicons name="folder-outline" size={18} color={colors.brand} />
          <AppText variant="small" tone="brand">
            File
          </AppText>
        </Pressable>
      </View>

      <AppText variant="micro" tone="faint">
        {docs.length > 0 ? "Tap to open · long-press to delete. " : ""}
        Kept on this phone only, never uploaded. Export carries the list, not the files — on another
        device they show as missing.
      </AppText>
    </Card>
  );
}

function Sections({ c }: { c: DiaryCase }) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Card title="Sections">
      <View style={styles.chips}>
        {c.sections.map((s) => (
          <Pressable
            key={`${s.slug}-${s.number}`}
            accessibilityRole="button"
            onPress={() => router.push(`/acts/${s.slug}/${encodeURIComponent(s.number)}`)}
            style={[styles.chip, { borderColor: colors.border }]}>
            <AppText variant="small" tone="brand" style={styles.chipText}>
              {s.act} §{s.number}
            </AppText>
            {s.counterpart ? (
              <AppText variant="micro" tone="muted">
                {s.counterpart}
              </AppText>
            ) : null}
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  back: { minHeight: 44, minWidth: 44, justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: radius.md, padding: sp(3), gap: sp(2) },
  cardTitle: { fontWeight: "700", letterSpacing: 0.5 },
  big: { fontSize: 17, fontWeight: "600" },
  entry: { gap: sp(1) },
  entryDate: { fontWeight: "700" },
  input: { minHeight: 44, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: sp(3), fontSize: 16 },
  multiline: { minHeight: 88, paddingTop: sp(2), textAlignVertical: "top" },
  label: { marginTop: sp(1) },
  actions: { flexDirection: "row", alignItems: "center", gap: sp(2) },
  grow: { flex: 1 },
  primary: { height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  primaryText: { fontWeight: "700" },
  ghost: { height: 48, paddingHorizontal: sp(3), alignItems: "center", justifyContent: "center" },
  todo: { flexDirection: "row", alignItems: "center", gap: sp(2), minHeight: 40 },
  doc: { flexDirection: "row", alignItems: "center", gap: sp(2), minHeight: 48 },
  docAction: { flexDirection: "row", alignItems: "center", gap: sp(1), minHeight: 44, paddingRight: sp(2) },
  done: { textDecorationLine: "line-through", opacity: 0.6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: sp(2) },
  chip: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: sp(2), paddingVertical: sp(1) },
  chipText: { fontWeight: "700" },
  delete: { minHeight: 44, justifyContent: "center", marginTop: sp(2) },
});
