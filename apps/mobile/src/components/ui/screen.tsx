import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { sp, useTheme } from "@/theme";

interface ScreenProps {
  children: ReactNode;
  /** Scrollable content (default). Set false for fixed layouts (readers, chat). */
  scroll?: boolean;
  /** Extra bottom inset for screens without the tab bar (auth flow). */
  padBottom?: boolean;
}

/** Base screen wrapper: themed background, safe areas, keyboard avoidance. */
export function Screen({ children, scroll = true, padBottom = false }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const inner = (
    <View
      style={[
        styles.inner,
        { paddingTop: insets.top + sp(4), paddingBottom: padBottom ? insets.bottom + sp(4) : sp(4) },
      ]}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  inner: { flex: 1, paddingHorizontal: sp(4), gap: sp(4) },
});
