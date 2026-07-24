import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Screen } from "@/components/ui/screen";
import { getDailyMcq, type DailyMcq } from "@/features/acts/api";
import { track } from "@/lib/analytics";
import { useDailyMcq } from "@/lib/local-library";
import { WEB_URL } from "@/lib/site";
import { radius, sp, useTheme } from "@/theme";

const LETTERS = ["A", "B", "C", "D"];

export default function DailyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [mcq, setMcq] = useState<DailyMcq | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [picked, setPicked] = useState<number | null>(null);
  const viewed = useRef(false);

  const { streak, todayChoice, submit } = useDailyMcq(mcq?.date ?? null);

  useEffect(() => {
    getDailyMcq().then((r) => {
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
      track("daily_mcq_viewed", { date: mcq.date });
    }
  }, [mcq]);

  const chosen = picked ?? todayChoice;
  const answered = chosen != null;
  const isCorrect = answered && mcq ? chosen === mcq.answerIndex : false;

  const onPick = (i: number) => {
    if (answered || !mcq) return;
    setPicked(i);
    const correct = i === mcq.answerIndex;
    void submit(i, correct);
    track("daily_mcq_answered", { correct, date: mcq.date, mapping_type: mcq.mappingType });
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
          <View style={[styles.streak, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <AppText variant="small" style={styles.streakLabel}>
              🔥 {streak}
            </AppText>
          </View>
        ) : null}
      </View>

      {status === "loading" ? <AppText tone="muted">Loading today’s question…</AppText> : null}
      {status === "error" ? (
        <AppText tone="muted">Couldn’t load today’s question. Pull to refresh in a moment.</AppText>
      ) : null}

      {mcq ? (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <AppText tone="muted">{mcq.prompt}</AppText>
          <AppText variant="h2" serif style={styles.oldRef}>
            {mcq.oldRef}
          </AppText>
          <AppText tone="muted">{mcq.oldNote}</AppText>

          <View style={styles.options}>
            {mcq.options.map((opt, i) => {
              const isAnswer = i === mcq.answerIndex;
              const isChosen = i === chosen;
              let borderColor = colors.border;
              let backgroundColor = colors.bg;
              let opacity = 1;
              if (answered) {
                backgroundColor = colors.surface;
                if (isAnswer) borderColor = colors.success;
                else if (isChosen) borderColor = colors.danger;
                else opacity = 0.6;
              }
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  disabled={answered}
                  onPress={() => onPick(i)}
                  style={({ pressed }) => [
                    styles.option,
                    { borderColor, backgroundColor, opacity: pressed && !answered ? 0.85 : opacity },
                  ]}>
                  <View style={[styles.letter, { borderColor: colors.border }]}>
                    <AppText variant="small" tone="muted">
                      {LETTERS[i]}
                    </AppText>
                  </View>
                  <AppText style={styles.optionText}>{opt}</AppText>
                  {answered && isAnswer ? (
                    <Ionicons name="checkmark" size={18} color={colors.success} />
                  ) : null}
                  {answered && isChosen && !isAnswer ? (
                    <Ionicons name="close" size={18} color={colors.danger} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {answered ? (
            <View style={[styles.result, { borderTopColor: colors.border }]}>
              <AppText style={{ color: isCorrect ? colors.success : colors.danger, fontWeight: "700" }}>
                {isCorrect ? "Correct!" : `Not quite — the answer is ${mcq.answer}.`}
              </AppText>
              <AppText tone="muted" style={styles.explanation}>
                {mcq.explanation}
              </AppText>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(`/acts/${mcq.sourceSlug}/${encodeURIComponent(mcq.sourceNumber)}`)
                  }
                  style={({ pressed }) => [
                    styles.readBtn,
                    { borderColor: colors.brand, opacity: pressed ? 0.85 : 1 },
                  ]}>
                  <AppText style={{ color: colors.brand, fontWeight: "600" }}>Read {mcq.oldRef}</AppText>
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
              <AppText variant="micro" tone="faint" style={styles.tomorrow}>
                A new question drops every day. See you tomorrow. 👋
              </AppText>
            </View>
          ) : null}
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
  card: { borderWidth: 1, borderRadius: radius.md, padding: sp(4), gap: sp(2) },
  oldRef: { marginTop: sp(2) },
  options: { gap: sp(3), marginTop: sp(3) },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(3),
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: sp(4),
    paddingVertical: sp(3),
  },
  letter: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { fontWeight: "600", flex: 1 },
  result: { borderTopWidth: 1, paddingTop: sp(4), marginTop: sp(4), gap: sp(2) },
  explanation: { marginTop: sp(1) },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: sp(3), marginTop: sp(3) },
  readBtn: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: sp(4),
    paddingVertical: sp(2),
    alignSelf: "flex-start",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(2),
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: sp(4),
    paddingVertical: sp(2),
    alignSelf: "flex-start",
  },
  tomorrow: { marginTop: sp(3) },
});
