import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { McqCard } from "@/components/acts/mcq-card";
import { AppText } from "@/components/ui/app-text";
import { Screen } from "@/components/ui/screen";
import { getMcq, type Mcq } from "@/features/acts/api";
import { track } from "@/lib/analytics";
import { radius, sp, useTheme } from "@/theme";

/**
 * Practice mode: unlimited auto-generated questions with a running session
 * score. Same grounded engine as the Daily question (real mappings only);
 * `exclude` carries recently-seen ids so a session doesn't repeat itself.
 */
export default function PracticeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [mcq, setMcq] = useState<Mcq | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const seen = useRef<string[]>([]);

  const load = useCallback(async () => {
    setStatus("loading");
    setPicked(null);
    const r = await getMcq("practice", seen.current);
    if (!r.ok) {
      setStatus("error");
      return;
    }
    seen.current.push(r.data.id);
    setMcq(r.data);
    setStatus("ready");
  }, []);

  useEffect(() => {
    void load();
    track("practice_started", {});
  }, [load]);

  const onPick = (i: number) => {
    if (picked !== null || !mcq) return;
    setPicked(i);
    const correct = i === mcq.answerIndex;
    setScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }));
    track("practice_answered", { correct, type: mcq.type, index: score.total + 1 });
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

      <View style={styles.header}>
        <AppText variant="h1" serif>
          Practice
        </AppText>
        {score.total > 0 ? (
          <View
            style={[styles.score, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <AppText variant="small" style={styles.scoreLabel}>
              {score.right}/{score.total}
            </AppText>
          </View>
        ) : null}
      </View>

      {status === "error" ? (
        <View style={styles.errorBox}>
          <AppText tone="muted">Couldn’t load a question. Please try again.</AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            style={({ pressed }) => [
              styles.retry,
              { borderColor: colors.brand, opacity: pressed ? 0.85 : 1 },
            ]}>
            <AppText style={{ color: colors.brand, fontWeight: "600" }}>Retry</AppText>
          </Pressable>
        </View>
      ) : null}

      {status === "loading" && !mcq ? <AppText tone="muted">Loading a question…</AppText> : null}

      {mcq && status !== "error" ? (
        <>
          <McqCard mcq={mcq} chosen={picked} onPick={onPick} />
          {picked !== null ? (
            <Pressable
              accessibilityRole="button"
              disabled={status === "loading"}
              onPress={() => void load()}
              style={({ pressed }) => [
                styles.nextBtn,
                { backgroundColor: colors.brand, opacity: pressed ? 0.9 : 1 },
              ]}>
              <AppText tone="onBrand" style={styles.nextLabel}>
                {status === "loading" ? "Loading…" : "Next question →"}
              </AppText>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { minHeight: 44, minWidth: 44, justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  score: { borderWidth: 1, borderRadius: 999, paddingHorizontal: sp(3), paddingVertical: sp(1) },
  scoreLabel: { fontWeight: "600" },
  errorBox: { gap: sp(3) },
  retry: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: sp(4),
    paddingVertical: sp(2),
    alignSelf: "flex-start",
  },
  nextBtn: {
    borderRadius: radius.sm,
    paddingHorizontal: sp(5),
    paddingVertical: sp(3),
    alignSelf: "flex-start",
  },
  nextLabel: { fontWeight: "600" },
});
