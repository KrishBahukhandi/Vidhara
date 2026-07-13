/** Consumes the shared token preset — no color/spacing/type values live here. */
module.exports = {
  presets: [require("@nexlex/tokens/tailwind-preset")],
  content: ["./src/**/*.{ts,tsx}"],
};
