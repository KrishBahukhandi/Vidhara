/**
 * Shared Tailwind preset consumed by BOTH renderers:
 *   - apps/mobile: NativeWind (Tailwind v3 engine)
 *   - apps/web:    Tailwind v3
 *
 * Colors reference the CSS variables emitted by scripts/gen-css.cjs, so light/dark
 * theming is handled by the cascade (prefers-color-scheme + [data-theme]) — components
 * use semantic classes (bg-surface, text-text-muted) and never know about themes.
 *
 * Note: var()-based colors don't support Tailwind opacity modifiers (bg-brand/50).
 * That is acceptable by design — design.md mandates solid token colors.
 */
const { colors, cssVarName, radius, typeScale, fonts, durations } = require("./tokens.cjs");

const kebab = (key) => key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

const colorScale = Object.fromEntries(
  Object.keys(colors).map((key) => [kebab(key), `var(${cssVarName(key)})`]),
);

const fontSize = Object.fromEntries(
  Object.entries(typeScale).map(([key, { size, line }]) => [
    kebab(key),
    [`${size}rem`, `${line}`],
  ]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: colorScale,
      borderRadius: {
        sm: `${radius.sm}px`,
        md: `${radius.md}px`,
        lg: `${radius.lg}px`,
      },
      fontFamily: {
        serif: [fonts.serif, "Georgia", "serif"],
        sans: [fonts.sans, "system-ui", "sans-serif"],
        mono: [fonts.mono, "Menlo", "monospace"],
      },
      fontSize,
      transitionDuration: {
        pressed: `${durations.pressed}ms`,
        fast: `${durations.fast}ms`,
        base: `${durations.base}ms`,
        slow: `${durations.slow}ms`,
      },
      maxWidth: {
        measure: "68ch", // reading column cap (design.md §3)
        content: "72rem",
      },
    },
  },
};
