import { Text, type TextProps } from "react-native";

import { type as typeScale, useTheme } from "@/theme";

type Variant = keyof typeof typeScale;
type Tone = "default" | "muted" | "faint" | "brand" | "danger" | "onBrand";

interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  /** Serif is reserved for statute/long-form reading text (design.md §3). */
  serif?: boolean;
}

export function AppText({
  variant = "body",
  tone = "default",
  serif = false,
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  const toneColor: Record<Tone, string> = {
    default: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    brand: colors.brand,
    danger: colors.danger,
    onBrand: colors.onBrand,
  };

  return (
    <Text
      {...rest}
      style={[
        typeScale[variant],
        { color: toneColor[tone], fontFamily: serif ? "SourceSerif4" : undefined },
        style,
      ]}
    />
  );
}
