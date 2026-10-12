// What to arbitrate in the narrative before it is summed up (MKT-S1-06,
// docs/ARCHITECTURE.md § 6 bis, « Synthèse du récit »): the same passage
// told in two parts (found by the code), and two parts that say opposite
// things (pointed by PO, kept only when both quotes are found verbatim in
// their part). Pure, client-safe.

import { locateQuote } from "@/lib/ai/provenance";
import { NARRATIVE_PARTS, type NarrativePart } from "@/lib/framing/brief";

export type NarrativeText = { key: NarrativePart; text: string };

export type NarrativeArbitration =
  | {
      kind: "repetition";
      first: NarrativePart;
      second: NarrativePart;
      passage: string;
    }
  | {
      kind: "contradiction";
      first: NarrativePart;
      second: NarrativePart;
      firstQuote: string;
      secondQuote: string;
      why: string;
    };

// Five words in a row said again elsewhere is a repetition, not a chance.
const SHINGLE = 5;

const words = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];

/** Every pair of parts sharing a run of five words, said once per pair. */
export function narrativeRepetitions(
  parts: NarrativeText[],
): NarrativeArbitration[] {
  const filled = parts.filter((p) => p.text.trim() !== "");
  const result: NarrativeArbitration[] = [];
  for (let i = 0; i < filled.length; i++) {
    const a = words(filled[i].text);
    const runs = new Set<string>();
    for (let k = 0; k + SHINGLE <= a.length; k++)
      runs.add(a.slice(k, k + SHINGLE).join(" "));
    for (let j = i + 1; j < filled.length; j++) {
      const b = words(filled[j].text);
      for (let k = 0; k + SHINGLE <= b.length; k++) {
        const run = b.slice(k, k + SHINGLE).join(" ");
        if (runs.has(run)) {
          result.push({
            kind: "repetition",
            first: filled[i].key,
            second: filled[j].key,
            passage: run,
          });
          break;
        }
      }
    }
  }
  return result;
}

export type RawContradiction = {
  first: string;
  second: string;
  firstQuote: string;
  secondQuote: string;
  why: string;
};

const isPart = (value: string): value is NarrativePart =>
  (NARRATIVE_PARTS as readonly string[]).includes(value);

/**
 * Keeps a contradiction pointed by PO only when it names two different
 * parts and each quote is found verbatim in its part: the reason is PO's
 * words, the decision stays the person's.
 */
export function verifyContradictions(
  raw: RawContradiction[],
  parts: NarrativeText[],
): NarrativeArbitration[] {
  const textOf = new Map(parts.map((p) => [p.key, p.text]));
  const found = (quote: string, text: string | undefined) =>
    !!text &&
    quote.trim().split(/\s+/).length >= 2 &&
    locateQuote(quote, { text, segments: [] }).status !== "missing";
  return raw.flatMap((c): NarrativeArbitration[] => {
    const first = c.first.trim();
    const second = c.second.trim();
    if (!isPart(first) || !isPart(second) || first === second) return [];
    if (!found(c.firstQuote, textOf.get(first))) return [];
    if (!found(c.secondQuote, textOf.get(second))) return [];
    return [
      {
        kind: "contradiction",
        first,
        second,
        firstQuote: c.firstQuote.trim(),
        secondQuote: c.secondQuote.trim(),
        why: c.why.trim(),
      },
    ];
  });
}

/** How the synthesis is written, chosen by the person (MKT-S1-06). */
export const SUMMARY_TONES = ["sober", "warm", "punchy"] as const;
export type SummaryTone = (typeof SUMMARY_TONES)[number];
export const SUMMARY_LENGTHS = ["short", "developed"] as const;
export type SummaryLength = (typeof SUMMARY_LENGTHS)[number];
