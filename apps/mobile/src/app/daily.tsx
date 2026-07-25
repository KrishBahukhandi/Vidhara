import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";

import { McqCard } from "@/components/acts/mcq-card";
import { AppText } from "@/components/ui/app-text";
import { Screen } from "@/components/ui/screen";
import { getMcq, type Mcq } from "@/features/acts/api";
import { track } from "@/lib/analytics";
import { useDailyMcq } from "@/lib/local-library";
import { WEB_URL } from "@/lib/site";
import { radius, sp, useTheme } from "@/theme";

/** Today's one question — the habit anchor. Practice mode is a separate screen. */
export default function DailyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [mcq, setMcq] = useState<Mcq | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [picked, setPicked] = useState<number | null>(null);
  const viewed = useRef(false);

  const { streak, todayChoice, submit } = useDailyMcq(mcq?.date ?? null);

  useEffect(() => {
    getMcq("daily").then((r) => {
      if (!r.ok) {
        setStatus("error");
        return;
      }
      setMcq(r.data);
      setStatus("ready");
    });
  }, []);

  useEffect(() => {
    if (mcq && !viewed.current) {
      viewed.current = true;
      track("daily_mcq_viewed", { date: mcq.date, type: mcq.type });
    }
  }, [mcq]);

  const chosen = picked ?? todayChoice;

  const onPick = (i: number) => {
    if (chosen !== null || !mcq) return;
    setPicked(i);
    const correct = i === mcq.answerIndex;
    void submit(i, correct);
    track("daily_mcq_answered", { correct, date: mcq.date, type: mcq.type });
  };

  const onShare = () => {
    void Share.share({
      message: `Can you crack today's old-law → new-law quiz on Vidhara? ${WEB_URL}/daily`,
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

      <View style={styles.header}>
        <AppText variant="h1" serif>
          Daily Quiz
        </AppText>
        {streak > 0 ? (
          <View
            style={[styles.streak, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <AppText variant="small" style={styles.streakLabel}>
              🔥 {streak}
            </AppText>
          </View>
        ) : null}
      </View>

      {status === "loading" ? <AppText tone="muted">Loading today’s question…</AppText> : null}
      {status === "error" ? (
        <AppText tone="muted">Couldn’t load today’s question. Please try again shortly.</AppText>
      ) : null}

      {mcq ? <McqCard mcq={mcq} chosen={chosen} onPick={onPick} /> : null}

      {mcq && chosen !== null ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/practice")}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.brand, opacity: pressed ? 0.9 : 1 },
            ]}>
            <AppText tone="onBrand" style={styles.primaryLabel}>
              Keep practising
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share the daily quiz"
            onPress={onShare}
            style={({ pressed }) => [
              styles.shareBtn,
              { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
            ]}>
            <Ionicons name="share-outline" size={16} color={colors.textMuted} />
            <AppText variant="small" tone="muted">
              Share
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { minHeight: 44, minWidth: 44, justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  streak: { borderWidth: 1, borderRadius: 999, paddingHorizontal: sp(3), paddingVertical: sp(1) },
  streakLabel: { fontWeight: "600" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: sp(3), alignItems: "center" },
  primaryBtn: {
    borderRadius: radius.sm,
    paddingHorizontal: sp(5),
    paddingVertical: sp(3),
    alignSelf: "flex-start",
  },
  primaryLabel: { fontWeight: "600" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(2),
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: sp(4),
    paddingVertical: sp(3),
    alignSelf: "flex-start",
  },
});
