// What PO's synthesis for the engineer must keep (UX test of 09/10/2026: it
// dropped « 1 ou 2 dB » and wrote « sans préciser la valeur exacte », a
// remark of its own, in the text sent to the engineer). Checked by code, not
// trusted to the model: every measure said in a comment (a number, a range,
// a unit, a timecode) is in the synthesis, no measure appears that nobody
// said, and no line comments on the synthesis itself. Pure.

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s  ]+/g, " ")
    .toLowerCase();

// « 1 ou 2 db », « 3 khz », « 1:42 », « -6 », « 120 bpm », « 2,5 ».
const MEASURE =
  /\d+:\d{2}|\d+(?:[.,]\d+)?(?: ?(?:ou|a|à|-) ?\d+(?:[.,]\d+)?)?(?: ?(?:db|dbfs|lufs|khz|hz|%|ms|bpm|s|sec|secondes?)\b)?/g;

/** The measures written in a text, folded (« 1 ou 2 db », « 1:42 »). */
export function measuresOf(text: string): string[] {
  return [...fold(text).matchAll(MEASURE)].map((m) => m[0].trim());
}

// A remark about the synthesis, not a point for the engineer.
const META =
  /sans (?:le )?pr[ée]cis|non pr[ée]cis|valeur exacte|pas de valeur|^\s*-?\s*\(|^\s*-?\s*(?:note|remarque|nb)\b/i;

export type CheckedSummary = {
  summary: string;
  // Comments added back whole because their measures were missing.
  restored: number;
  // Lines left out: a remark, or a measure nobody said.
  removed: number;
};

export function checkSummary(
  summary: string,
  comments: string[],
): CheckedSummary {
  const said = new Set(comments.flatMap(measuresOf));
  let removed = 0;
  const lines = summary
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => {
      if (!line.trim()) return false;
      const keep =
        !META.test(line) && measuresOf(line).every((m) => said.has(m));
      if (!keep) removed += 1;
      return keep;
    });
  const kept = fold(lines.join("\n"));
  // A comment whose measure got lost is given as it was written.
  const restoredLines = comments.filter((comment) =>
    measuresOf(comment).some((m) => !kept.includes(m)),
  );
  return {
    summary: [
      ...lines,
      ...restoredLines.map((c) => `- ${c.replace(/\s+/g, " ").trim()}`),
    ].join("\n"),
    restored: restoredLines.length,
    removed,
  };
}
