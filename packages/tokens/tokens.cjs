/**
 * NexLex design tokens — SINGLE SOURCE OF TRUTH.
 * Canonical spec: docs/design.md §2–§7. Change there first, here second,
 * then run `pnpm --filter @nexlex/tokens gen` to regenerate dist/variables.css.
 *
 * CommonJS on purpose: consumed at config time by tailwind.config.cjs in both
 * apps (Node require) and at runtime via the generated CSS variables.
 */

/** @typedef {{ light: string, dark: string }} ThemedColor */

const colors = {
  // Brand (design.md §2.1)
  brand: { light: "#1E3A5F", dark: "#7FA6D9" },
  brandStrong: { light: "#152C4A", dark: "#9DBCE6" },
  accent: { light: "#B8860B", dark: "#D9A93F" },

  // Neutrals (design.md §2.2)
  bg: { light: "#FAFAF7", dark: "#121417" },
  surface: { light: "#FFFFFF", dark: "#1A1D21" },
  surfaceRaised: { light: "#FFFFFF", dark: "#22262B" },
  border: { light: "#E4E2DC", dark: "#2E3338" },
  text: { light: "#1C1E21", dark: "#E8E6E1" },
  textMuted: { light: "#5B5F66", dark: "#9BA0A6" },
  textFaint: { light: "#8A8E94", dark: "#6B7076" },

  // Semantic (design.md §2.3)
  success: { light: "#1E7F4F", dark: "#4CC38A" },
  warning: { light: "#B45309", dark: "#F5A623" },
  danger: { light: "#B3261E", dark: "#F2726F" },
  info: { light: "#0B6E99", dark: "#5FB6DD" },

  // Mapping change-types (design.md §2.4) — always paired with icon + label
  mapSame: { light: "#46628C", dark: "#8FA9CF" },
  mapChanged: { light: "#B45309", dark: "#F5A623" },
  mapNew: { light: "#1E7F4F", dark: "#4CC38A" },
  mapOmitted: { light: "#B3261E", dark: "#F2726F" },
};

/** CSS variable name for a token key, e.g. brandStrong -> --nx-brand-strong */
function cssVarName(key) {
  return `--nx-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
}

// Spacing scale, px (design.md §4) — 4px base
const spacing = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64];

// Radii, px (design.md §4)
const radius = { sm: 6, md: 10, lg: 16 };

// Type scale (design.md §3): rem size / unitless line-height
const typeScale = {
  display: { size: 2.25, line: 1.15 },
  h1: { size: 1.75, line: 1.25 },
  h2: { size: 1.375, line: 1.3 },
  h3: { size: 1.125, line: 1.4 },
  bodyLg: { size: 1.125, line: 1.75 }, // statute reading text
  body: { size: 1.0, line: 1.6 },
  small: { size: 0.875, line: 1.5 },
  micro: { size: 0.75, line: 1.4 },
};

const fonts = {
  serif: "Source Serif 4", // statute / long-form reading
  sans: "Inter", // UI
  mono: "JetBrains Mono", // section numbers, citations
};

// Motion (design.md §7)
const durations = { pressed: 100, fast: 150, base: 200, slow: 300 };
const easing = "cubic-bezier(0.2, 0, 0, 1)";

module.exports = { colors, cssVarName, spacing, radius, typeScale, fonts, durations, easing };
