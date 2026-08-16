/**
 * "Order VII Rule 11" and its many spellings.
 *
 * The Code of Civil Procedure is cited two ways. Sections 1-158 are the Act;
 * everything a civil practitioner reaches for daily — rejection of a plaint,
 * set-off, temporary injunctions, appeals — lives in the **First Schedule** as
 * Orders and Rules, which is 78% of the document and is NOT in this corpus
 * (the CPC bundle's provenance has said so since 2026-07-29).
 *
 * Recognising the shape matters because of what happens otherwise: full-text
 * search for "Order 7 Rule 11" today returns seven confident-looking hits —
 * Constitution art. 366, General Clauses §3, Consumer Protection §38 — all
 * matched on the digit 7. A reader is handed wrong answers where they should
 * be told the truth, which is the failure D-041 is about.
 *
 * This only DETECTS the reference. It resolves nothing, because there is
 * nothing to resolve to yet.
 */

/** Roman numeral (I-L range covers the CPC's 51 Orders) or plain digits. */
const NUM = "([IVXLCivxlc]+|\\d+)";

const PATTERNS: RegExp[] = [
  // "Order VII Rule 11", "order 7 rule 11(d)", "O. VII R. 11"
  new RegExp(`\\bo(?:rder|r)?\\.?\\s*${NUM}\\s*[,/-]?\\s*r(?:ule)?\\.?\\s*${NUM}([A-Za-z]?)`, "i"),
];

/** "Order 7" alone — still a Schedule reference, still uncovered. */
const ORDER_ONLY = new RegExp(`\\border\\.?\\s*${NUM}\\b`, "i");

export interface OrderRuleRef {
  order: string;
  rule?: string;
  /** The text as the reader typed it, for echoing back verbatim. */
  raw: string;
}

const ROMAN = /^[IVXLCivxlc]+$/;

/** Normalise "7" and "vii" to the printed form, "VII". */
function toRoman(value: string): string {
  if (ROMAN.test(value)) return value.toUpperCase();
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 51) return value;
  const table: [number, string][] = [
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let rest = n;
  let out = "";
  for (const [v, sym] of table) {
    while (rest >= v) {
      out += sym;
      rest -= v;
    }
  }
  return out;
}

export function parseOrderRuleRef(input: string): OrderRuleRef | null {
  const raw = input.trim();
  if (!raw) return null;

  for (const re of PATTERNS) {
    const m = re.exec(raw);
    if (m?.[1] && m[2]) {
      return { order: toRoman(m[1]), rule: `${m[2]}${m[3] ?? ""}`, raw };
    }
  }

  // "Order 7" with no rule. Requires the literal word so a bare "7" or an
  // ordinary sentence using "order" as a verb ("an order made under section 5")
  // is not swept in — hence the word boundary and the number immediately after.
  const only = ORDER_ONLY.exec(raw);
  if (only?.[1]) {
    // Guard the common prose case: "order made", "order of the Court".
    const after = raw.slice(only.index + only[0].length, only.index + only[0].length + 12);
    if (/^\s*(made|of|passed|under|dated)/i.test(after)) return null;
    return { order: toRoman(only[1]), raw };
  }

  return null;
}

/** How to cite it, in the form the Schedule prints. */
export function formatOrderRule(ref: OrderRuleRef): string {
  return ref.rule ? `Order ${ref.order}, Rule ${ref.rule}` : `Order ${ref.order}`;
}
