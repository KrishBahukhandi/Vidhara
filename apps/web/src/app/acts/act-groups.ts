/**
 * How the library is shelved.
 *
 * The index used to be all 36 acts in one list ordered by status then year
 * descending — an order nobody browses by. Nobody thinks "I want the 1932
 * one"; they think "partnership". Worse, sorting replaced acts last put the
 * IPC, CrPC and Evidence Act — the three the whole product is positioned
 * around — at the very bottom, below the Dowry Prohibition Act.
 *
 * So: subject shelves, the criminal-law transition first, and within a shelf
 * the order is by how often a student actually reaches for it rather than by
 * year. Acts not listed here fall into "Other central acts" instead of
 * disappearing, so adding an act to the corpus can never drop it from the
 * index — it only means it is unshelved until someone shelves it.
 */
export interface ActGroup {
  id: string;
  title: string;
  blurb: string;
  slugs: string[];
}

export const ACT_GROUPS: ActGroup[] = [
  {
    id: "criminal",
    title: "Criminal law — old code and new",
    blurb:
      "The three codes replaced on 1 July 2024, each beside the one it replaced. Open either and the other is a tap away.",
    slugs: ["bns", "ipc", "bnss", "crpc", "bsa", "iea"],
  },
  {
    id: "constitution",
    title: "The Constitution",
    blurb: "Every Article, by Part and Chapter.",
    slugs: ["constitution"],
  },
  {
    id: "civil-procedure",
    title: "Civil procedure & remedies",
    blurb: "How a civil case is actually run — and how long you have to bring it.",
    slugs: ["cpc", "lim", "sra"],
  },
  {
    id: "contract-commercial",
    title: "Contract & commercial",
    blurb: "The commercial-law core of most syllabi.",
    slugs: ["ica", "sga", "ni", "part", "arb", "cpa"],
  },
  {
    id: "family",
    title: "Family & personal law",
    blurb: "Marriage, succession, guardianship and maintenance.",
    slugs: ["hma", "sma", "hsa", "hama", "hmga", "isa", "dv", "dowry"],
  },
  {
    id: "property",
    title: "Property & registration",
    blurb: "Transfers of property and the machinery that records them.",
    slugs: ["tp", "reg"],
  },
  {
    id: "special-criminal",
    title: "Special criminal statutes",
    blurb: "The special Acts that sit alongside the general criminal code.",
    slugs: ["pocso", "jj", "scst", "ndps", "pca"],
  },
  {
    id: "public",
    title: "Public law, regulation & the profession",
    blurb: "Statutes governing the state, the internet, the road and the Bar.",
    slugs: ["rti", "ita", "mv", "adv", "gca"],
  },
];

/** Shelf id for each slug, so an act is placed in O(1) and only once. */
export const GROUP_BY_SLUG = new Map<string, string>(
  ACT_GROUPS.flatMap((g) => g.slugs.map((s) => [s, g.id] as const)),
);

export const UNSHELVED = {
  id: "other",
  title: "Other central acts",
  blurb: "Everything else in the corpus.",
} as const;
