#!/usr/bin/env tsx
/**
 * NexLex ingestion CLI.
 *
 *   pnpm --filter @nexlex/ingest ingest validate <bundle.json>
 *   pnpm --filter @nexlex/ingest ingest publish  <bundle.json> [--status draft|reviewed|published] [--publish-act]
 *
 * Publishing requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the
 * environment (see README). Content is only publicly visible once sections
 * reach review_status=published AND the act has published_at set.
 */
import { readFileSync } from "node:fs";
import process from "node:process";

import { publishBundle, type PublishOptions } from "./publish";
import { validateBundle } from "./validate";

function loadBundle(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`Could not read bundle "${path}": ${(error as Error).message}`);
    process.exit(1);
  }
}

function printReport(errors: string[], warnings: string[]): void {
  for (const error of errors) console.error(`  ✖ ${error}`);
  for (const warning of warnings) console.warn(`  ⚠ ${warning}`);
}

async function main(): Promise<void> {
  const [command, bundlePath, ...flags] = process.argv.slice(2);

  if (!command || !bundlePath || !["validate", "publish"].includes(command)) {
    console.error("Usage: ingest <validate|publish> <bundle.json> [--status s] [--publish-act]");
    process.exit(1);
  }

  const report = validateBundle(loadBundle(bundlePath));
  printReport(report.errors, report.warnings);

  if (!report.ok || !report.bundle) {
    console.error(`\nValidation FAILED (${report.errors.length} error(s)).`);
    process.exit(1);
  }
  console.log(
    `\nValidation OK: ${report.bundle.act.abbreviation} — ${report.bundle.sections.length} section(s), ${report.warnings.length} warning(s).`,
  );

  if (command === "validate") return;

  const statusIndex = flags.indexOf("--status");
  const reviewStatus = (statusIndex >= 0 ? flags[statusIndex + 1] : "draft") as
    PublishOptions["reviewStatus"];
  if (!["draft", "reviewed", "published"].includes(reviewStatus)) {
    console.error(`Invalid --status "${reviewStatus}"`);
    process.exit(1);
  }

  const result = await publishBundle(report.bundle, {
    reviewStatus,
    publishAct: flags.includes("--publish-act"),
  });
  console.log(
    `Published: act ${result.actId} · ${result.sections} section(s) · ${result.chapters} chapter(s) · review_status=${reviewStatus}`,
  );
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
