/** Consumes the shared token preset — no color/spacing/type values live here.
 * The fontFamily override is PLUMBING, not values: next/font (layout.tsx)
 * serves the preset's own families ("Source Serif 4", Inter) under generated
 * names exposed as CSS variables; the preset's literals remain as fallbacks. */
module.exports = {
  presets: [require("@nexlex/tokens/tailwind-preset")],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", '"Source Serif 4"', "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
};
