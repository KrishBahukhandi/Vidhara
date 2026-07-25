import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import type { Mcq } from "@/features/acts/api";
import { radius, sp, useTheme } from "@/theme";

const LETTERS = ["A", "B", "C", "D"];

/**
 * One quiz question — shared by the Daily question and Practice mode.
 * Presentational: the parent owns answer state (daily locks to one per day;
 * practice advances to the next question).
 */
export function McqCard({
  mcq,
  chosen,
  onPick,
}: {
  mcq: Mcq;
  chosen: number | null;
  onPick: (i: number) => void;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const answered = chosen !== null;
  const isCorrect = answered && chosen === mcq.answerIndex;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <AppText tone="muted">{mcq.prompt}</AppText>
      <AppText variant="h2" serif style={styles.subject}>
        {mcq.subject}
      </AppText>
      <AppText tone="muted">{mcq.subjectNote}</AppText>

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
              accessibilityLabel={`Option ${LETTERS[i]}: ${opt}`}
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
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push(`/acts/${mcq.readSlug}/${encodeURIComponent(mcq.readNumber)}`)
            }
            style={({ pressed }) => [
              styles.readBtn,
              { borderColor: colors.brand, opacity: pressed ? 0.85 : 1 },
            ]}>
            <AppText style={{ color: colors.brand, fontWeight: "600" }}>
              Read {mcq.readLabel}
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: sp(4), gap: sp(2) },
  subject: { marginTop: sp(2) },
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
  readBtn: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: sp(4),
    paddingVertical: sp(2),
    alignSelf: "flex-start",
    marginTop: sp(2),
  },
});
