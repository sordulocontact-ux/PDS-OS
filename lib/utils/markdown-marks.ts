// A model writes « **gras** » and « *italique* » in its texts (a task, a
// report, PO's answer): the app shows them so, in bold and italics, and
// takes the marks out wherever the text goes plain (a label read aloud, a
// field, an email). Retour du 08/11/2026. Client-safe.

/** A piece of a text, as shown: plain, bold, italic, or both. */
export type MarkedSegment = { text: string; bold?: boolean; italic?: boolean };

// « **mot** », then « *mot* » — not « 5 * 3 » nor « note* ».
const MARK =
  /\*\*(?=\S)([\s\S]*?\S)\*\*|(^|[^\p{L}\p{N}*])\*(?=\S)([^*\n]*?\S)\*(?![\p{L}\p{N}*])/gu;
const BULLET = /^([ \t]*)\*[ \t]+/gm;

/**
 * `text` cut into its plain, bold and italic pieces. A « * » list item
 * becomes a « - » one (none on a single line: a title); a stray « ** »
 * goes. Anything else is kept as written.
 */
export function markedSegments(text: string): MarkedSegment[] {
  if (!text.includes("*")) return text ? [{ text }] : [];
  const source = text.replace(BULLET, text.includes("\n") ? "$1- " : "$1");
  const segments: MarkedSegment[] = [];
  const plain = (piece: string) => {
    const kept = piece.replace(/\*\*/g, "");
    if (kept) segments.push({ text: kept });
  };
  let last = 0;
  for (const match of source.matchAll(MARK)) {
    const [whole, bold, before, italic] = match;
    if (bold !== undefined) {
      plain(source.slice(last, match.index));
      for (const inner of markedSegments(bold))
        segments.push({ ...inner, bold: true });
    } else {
      plain(source.slice(last, match.index) + before);
      segments.push({ text: italic, italic: true });
    }
    last = match.index + whole.length;
  }
  plain(source.slice(last));
  return segments;
}

/** `text` without its marks, for wherever it goes plain. */
export function withoutMarkdownMarks(text: string): string {
  if (!text.includes("*")) return text;
  return markedSegments(text)
    .map((segment) => segment.text)
    .join("");
}
