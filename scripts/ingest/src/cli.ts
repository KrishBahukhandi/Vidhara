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
import { publishClassificationRules, publishClassifications } from "./publish-classifications";
import { publishListSchedule } from "./publish-list-schedule";
import { parseListSchedule } from "./sources/list-schedule";
import { parseOffenceRules, parseOffenceSchedule } from "./sources/offence-schedule";
import { publishBundle, publishSchedule, type PublishOptions } from "./publish";
import { scheduleBundleSchema } from "./schema";
import { parseGazetteBBox } from "./sources/gazette-bbox";
import { parseInlineAct } from "./sources/gazette-inline";
import { parseGazetteLayoutText } from "./sources/gazette-pdf";
import { parseNcrbTable } from "./sources/ncrb-table";
import { parseScheduleTable } from "./sources/schedule-table";
import { validateBundle } from "./validate";

function loadBundle(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.error(`Could not read bundle "${path}": ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Read a First Schedule's classification of offences and, with --publish, store
 * it. Prints the diagnostics and a sample first: this table is read as fact on
 * a section page, so it should be looked at before it is published, and the
 * parser reports what it could not recognise rather than guessing.
 */
async function classifyOffencesCommand(inputPath: string, flags: string[]): Promise<void> {
  const at = (flag: string) => {
    const i = flags.indexOf(flag);
    return i >= 0 ? flags[i + 1] : undefined;
  };
  const scheduleSlug = at("--schedule");
  const subjectSlug = at("--subject");
  if (!scheduleSlug || !subjectSlug) {
    console.error(
      "Usage: ingest classify-offences <bbox.xhtml> --schedule <bnss> --subject <bns> " +
        "[--publish] [--status published] [--provenance '…']",
    );
    process.exit(1);
  }

  const xhtml = readFileSync(inputPath, "utf8");
  const result = parseOffenceSchedule(xhtml);
  for (const d of result.diagnostics) console.log(`  · ${d}`);
  const asserted = result.rows.filter((r) => !r.hasTiers);
  console.log(
    `\n${result.rows.length} rows — ${asserted.length} state one classification, ` +
      `${result.rows.length - asserted.length} carry more than one and are left unasserted.`,
  );
  for (const row of result.rows.slice(0, 5)) {
    const label = row.subsection ? `${row.section}(${row.subsection})` : row.section;
    console.log(`   ${label.padEnd(9)} ${row.cognizable.join(" / ")} | ${row.bailable.join(" / ")} | ${row.court.join(" / ")}`);
  }
  // Part II — the residual rule for offences under OTHER laws. Parsed from the
  // same file and published in the same run, because they are one schedule and
  // a corpus carrying only half of it answers only the two Acts that have a
  // Part I of their own.
  const partTwo = parseOffenceRules(xhtml);
  console.log("\nPart II — offences against other laws:");
  for (const d of partTwo.diagnostics) console.log(`  · ${d}`);
  for (const rule of partTwo.rules) {
    console.log(`   ${rule.punishment}`);
    console.log(`      ${rule.cognizable} | ${rule.bailable} | ${rule.court}`);
  }

  if (result.rows.length === 0) {
    console.error("Nothing parsed — refusing to publish.");
    process.exit(1);
  }
  if (!flags.includes("--publish")) {
    console.log("\nDry run. Pass --publish to store this.");
    return;
  }

  const statusFlag = at("--status") ?? "draft";
  if (!["draft", "reviewed", "published"].includes(statusFlag)) {
    console.error(`Invalid --status "${statusFlag}"`);
    process.exit(1);
  }
  const outcome = await publishClassifications(result.rows, {
    scheduleSlug,
    subjectSlug,
    reviewStatus: statusFlag as "draft" | "reviewed" | "published",
    provenance: at("--provenance") ?? `${scheduleSlug.toUpperCase()} First Schedule, automated parse`,
  });
  console.log(
    `Published: ${outcome.published} classification(s) of ${subjectSlug.toUpperCase()} ` +
      `sections from the ${scheduleSlug.toUpperCase()} First Schedule` +
      (outcome.removed > 0 ? `; ${outcome.removed} stale row(s) removed` : ""),
  );

  // Part II refuses rather than guesses (see parseOffenceRules), so an empty
  // result is a diagnostic worth printing but not a reason to fail a run whose
  // Part I is sound.
  if (partTwo.rules.length === 0) {
    console.warn("Part II did not parse — nothing published for offences against other laws.");
    return;
  }
  const ruleOutcome = await publishClassificationRules(partTwo.rules, {
    scheduleSlug,
    reviewStatus: statusFlag as "draft" | "reviewed" | "published",
    provenance:
      at("--provenance") ?? `${scheduleSlug.toUpperCase()} First Schedule, automated parse`,
  });
  console.log(
    `Published: ${ruleOutcome.published} band(s) of the ${scheduleSlug.toUpperCase()} ` +
      `First Schedule's Part II` +
      (ruleOutcome.removed > 0 ? `; ${ruleOutcome.removed} stale band(s) removed` : ""),
  );
}

/**
 * A schedule that is a numbered list grouped into named lists — the
 * Constitution's Seventh, and the shape several of its others take too.
 */
async function listScheduleCommand(inputPath: string, flags: string[]): Promise<void> {
  const at = (flag: string): string | undefined => {
    const i = flags.indexOf(flag);
    return i >= 0 ? flags[i + 1] : undefined;
  };
  const actSlug = at("--act");
  const slug = at("--slug");
  const title = at("--title");
  const heading = at("--heading");
  const endsBefore = at("--ends-before");
  if (!actSlug || !slug || !title || !heading || !endsBefore) {
    console.error(
      "Usage: ingest list-schedule <bbox.xhtml> --act constitution --slug seventh " +
        "--title 'Seventh Schedule' --heading SEVENTHSCHEDULE --ends-before EIGHTHSCHEDULE " +
        "[--subtitle '…'] [--sort-order 7] [--min-height 7.7] [--max-height 11] " +
        "[--publish] [--status published] [--provenance '…']",
    );
    process.exit(1);
  }

  const result = parseListSchedule(readFileSync(inputPath, "utf8"), {
    heading: new RegExp(heading, "i"),
    endsBefore: new RegExp(endsBefore, "i"),
    minHeight: at("--min-height") ? Number(at("--min-height")) : undefined,
    maxHeight: at("--max-height") ? Number(at("--max-height")) : undefined,
  });
  for (const d of result.diagnostics) console.log(`  \u00b7 ${d}`);
  console.log(`\nAuthority: ${result.authority ?? "(none found)"}`);
  const total = result.lists.reduce((n, l) => n + l.entries.length, 0);
  console.log(`${result.lists.length} list(s), ${total} entries.`);
  for (const list of result.lists) {
    const first = list.entries[0];
    console.log(`   List ${list.number} — ${list.title}: ${list.entries.length}` +
      (first ? `, opening "${first.number}. ${first.text.slice(0, 54)}…"` : ""));
  }

  // The gates. A list schedule that parsed to nothing, or whose numbering does
  // not ascend, is a parse that went wrong somewhere it cannot be seen.
  const complaints: string[] = [];
  if (result.lists.length === 0) complaints.push("no lists found");
  for (const list of result.lists) {
    if (list.entries.length === 0) complaints.push(`List ${list.number} has no entries`);
    const seen = new Set<string>();
    for (const entry of list.entries) {
      if (seen.has(entry.number)) complaints.push(`List ${list.number}: duplicate entry ${entry.number}`);
      seen.add(entry.number);
      if (!entry.text.trim()) complaints.push(`List ${list.number}: entry ${entry.number} is empty`);
      if (/Subs\. by|Ins\. by|w\.e\.f\./.test(entry.text)) {
        complaints.push(`List ${list.number}: entry ${entry.number} retains footnote apparatus`);
      }
    }
  }
  if (complaints.length > 0) {
    for (const c of complaints) console.error(`  \u2716 ${c}`);
    console.error("\nRefusing to publish — the parse did not validate.");
    process.exit(1);
  }

  if (!flags.includes("--publish")) {
    console.log("\nDry run. Pass --publish to store this.");
    return;
  }
  const statusFlag = at("--status") ?? "draft";
  if (!["draft", "reviewed", "published"].includes(statusFlag)) {
    console.error(`Invalid --status "${statusFlag}"`);
    process.exit(1);
  }
  const outcome = await publishListSchedule(result, {
    actSlug,
    slug,
    title,
    subtitle: at("--subtitle"),
    sortOrder: Number(at("--sort-order") ?? 0),
    reviewStatus: statusFlag as "draft" | "reviewed" | "published",
    provenance: at("--provenance") ?? `${title}, automated parse`,
  });
  console.log(
    `Published: ${outcome.entries} entries of the ${title} to ${actSlug.toUpperCase()}` +
      (outcome.removed > 0 ? `; ${outcome.removed} stale entr(ies) removed` : ""),
  );
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
  const isBBox = inputText.trimStart().startsWith("<");
  // --inline: run-in-heading format of the pre-2023 codes (IPC/CrPC/IEA),
  //   requires -bbox. Otherwise the marginal-note gazette format (new codes).
  const inline = flags.includes("--inline");
  let format: string;
  let result;
  if (inline) {
    if (!isBBox) {
      console.error("--inline requires -bbox XHTML input");
      process.exit(1);
    }
    result = parseInlineAct(inputText);
    format = "inline (run-in headings, -bbox)";
  } else if (isBBox) {
    result = parseGazetteBBox(inputText);
    format = "bbox (marginal-note column)";
  } else {
    result = parseGazetteLayoutText(inputText);
    format = "layout (heuristic columns)";
  }
  const { sections, chapters, diagnostics, stateAmendments } = result;
  console.log(`format: ${format}`);

  for (const diagnostic of diagnostics) console.warn(`  ⚠ ${diagnostic}`);

  const bundle = {
    act: meta.act,
    chapters,
    sections: sections.map((section) => ({
      number: section.number,
      chapterNumber: section.chapterNumber,
      // Present only for a Chapter nested in a Part; the pair is the division key.
      ...(section.partNumber ? { partNumber: section.partNumber } : {}),
      marginalNote: section.marginalNote,
      bodyMd: section.bodyMd,
    })),
    // Kept beside the Act, never merged into a section body (D-053).
    ...(stateAmendments && stateAmendments.length > 0 ? { stateAmendments } : {}),
    provenance: meta.provenance,
  };
  writeFileSync(outPath, `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(
    `Parsed ${sections.length} section(s), ${chapters.length} chapter(s), ` +
      `${stateAmendments?.length ?? 0} State amendment(s), ${diagnostics.length} diagnostic(s) → ${outPath}`,
  );
  console.log("Next: ingest validate, spot-check against the PDF, then publish.");
}

async function main(): Promise<void> {
  const [command, bundlePath, ...flags] = process.argv.slice(2);

  if (
    !command ||
    !bundlePath ||
    !["validate", "publish", "parse-gazette", "parse-ncrb", "parse-schedule", "publish-schedule", "classify-offences", "list-schedule", "emit-sql"].includes(
      command,
    )
  ) {
    console.error(
      "Usage: ingest <parse-gazette|parse-schedule|list-schedule|classify-offences|validate|publish|publish-schedule|emit-sql> <file> [--meta m.json] [--out f] [--status s] [--publish-act]",
    );
    process.exit(1);
  }

  if (command === "classify-offences") {
    await classifyOffencesCommand(bundlePath, flags);
    return;
  }

  if (command === "list-schedule") {
    await listScheduleCommand(bundlePath, flags);
    return;
  }

  if (command === "parse-gazette") {
    parseGazetteCommand(bundlePath, flags);
    return;
  }

  if (command === "parse-ncrb") {
    const oldIdx = flags.indexOf("--old");
    const newIdx = flags.indexOf("--new");
    const outIdx = flags.indexOf("--out");
    const oldAct = oldIdx >= 0 ? flags[oldIdx + 1] : undefined;
    const newAct = newIdx >= 0 ? flags[newIdx + 1] : undefined;
    const outPath = outIdx >= 0 ? flags[outIdx + 1] : undefined;
    const provIdx = flags.indexOf("--provenance");
    const provenance = provIdx >= 0 ? flags[provIdx + 1] : undefined;
    if (!oldAct || !newAct || !outPath || !provenance) {
      console.error(
        "Usage: ingest parse-ncrb <table.html> --old IPC --new BNS --provenance <text> --out <mappings.json>",
      );
      process.exit(1);
    }
    const { entries, diagnostics } = parseNcrbTable(readFileSync(bundlePath, "utf8"), oldAct, newAct);
    for (const d of diagnostics) console.warn(`  ⚠ ${d}`);
    const byType: Record<string, number> = {};
    for (const e of entries) byType[e.type] = (byType[e.type] ?? 0) + 1;
    writeFileSync(outPath, `${JSON.stringify({ oldAct, newAct, provenance, entries }, null, 2)}\n`);
    console.log(`Parsed ${entries.length} mapping entries → ${outPath}`);
    console.log(`  by type: ${JSON.stringify(byType)}`);
    return;
  }

  if (command === "parse-schedule") {
    const metaIndex = flags.indexOf("--meta");
    const outIndex = flags.indexOf("--out");
    const startIndex = flags.indexOf("--start-at");
    const metaPath = metaIndex >= 0 ? flags[metaIndex + 1] : undefined;
    const outPath = outIndex >= 0 ? flags[outIndex + 1] : undefined;
    if (!metaPath || !outPath) {
      console.error(
        "Usage: ingest parse-schedule <bbox.xhtml> --meta <schedule-meta.json> --out <bundle.json> [--start-at 'THE SCHEDULE']",
      );
      process.exit(1);
    }

    const meta = JSON.parse(readFileSync(metaPath, "utf8")) as Record<string, unknown>;
    const result = parseScheduleTable(
      readFileSync(bundlePath, "utf8"),
      startIndex >= 0 ? flags[startIndex + 1] : undefined,
    );
    for (const diagnostic of result.diagnostics) console.warn(`  ⚠ ${diagnostic}`);

    writeFileSync(outPath, `${JSON.stringify({ ...meta, articles: result.articles }, null, 2)}\n`);
    const rows = result.articles.reduce((total, article) => total + article.rows.length, 0);
    console.log(
      `Parsed ${result.articles.length} article(s), ${rows} row(s), ${result.divisions.length} division(s) → ${outPath}`,
    );
    console.log("Next: ingest publish-schedule, after spot-checking against the PDF.");
    return;
  }

  if (command === "publish-schedule") {
    const parsed = scheduleBundleSchema.safeParse(loadBundle(bundlePath));
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        console.error(`  ✖ ${issue.path.join(".") || "(root)"}: ${issue.message}`);
      }
      console.error(`\nValidation FAILED (${parsed.error.issues.length} error(s)).`);
      process.exit(1);
    }

    const statusFlag = flags.indexOf("--status");
    const reviewStatus = (statusFlag >= 0 ? flags[statusFlag + 1] : "draft") as
      PublishOptions["reviewStatus"];
    if (!["draft", "reviewed", "published"].includes(reviewStatus)) {
      console.error(`Invalid --status "${reviewStatus}"`);
      process.exit(1);
    }

    const rows = parsed.data.articles.reduce((total, article) => total + article.rows.length, 0);
    console.log(
      `Validation OK: ${parsed.data.actSlug}/${parsed.data.schedule.slug} — ${parsed.data.articles.length} article(s), ${rows} row(s).`,
    );
    const result = await publishSchedule(parsed.data, { reviewStatus, publishAct: false });
    console.log(
      `Published: schedule ${result.scheduleId} · ${result.articles} article(s) · review_status=${reviewStatus}`,
    );
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
    `Published: act ${result.actId} · ${result.sections} section(s) · ${result.chapters} chapter(s)` +
      (result.stateAmendments > 0 ? ` · ${result.stateAmendments} State amendment(s)` : "") +
      ` · review_status=${reviewStatus}`,
  );
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
