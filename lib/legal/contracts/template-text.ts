// A template's text as the editor and the value finder read it: plain text
// cut by its {{id}} fields. An excerpt is matched as a whole word, outside
// the fields, exactly as it is written. Client-safe.

import { isContractField, type ContractFieldId } from "./fields";

export type BodySegment =
  { kind: "text"; text: string } | { kind: "field"; id: ContractFieldId };

const FIELD = /\{\{\s*([a-z0-9_.]+)\s*\}\}/g;

/** The text and its known fields, in order. An unknown {{id}} stays text:
 * saving the template refuses it and names it. */
export function bodySegments(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  let last = 0;
  for (const match of body.matchAll(FIELD)) {
    if (!isContractField(match[1])) continue;
    if (match.index > last)
      segments.push({ kind: "text", text: body.slice(last, match.index) });
    segments.push({ kind: "field", id: match[1] });
    last = match.index + match[0].length;
  }
  if (last < body.length)
    segments.push({ kind: "text", text: body.slice(last) });
  return segments;
}

const WORD = /[\p{L}\p{N}]/u;

/** Where `excerpt` starts in `text`, whole words only (« Paul » is not in
 * « Paulette »), without overlaps. */
export function excerptStarts(text: string, excerpt: string): number[] {
  const starts: number[] = [];
  if (!excerpt) return starts;
  const openWord = WORD.test(excerpt[0]);
  const closeWord = WORD.test(excerpt[excerpt.length - 1]);
  let from = 0;
  for (;;) {
    const at = text.indexOf(excerpt, from);
    if (at === -1) return starts;
    const before = text[at - 1];
    const after = text[at + excerpt.length];
    const whole =
      (!openWord || !before || !WORD.test(before)) &&
      (!closeWord || !after || !WORD.test(after));
    if (whole) {
      starts.push(at);
      from = at + excerpt.length;
    } else from = at + 1;
  }
}

/** How many times `excerpt` is in the text of a template, fields left out. */
export function countExcerpt(body: string, excerpt: string): number {
  return bodySegments(body).reduce(
    (sum, s) =>
      s.kind === "text" ? sum + excerptStarts(s.text, excerpt).length : sum,
    0,
  );
}
