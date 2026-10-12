// How sure a draft of PO is (MKT-S1-09, docs/ARCHITECTURE.md § 6 bis,
// « Brouillon de stratégie »): judged by the code, never by the model (règle
// non négociable 6). A draft leans on one source passage found verbatim; the
// more of its words come from that source, the less PO added. A confirmed
// Brief field is a firmer ground than a call report. Pure, client-safe.

import type { DraftConfidence } from "@/lib/framing/brief";

/** Words that carry meaning: four letters at least, accents and case ignored. */
export function meaningfulWords(text: string): string[] {
  return (
    text
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .match(/\p{L}{4,}/gu) ?? []
  );
}

/** Share of the draft's meaningful words that appear in its source, 0 to 1. */
export function sourceOverlap(draft: string, source: string): number {
  const words = meaningfulWords(draft);
  if (words.length === 0) return 0;
  const known = new Set(meaningfulWords(source));
  return words.filter((w) => known.has(w)).length / words.length;
}

/**
 * High: most of the draft comes from its source (a confirmed Brief field
 * counts a little more). Medium: about half. Low: PO wrote more than it
 * read: to read again before confirming.
 */
export function draftConfidence(input: {
  draft: string;
  source: string;
  fromBrief: boolean;
}): DraftConfidence {
  const score =
    sourceOverlap(input.draft, input.source) + (input.fromBrief ? 0.15 : 0);
  if (score >= 0.6) return "high";
  if (score >= 0.35) return "medium";
  return "low";
}
