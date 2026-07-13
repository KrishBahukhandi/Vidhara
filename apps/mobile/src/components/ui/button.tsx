import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from "react-native";

import { AppText } from "./app-text";
import { radius, sp, useTheme } from "@/theme";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

/** design.md §6 Buttons: md size (44px min touch target), loading locks width. */
export function Button({ label, variant = "primary", loading = false, disabled, ...rest }: ButtonProps) {
  const { colors } = useTheme();

  const background: Record<Variant, string> = {
    primary: colors.brand,
    secondary: colors.surface,
    ghost: "transparent",
    destructive: colors.danger,
  };
  const labelTone = variant === "secondary" || variant === "ghost" ? "brand" : "onBrand";
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background[variant],
          borderColor: variant === "secondary" ? colors.border : "transparent",
          borderWidth: variant === "secondary" ? 1 : 0,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "destructive" ? "#FFFFFF" : colors.brand} />
      ) : (
        <AppText tone={labelTone} style={styles.label}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: sp(5),
    paddingVertical: sp(3),
  },
  label: { fontWeight: "600" },
});
