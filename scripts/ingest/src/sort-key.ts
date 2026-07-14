/**
 * Derives the numeric ordering key for a section number as printed.
 *   "302"  → 302
 *   "34A"  → 34.01   (letter suffixes order after the base section)
 *   "65B"  → 65.02
 *   "20AA" → 20.0101 (rare double-letter insertions nest one level deeper)
 * Throws on anything else — ingestion must stop rather than mis-order a statute.
 */
const SECTION_NUMBER = /^(\d{1,4})([A-Z]{1,2})?$/;

export function deriveSortKey(sectionNumber: string): number {
  const match = SECTION_NUMBER.exec(sectionNumber.trim());
  if (!match || !match[1]) {
    throw new Error(`Cannot derive sort key from section number "${sectionNumber}"`);
  }
  const base = Number(match[1]);
  const letters = match[2] ?? "";

  let fraction = 0;
  if (letters.length >= 1) {
    fraction += (letters.charCodeAt(0) - 64) / 100; // A → 0.01
  }
  if (letters.length === 2) {
    fraction += (letters.charCodeAt(1) - 64) / 10_000; // second letter → 0.0001
  }
  return base + fraction;
}
