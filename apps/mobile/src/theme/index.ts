/**
 * App theme — the typed bridge from @nexlex/tokens (single source, docs/design.md)
 * to React Native styles. Components consume `useTheme()`; nothing in the app
 * hardcodes a color value (rules enforced in review).
 */
import { colors, radius, typeScale, durations, type ColorTokenName } from "@nexlex/tokens";
import { useColorScheme } from "react-native";

export type SchemeColors = Record<ColorTokenName, string>;

function schemePalette(scheme: "light" | "dark"): SchemeColors {
  const entries = Object.entries(colors).map(([name, themed]) => [name, themed[scheme]]);
  return Object.fromEntries(entries) as SchemeColors;
}

export const palettes: Record<"light" | "dark", SchemeColors> = {
  light: schemePalette("light"),
  dark: schemePalette("dark"),
};

/** Type scale in device pixels (1rem = 16). */
export const type = Object.fromEntries(
  Object.entries(typeScale).map(([name, { size, line }]) => [
    name,
    { fontSize: size * 16, lineHeight: Math.round(size * 16 * line) },
  ]),
) as Record<keyof typeof typeScale, { fontSize: number; lineHeight: number }>;

/** Spacing scale (design.md §4): sp(1)=4px … sp(4)=16px, matching the 4px base. */
export const sp = (step: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16): number => step * 4;

export { radius, durations };

export interface Theme {
  scheme: "light" | "dark";
  colors: SchemeColors;
}

export function useTheme(): Theme {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return { scheme, colors: palettes[scheme] };
}
