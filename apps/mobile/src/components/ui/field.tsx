import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { AppText } from "./app-text";
import { radius, sp, useTheme } from "@/theme";

interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
}

/** design.md §6 Forms: label always visible above input; error below in danger tone. */
export function Field({ label, error, ...rest }: FieldProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <AppText variant="small" tone="muted" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textFaint}
        {...rest}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            color: colors.text,
          },
        ]}
      />
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: sp(1) },
  label: { fontWeight: "500" },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: sp(3),
    fontSize: 16,
  },
});
