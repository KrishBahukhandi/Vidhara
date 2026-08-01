/**
 * Structured section-reference parser (architecture.md §8 step 1).
 * Turns queries like "302 IPC", "s. 420 ipc", "bns 103", "article 21" into a
 * structured ref so search can resolve them with a single indexed lookup
 * instead of full-text search. Shared by app, web, and the search RPC callers.
 */

/** Canonical act abbreviations used across the platform (DB `acts.abbreviation`). */
export const ACT_ABBREVIATIONS = [
  "IPC",
  "BNS",
  "CRPC",
  "BNSS",
  "IEA",
  "BSA",
  "COI",
  "ICA",
  "NI",
  "CPC",
  "NDPS",
  "MV",
  "ARB",
  "LIM",
  "TP",
  "SRA",
  "SGA",
] as const;
export type ActAbbreviation = (typeof ACT_ABBREVIATIONS)[number];

/**
 * Canonical abbreviation → URL slug (must match acts.slug in the DB). Mostly
 * the lowercased abbreviation, but NOT always — the Constitution's slug is
 * "constitution", not "coi". Never derive a section URL from an abbreviation
 * with toLowerCase(); use this map. When a new act is ingested, add it here.
 */
export const ACT_SLUG: Record<ActAbbreviation, string> = {
  IPC: "ipc",
  BNS: "bns",
  CRPC: "crpc",
  BNSS: "bnss",
  IEA: "iea",
  BSA: "bsa",
  COI: "constitution",
  ICA: "ica",
  NI: "ni",
  CPC: "cpc",
  NDPS: "ndps",
  MV: "mv",
  ARB: "arb",
  LIM: "lim",
  TP: "tp",
  SRA: "sra",
  SGA: "sga",
};

/** Alias → canonical abbreviation. Keys must be lowercase, punctuation-free. */
const ACT_ALIASES: Record<string, ActAbbreviation> = {
  ipc: "IPC",
  "indian penal code": "IPC",
  "penal code": "IPC",
  bns: "BNS",
  "bharatiya nyaya sanhita": "BNS",
  nyaya: "BNS",
  crpc: "CRPC",
  "code of criminal procedure": "CRPC",
  "criminal procedure code": "CRPC",
  bnss: "BNSS",
  "bharatiya nagarik suraksha sanhita": "BNSS",
  iea: "IEA",
  "indian evidence act": "IEA",
  "evidence act": "IEA",
  evidence: "IEA",
  bsa: "BSA",
  "bharatiya sakshya adhiniyam": "BSA",
  sakshya: "BSA",
  coi: "COI",
  constitution: "COI",
  "constitution of india": "COI",
  ica: "ICA",
  "indian contract act": "ICA",
  "contract act": "ICA",
  ni: "NI",
  "negotiable instruments act": "NI",
  "negotiable instruments": "NI",
  negotiable: "NI",
  "ni act": "NI",
  cpc: "CPC",
  "code of civil procedure": "CPC",
  "civil procedure code": "CPC",
  "civil procedure": "CPC",
  ndps: "NDPS",
  "narcotic drugs and psychotropic substances act": "NDPS",
  "narcotic drugs": "NDPS",
  narcotics: "NDPS",
  mv: "MV",
  "motor vehicles act": "MV",
  "motor vehicles": "MV",
  "mv act": "MV",
  arb: "ARB",
  "arbitration and conciliation act": "ARB",
  "arbitration and conciliation": "ARB",
  "arbitration act": "ARB",
  arbitration: "ARB",
  lim: "LIM",
  "limitation act": "LIM",
  limitation: "LIM",
  tp: "TP",
  tpa: "TP",
  "transfer of property act": "TP",
  "transfer of property": "TP",
  sra: "SRA",
  "specific relief act": "SRA",
  "specific relief": "SRA",
  sga: "SGA",
  "sale of goods act": "SGA",
  "sale of goods": "SGA",
};

export interface ParsedSectionRef {
  /** Canonical act abbreviation, or null when the query names no act ("302"). */
  act: ActAbbreviation | null;
  /** Section number as printed in the act: "302", "34A", "103" (sub-clauses stripped). */
  section: string;
  /** True when the query used constitutional "article" phrasing. */
  isArticle: boolean;
}

// "302", "34A", "498-A" (normalized to 498A), optionally followed by "(1)(b)" clauses.
const SECTION_TOKEN = /^(\d{1,4})\s*-?\s*([A-Za-z]{1,2})?(?:\s*\([^)]*\))*$/;

const SECTION_WORDS = /^(?:s|ss|sec|secs|section|sections|art|article)$/i;
const NOISE_WORDS = new Set(["of", "the", "under", "in"]);

/**
 * Alias lookup, indexed both as written and with the noise words removed.
 *
 * Queries have "of"/"the" stripped before the act name is assembled, so a key
 * containing them could never be hit: "constitution of india 21", "code of
 * criminal procedure 438" and "code of civil procedure 151" all failed to
 * resolve, which is as natural a way to type those three as exists. Indexing
 * the stripped form as well fixes every alias at once, instead of leaving the
 * next person to notice that their new act needs a hand-written duplicate.
 */
const ALIAS_INDEX: Record<string, ActAbbreviation> = (() => {
  const index: Record<string, ActAbbreviation> = {};
  for (const [alias, abbreviation] of Object.entries(ACT_ALIASES)) {
    index[alias] = abbreviation;
    const stripped = alias
      .split(" ")
      .filter((word) => !NOISE_WORDS.has(word))
      .join(" ");
    if (stripped) index[stripped] = abbreviation;
  }
  return index;
})();

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/\bu\/s\b/g, " section ") // FIR-style "u/s 302" before slash stripping
    .replace(/[.,/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchSectionToken(token: string): string | null {
  const m = SECTION_TOKEN.exec(token);
  if (!m || !m[1]) return null;
  return `${m[1]}${(m[2] ?? "").toUpperCase()}`;
}

/**
 * Attempts to parse a structured section reference. Returns null when the input
 * is not reference-shaped (callers then fall through to full-text search).
 */
export function parseSectionRef(input: string): ParsedSectionRef | null {
  const normalized = normalize(input);
  if (!normalized || normalized.length > 80) return null;

  const rawTokens = normalized.split(" ");
  let isArticle = false;
  let section: string | null = null;
  const actWords: string[] = [];

  // Merge "498 a" style splits before scanning: "498 a ipc" → "498a ipc"
  const tokens: string[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const current = rawTokens[i];
    const next = rawTokens[i + 1];
    if (current && next && /^\d{1,4}$/.test(current) && /^[a-z]$/.test(next)) {
      tokens.push(current + next);
      i++;
    } else if (current) {
      tokens.push(current);
    }
  }

  for (const token of tokens) {
    if (SECTION_WORDS.test(token)) {
      if (/^art/i.test(token)) isArticle = true;
      continue;
    }
    if (NOISE_WORDS.has(token)) continue;

    const sectionMatch = matchSectionToken(token);
    if (sectionMatch && section === null) {
      section = sectionMatch;
      continue;
    }
    actWords.push(token);
  }

  if (section === null) return null;

  let act: ActAbbreviation | null = null;
  if (actWords.length > 0) {
    const candidate = ALIAS_INDEX[actWords.join(" ")];
    if (!candidate) return null; // named an act we don't recognize — not a confident ref
    act = candidate;
  }

  if (isArticle && act === null) act = "COI"; // "article 21" is constitutional by convention

  return { act, section, isArticle };
}
