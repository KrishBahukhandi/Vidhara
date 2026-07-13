export interface ThemedColor {
  light: string;
  dark: string;
}

export type ColorTokenName =
  | "brand"
  | "brandStrong"
  | "accent"
  | "onBrand"
  | "bg"
  | "surface"
  | "surfaceRaised"
  | "border"
  | "text"
  | "textMuted"
  | "textFaint"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "mapSame"
  | "mapChanged"
  | "mapNew"
  | "mapOmitted";

export declare const colors: Record<ColorTokenName, ThemedColor>;
export declare function cssVarName(key: string): string;
export declare const spacing: number[];
export declare const radius: { sm: number; md: number; lg: number };
export declare const typeScale: Record<
  "display" | "h1" | "h2" | "h3" | "bodyLg" | "body" | "small" | "micro",
  { size: number; line: number }
>;
export declare const fonts: { serif: string; sans: string; mono: string };
export declare const durations: { pressed: number; fast: number; base: number; slow: number };
export declare const easing: string;
