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

/** Where an excerpt is, when its text alone is not enough (« ____ » after
 * « née le » is a date of birth, after « Fait à Paris, le » the contract's
 * date): what is written just before it, as a pattern (RegExp source,
 * case-insensitive) matched at the end of the text before it in its
 * paragraph, values written {{id}}. */
export type ExcerptAt = { excerpt: string; context?: string };

export const contextMatches = (before: string, context?: string) =>
  !context || new RegExp(`(?:${context})$`, "iu").test(before);

/** Where `excerpt` starts in `text`, whole words only (« Paul » is not in
 * « Paulette »), without overlaps; with `context`, only where the text
 * before it (`lead` then `text`) ends as it says. */
export function excerptStarts(
  text: string,
  excerpt: string,
  context?: string,
  lead = "",
): number[] {
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
      (!closeWord || !after || !WORD.test(after)) &&
      contextMatches(
        (lead + text.slice(0, at)).split("\n\n").at(-1) ?? "",
        context,
      );
    if (whole) {
      starts.push(at);
      from = at + excerpt.length;
    } else from = at + 1;
  }
}

/** Where `excerpt` is in the text of a template, fields left out. */
export function excerptPositions(
  body: string,
  excerpt: string,
  context?: string,
): number[] {
  const positions: number[] = [];
  let offset = 0;
  for (const s of bodySegments(body)) {
    const length = s.kind === "text" ? s.text.length : `{{${s.id}}}`.length;
    if (s.kind === "text")
      for (const at of excerptStarts(
        s.text,
        excerpt,
        context,
        body.slice(Math.max(0, offset - 400), offset),
      ))
        positions.push(offset + at);
    offset += length;
  }
  return positions;
}

/** How many times `excerpt` is in the text of a template, fields left out. */
export const countExcerpt = (body: string, excerpt: string, context?: string) =>
  excerptPositions(body, excerpt, context).length;
