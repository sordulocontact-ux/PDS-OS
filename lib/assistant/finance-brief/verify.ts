// « All figures must match exactly » (Midday's weekly summary,
// docs/ANALYSE-MIDDAY.md § 4.2): PO's wording of the week's summary is shown
// only when the code finds in it no figure, date or count that is not in the
// slots (lib/assistant/finance-brief/slots.ts). Otherwise the card keeps the
// code's sentence. Pure code.

import {
  BRIEF_SENTENCES,
  type BriefSlot,
} from "@/lib/assistant/finance-brief/slots";

export const BRIEF_MAX_LENGTH = 400;

// Spaces inside an amount (« 12 000 € ») are narrow or non-breaking.
const spaces = (text: string) => text.replace(/[\u00a0\u202f]/g, " ");
// A number as French writes it: « 12 000 », « 13 471,88 », « 05 ».
const NUMBER = /\d+(?: \d{3})*(?:,\d+)?/g;
// A count or a date written in words would escape the check above.
// Whole words, accents included (\b ignores « é »).
const word = (list: string, flags: string) =>
  new RegExp(`(?<!\\p{L})(${list})(?!\\p{L})`, `${flags}u`);
const NUMBER_WORDS = word(
  "deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|cents|mille|millions?|milliers?|dizaines?|centaines?|moitié|double|triple",
  "i",
);
const MONTHS = word(
  "janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre",
  "gi",
);
// The model never knows today's date (docs/ASSISTANT.md § 4).
const RELATIVE = word("après-demain|avant-hier|demain|hier", "i");
// Plain text only: no Markdown, no tag, no link.
const MARKUP = /[*_#`<>[\]{}|]|https?:|www\./i;

const numbersOf = (text: string) =>
  (spaces(text).match(NUMBER) ?? []).map((n) =>
    n.replace(/ /g, "").replace(/^0+(?=\d)/, ""),
  );

const sentencesOf = (text: string) =>
  text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

/** PO's summary, trimmed, when it says nothing the slots do not; else null.
 * A wording kept in the cache is checked again on every reading. */
export function checkedBrief(
  written: string,
  slots: BriefSlot[],
): string | null {
  // Bold is the card's job (the figures): a model's « **12 000 €** » is
  // read without its marks.
  const text = written.replace(/\*\*|__/g, "");
  const clean = spaces(text).replace(/\s+/g, " ").trim();
  if (clean.length < 20 || clean.length > BRIEF_MAX_LENGTH) return null;
  // « Mar. 02/03/2027 » is one date, not the end of a sentence.
  const figures = slots.flatMap((s) => s.figures.map(spaces));
  const plain = figures.reduce((x, f) => (f ? x.split(f).join("0") : x), clean);
  if (sentencesOf(plain).length > BRIEF_SENTENCES) return null;
  if (MARKUP.test(clean) || NUMBER_WORDS.test(clean) || RELATIVE.test(clean))
    return null;

  const source = slots
    .map((s) => [s.sentence, ...s.figures].join(" "))
    .join(" ");
  const allowed = new Set(numbersOf(source));
  if (numbersOf(clean).some((n) => !allowed.has(n))) return null;

  const months = new Set(
    (source.match(MONTHS) ?? []).map((m) => m.toLowerCase()),
  );
  if ((clean.match(MONTHS) ?? []).some((m) => !months.has(m.toLowerCase())))
    return null;
  // A week with figures is said with them.
  const hasFigures = slots.some((s) => s.figures.some((f) => /\d/.test(f)));
  if (hasFigures && numbersOf(clean).length === 0) return null;
  // The amounts keep their non-breaking spaces on screen.
  return text.replace(/[ \t\r\n]+/g, " ").trim();
}
