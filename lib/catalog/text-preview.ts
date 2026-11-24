// The start of a text or CSV file, for its preview (FilePreview): read in
// the browser from its signed URL, cut to a size a page shows at once, and a
// CSV split into rows and cells as a spreadsheet draws it.

// What is read of a file: a long export is cut, « Télécharger » has it whole.
export const PREVIEW_MAX_BYTES = 256 * 1024;
export const PREVIEW_MAX_ROWS = 200;
export const PREVIEW_MAX_COLUMNS = 40;

/** The first `maxBytes` of the file as text; `cut` when there was more. */
export async function readTextHead(
  url: string,
  signal: AbortSignal,
  maxBytes = PREVIEW_MAX_BYTES,
): Promise<{ text: string; cut: boolean }> {
  const response = await fetch(url, { signal });
  if (!response.ok || !response.body) throw new Error(`${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let read = 0;
  let cut = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const room = maxBytes - read;
    const chunk = value.byteLength > room ? value.subarray(0, room) : value;
    read += chunk.byteLength;
    text += decoder.decode(chunk, { stream: true });
    if (read >= maxBytes) {
      cut = true;
      await reader.cancel();
      break;
    }
  }
  return { text: text + decoder.decode(), cut };
}

// The separator of a French export is often « ; », sometimes a tab.
function delimiterOf(firstLine: string): string {
  const counts = [";", ",", "\t"].map((d) => [d, firstLine.split(d).length]);
  counts.sort((a, b) => Number(b[1]) - Number(a[1]));
  return String(counts[0][0]);
}

/**
 * The rows of a CSV (quoted cells, doubled quotes, line breaks in a quoted
 * cell), at most `maxRows`; `cut` when the file has more. A last line cut
 * in the middle by `readTextHead` is dropped.
 */
export function parseCsv(
  text: string,
  { maxRows = PREVIEW_MAX_ROWS, partial = false } = {},
): { rows: string[][]; cut: boolean } {
  const body = text.replace(/^﻿/, "");
  const delimiter = delimiterOf(body.split(/\r?\n/, 1)[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (quoted) {
      if (char === '"' && body[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === "") quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && body[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (rows.length > maxRows)
        return { rows: rows.slice(0, maxRows), cut: true };
    } else cell += char;
  }
  if (!partial && (cell !== "" || row.length > 0)) rows.push([...row, cell]);
  const cutRows = rows.length > maxRows;
  return {
    rows: rows.slice(0, maxRows),
    cut: cutRows || partial,
  };
}

/** « A », « B », … « Z », « AA »: a spreadsheet's column letters. */
export function columnLetter(index: number): string {
  let letter = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    letter = String.fromCharCode(65 + ((n - 1) % 26)) + letter;
  return letter;
}
