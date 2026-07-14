#!/usr/bin/env tsx
/**
 * NexLex ingestion CLI.
 *
 *   pnpm --filter @nexlex/ingest ingest parse-gazette <layout.txt> --meta <act-meta.json> --out <bundle.json>
 *   pnpm --filter @nexlex/ingest ingest validate <bundle.json>
 *   pnpm --filter @nexlex/ingest ingest publish  <bundle.json> [--status draft|reviewed|published] [--publish-act]
 *
 * parse-gazette consumes `pdftotext -layout` output of an official Gazette
 * act PDF plus a meta file ({ act: {...}, provenance: "..." }) and emits a
 * bundle for review. Publishing requires SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY in the environment (see README). Content is only
 * publicly visible once sections reach review_status=published AND the act
 * has published_at set.
 */
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

import { emitSqlFromRaw } from "./emit-sql";
import { publishBundle, type PublishOptions } from "./publish";
import { parseGazetteBBox } from "./sources/gazette-bbox";
import { parseGazetteLayoutText } from "./sources/gazette-pdf";
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

function parseGazetteCommand(inputPath: string, flags: string[]): void {
  const metaIndex = flags.indexOf("--meta");
  const outIndex = flags.indexOf("--out");
  const metaPath = metaIndex >= 0 ? flags[metaIndex + 1] : undefined;
  const outPath = outIndex >= 0 ? flags[outIndex + 1] : undefined;
  if (!metaPath || !outPath) {
    console.error("Usage: ingest parse-gazette <layout.txt> --meta <act-meta.json> --out <bundle.json>");
    process.exit(1);
  }

  const meta = JSON.parse(readFileSync(metaPath, "utf8")) as {
    act: Record<string, unknown>;
    chapters?: unknown[];
    provenance: string;
  };
  const inputText = readFileSync(inputPath, "utf8");
  // Prefer -bbox XHTML (exact word coordinates); -layout text is the fallback.
  const isBBox = inputText.trimStart().startsWith("<");
  const { sections, chapters, diagnostics } = isBBox
    ? parseGazetteBBox(inputText)
    : parseGazetteLayoutText(inputText);
  console.log(`format: ${isBBox ? "bbox (coordinates)" : "layout (heuristic columns)"}`);

  for (const diagnostic of diagnostics) console.warn(`  ⚠ ${diagnostic}`);

  const bundle = {
    act: meta.act,
    chapters,
    sections: sections.map((section) => ({
      number: section.number,
      chapterNumber: section.chapterNumber,
      marginalNote: section.marginalNote,
      bodyMd: section.bodyMd,
    })),
    provenance: meta.provenance,
  };
  writeFileSync(outPath, `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(
    `Parsed ${sections.length} section(s), ${chapters.length} chapter(s), ${diagnostics.length} diagnostic(s) → ${outPath}`,
  );
  console.log("Next: ingest validate, spot-check against the PDF, then publish.");
}

async function main(): Promise<void> {
  const [command, bundlePath, ...flags] = process.argv.slice(2);

  if (
    !command ||
    !bundlePath ||
    !["validate", "publish", "parse-gazette", "emit-sql"].includes(command)
  ) {
    console.error(
      "Usage: ingest <parse-gazette|validate|publish|emit-sql> <file> [--meta m.json] [--out f] [--status s] [--publish-act]",
    );
    process.exit(1);
  }

  if (command === "parse-gazette") {
    parseGazetteCommand(bundlePath, flags);
    return;
  }

  if (command === "emit-sql") {
    const outIndex = flags.indexOf("--out");
    const statusIndex = flags.indexOf("--status");
    const outPath = outIndex >= 0 ? flags[outIndex + 1] : undefined;
    if (!outPath) {
      console.error("Usage: ingest emit-sql <bundle.json> --out <file.sql> [--status s] [--publish-act]");
      process.exit(1);
    }
    const sql = emitSqlFromRaw(loadBundle(bundlePath), {
      reviewStatus: (statusIndex >= 0 ? flags[statusIndex + 1] : "draft") as PublishOptions["reviewStatus"],
      publishAct: flags.includes("--publish-act"),
    });
    writeFileSync(outPath, sql);
    console.log(`SQL written → ${outPath} (${sql.split("-- CHUNK").length - 1} chunks)`);
    return;
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
