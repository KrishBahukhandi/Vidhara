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
  /** Floating layer pinned over the content (e.g. a FAB) — stays put while the
   * content scrolls. `box-none` lets touches pass through everywhere except the
   * overlay's own children. */
  overlay?: ReactNode;
}

/** Base screen wrapper: themed background, safe areas, keyboard avoidance. */
export function Screen({ children, scroll = true, padBottom = false, overlay }: ScreenProps) {
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
      {overlay ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {overlay}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  inner: { flex: 1, paddingHorizontal: sp(4), gap: sp(4) },
});
