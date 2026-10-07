// Dates and amounts read in what was said or written (Cadrage intelligent).
// The model only quotes; code reads (rule 6). Client-safe.

import { parseSaidDate } from "@/lib/assistant/verbatim";
import { parseEurosToCents } from "@/lib/projects/schemas";

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s  ]+/g, " ")
    .toLowerCase();

const MONTH =
  "janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre";
const CANDIDATES = [
  /\d{4}-\d{2}-\d{2}/g,
  /\d{1,2}[/.-]\d{1,2}[/.-]\d{4}/g,
  new RegExp(String.raw`\d{1,2}(?:er)? (?:${MONTH}) \d{4}`, "g"),
];

/**
 * The first full date written in a passage ("sortie le 24 octobre 2026" →
 * 2026-10-24). The year must be written: a date without it is never
 * completed by the code either, a person picks it.
 */
export function findSaidDate(passage: string): string | null {
  const text = fold(passage);
  for (const pattern of CANDIDATES) {
    for (const match of text.matchAll(pattern)) {
      const date = parseSaidDate(match[0]);
      if (date) return date;
    }
  }
  return null;
}

/** The first amount in euros written in a passage ("15 000 euros" → cents). */
export function findSaidEuros(passage: string): number | null {
  const match = /(\d[\d  .]*(?:,\d{1,2})?)\s*(?:€|euros?\b|eur\b)/i.exec(
    passage,
  );
  if (!match) return null;
  const cents = parseEurosToCents(match[1].replace(/\.(?=\d{3}\b)/g, ""));
  return typeof cents === "number" ? cents : null;
}
