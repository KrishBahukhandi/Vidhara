#!/usr/bin/env node
/**
 * Generates dist/variables.css from tokens.cjs.
 * Run after any token change: pnpm --filter @nexlex/tokens gen
 * `--check` verifies the committed file is in sync (used as the package test in CI).
 */
const fs = require("node:fs");
const path = require("node:path");
const { colors, cssVarName } = require("../tokens.cjs");

const line = (key, theme) => `  ${cssVarName(key)}: ${colors[key][theme]};`;
const block = (theme) =>
  Object.keys(colors)
    .map((key) => line(key, theme))
    .join("\n");

const css = `/* GENERATED FILE — do not edit. Source: @nexlex/tokens/tokens.cjs (spec: docs/design.md).
 * Regenerate: pnpm --filter @nexlex/tokens gen */

:root {
${block("light")}
}

@media (prefers-color-scheme: dark) {
  :root {
${block("dark").replace(/^/gm, "  ")}
  }
}

/* Manual overrides (web theme toggle sets data-theme on <html>) — must win both ways. */
[data-theme="light"] {
${block("light")}
}

[data-theme="dark"] {
${block("dark")}
}
`;

const outDir = path.join(__dirname, "..", "dist");
const outFile = path.join(outDir, "variables.css");

if (process.argv.includes("--check")) {
  const existing = fs.existsSync(outFile) ? fs.readFileSync(outFile, "utf8") : "";
  if (existing !== css) {
    console.error("tokens: dist/variables.css is out of sync with tokens.cjs — run `pnpm --filter @nexlex/tokens gen`");
    process.exit(1);
  }
  console.log("tokens: dist/variables.css is in sync");
} else {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, css);
  console.log(`tokens: wrote ${path.relative(process.cwd(), outFile)}`);
}
