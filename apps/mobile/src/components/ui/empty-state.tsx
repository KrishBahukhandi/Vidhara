import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "./app-text";
import { Button } from "./button";
import { sp, useTheme } from "@/theme";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  headline: string;
  guidance: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** design.md §11: every screen ships a real empty state — headline, one line of guidance, action. */
export function EmptyState({ icon, headline, guidance, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.root}>
      <Ionicons name={icon} size={40} color={colors.textFaint} />
      <AppText variant="h3" style={styles.center}>
        {headline}
      </AppText>
      <AppText tone="muted" style={styles.center}>
        {guidance}
      </AppText>
      {actionLabel && onAction ? <Button label={actionLabel} variant="secondary" onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", gap: sp(3), padding: sp(6) },
  center: { textAlign: "center" },
});
